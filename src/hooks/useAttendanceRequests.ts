import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { useChat } from '../context/ChatContext'
import {
  fetchAttendanceRequests,
  fetchPendingAttendanceCount,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  type AttendanceRequestItem,
  type ApiError,
} from '../lib/attendance-request-api'
import { normalizeRole, type SafeUser } from '../lib/auth-api'

interface UseAttendanceRequestsOptions {
  currentUser?: SafeUser | null
  autoFetch?: boolean
}

export function useAttendanceRequests({
  currentUser,
  autoFetch = true,
}: UseAttendanceRequestsOptions = {}) {
  const { socket, connectionStatus } = useChat()
  const [requests, setRequests] = useState<AttendanceRequestItem[]>([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [submittingIds, setSubmittingIds] = useState<Set<number>>(new Set())
  const [newArrivalIds, setNewArrivalIds] = useState<Set<number>>(new Set())

  const role = normalizeRole(currentUser?.role)
  const isApprover = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)
  const isEmployee = role === 'EMPLOYEE'

  // Ref to access current user without re-triggering effects
  const userRef = useRef(currentUser)
  userRef.current = currentUser

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [listResult, countResult] = await Promise.all([
        fetchAttendanceRequests().catch(() => ({ items: [] })),
        fetchPendingAttendanceCount().catch(() => 0),
      ])

      setRequests(listResult.items)
      setPendingCount(countResult)
    } catch (err) {
      console.warn('Failed to fetch attendance requests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      void refresh()
    }
  }, [autoFetch, refresh])

  // Listen to socket events and handle reconnects
  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      // Auto refetch on reconnect
      void refresh()
    }

    const handleRequestCreated = (payload: {
      request: AttendanceRequestItem
      employeeName: string
    }) => {
      const newReq = payload.request
      if (!newReq) return

      // Approvers receive live notification and item at top of pending list
      if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(normalizeRole(userRef.current?.role))) {
        setRequests((prev) => {
          if (prev.some((r) => r.id === newReq.id)) return prev
          return [newReq, ...prev]
        })
        setPendingCount((prev) => prev + 1)

        // Highlight new item
        setNewArrivalIds((prev) => new Set(prev).add(newReq.id))
        setTimeout(() => {
          setNewArrivalIds((prev) => {
            const next = new Set(prev)
            next.delete(newReq.id)
            return next
          })
        }, 4500)

        toast(
          `New Attendance Request: ${payload.employeeName || 'Employee'} (${newReq.type || 'Missed Punch'})`,
          {
            icon: '⏰',
            duration: 4500,
            style: {
              background: '#193c33',
              color: '#d9ed74',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
            },
          }
        )
      }
    }

    const handleRequestDecided = (payload: {
      requestId: number
      status: 'APPROVED' | 'REJECTED'
      decidedByName: string
      decidedByRole: string
      decidedAt: string
      rejectReason?: string | null
      request?: AttendanceRequestItem
    }) => {
      const { requestId, status, decidedByName, decidedByRole, decidedAt, rejectReason } = payload

      setRequests((prev) => {
        let wasPending = false
        const updated = prev.map((item) => {
          if (item.id === requestId) {
            if (item.status === 'PENDING') wasPending = true
            return {
              ...item,
              status,
              decidedByName,
              decidedByRole,
              decidedAt,
              rejectReason: rejectReason ?? item.rejectReason,
            }
          }
          return item
        })

        if (wasPending) {
          setPendingCount((cnt) => Math.max(0, cnt - 1))
        }

        return updated
      })

      // If current user is employee whose request was decided, show live feedback toast
      const user = userRef.current
      const currentRole = normalizeRole(user?.role)
      if (user && currentRole === 'EMPLOYEE') {
        const isMine = requests.some((r) => r.id === requestId && (r.userId === user.id || r.employeeId === user.id))
        if (isMine) {
          if (status === 'APPROVED') {
            toast.success(
              `Your attendance request was approved by ${decidedByName} (${decidedByRole})!`,
              { duration: 5500 }
            )
          } else {
            const reasonSuffix = rejectReason ? `: "${rejectReason}"` : ''
            toast.error(
              `Your attendance request was rejected by ${decidedByName} (${decidedByRole})${reasonSuffix}`,
              { duration: 5500 }
            )
          }
        }
      }
    }

    socket.on('connect', handleConnect)
    socket.on('attendance_request:created', handleRequestCreated)
    socket.on('attendance_request:decided', handleRequestDecided)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('attendance_request:created', handleRequestCreated)
      socket.off('attendance_request:decided', handleRequestDecided)
    }
  }, [socket, refresh, requests])

  // Approve action with graceful 409 handling
  const handleApprove = useCallback(
    async (id: number): Promise<boolean> => {
      if (submittingIds.has(id)) return false

      setSubmittingIds((prev) => new Set(prev).add(id))
      try {
        const updated = await approveAttendanceRequest(id)
        setRequests((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updated, status: 'APPROVED' } : item))
        )
        setPendingCount((prev) => Math.max(0, prev - 1))
        toast.success(`Request approved successfully by you`)
        return true
      } catch (err) {
        const apiErr = err as ApiError
        if (apiErr.isConflict || apiErr.status === 409) {
          toast.error(apiErr.message || 'Already handled by another approver', {
            icon: '⚠️',
            duration: 4000,
          })
          void refresh()
        } else {
          toast.error(apiErr.message || 'Failed to approve attendance request')
        }
        return false
      } finally {
        setSubmittingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [submittingIds, refresh]
  )

  // Reject action with graceful 409 handling
  const handleReject = useCallback(
    async (id: number, reason?: string | null): Promise<boolean> => {
      if (submittingIds.has(id)) return false

      setSubmittingIds((prev) => new Set(prev).add(id))
      try {
        const updated = await rejectAttendanceRequest(id, reason)
        setRequests((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updated, status: 'REJECTED' } : item))
        )
        setPendingCount((prev) => Math.max(0, prev - 1))
        toast.success(`Request rejected`)
        return true
      } catch (err) {
        const apiErr = err as ApiError
        if (apiErr.isConflict || apiErr.status === 409) {
          toast.error(apiErr.message || 'Already handled by another approver', {
            icon: '⚠️',
            duration: 4000,
          })
          void refresh()
        } else {
          toast.error(apiErr.message || 'Failed to reject attendance request')
        }
        return false
      } finally {
        setSubmittingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [submittingIds, refresh]
  )

  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const handledRequests = requests.filter((r) => r.status !== 'PENDING')

  return {
    requests,
    pendingRequests,
    handledRequests,
    pendingCount,
    loading,
    submittingIds,
    newArrivalIds,
    refresh,
    handleApprove,
    handleReject,
    isApprover,
    isEmployee,
    connectionStatus,
  }
}
