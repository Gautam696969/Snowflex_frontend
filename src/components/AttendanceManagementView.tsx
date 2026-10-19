import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Clock, Calendar, XCircle, Plus,
  RefreshCw, Search, UserCheck, Check, X
} from 'lucide-react'
import UserAvatar from './UserAvatar'
import RequestAttendanceModal from './RequestAttendanceModal'
import { useAttendanceRequests } from '../hooks/useAttendanceRequests'
import { type SafeUser, readToken } from '../lib/auth-api'
import { apiBase } from '../lib/api-config'

interface AttendanceManagementViewProps {
  currentUser?: SafeUser | null
  onCheckIn?: () => Promise<void>
  onCheckOut?: () => Promise<void>
}

interface AttendanceLogRecord {
  id: number
  employeeId: number
  fullName?: string
  email?: string
  avatarUrl?: string | null
  attendanceDate: string
  checkIn: string | null
  checkOut: string | null
  status: string
  workingHours: number | null
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AttendanceManagementView({
  currentUser,
  onCheckIn,
  onCheckOut,
}: AttendanceManagementViewProps) {
  const role = (currentUser?.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  const isApprover = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)
  const isEmployee = role === 'EMPLOYEE' || role === 'USER'

  const [activeTab, setActiveTab] = useState<'requests' | 'logs'>('requests')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false)

  // Attendance history logs
  const [logs, setLogs] = useState<AttendanceLogRecord[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [submittingReject, setSubmittingReject] = useState<boolean>(false)

  // Hook for live real-time attendance requests
  const {
    requests,
    pendingCount,
    loading: loadingRequests,
    submittingIds,
    newArrivalIds,
    refresh,
    handleApprove,
    handleReject,
  } = useAttendanceRequests({ currentUser })

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const token = readToken()
      if (!token) return
      const endpoint = isEmployee ? '/attendance/me' : '/attendance'
      const res = await fetch(`${apiBase}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (body.success && Array.isArray(body.data)) {
        setLogs(body.data)
      }
    } catch (err) {
      console.warn('Failed to fetch attendance logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }, [isEmployee])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const emp = (item.employeeName || '').toLowerCase()
        const reason = (item.reason || '').toLowerCase()
        const date = (item.date || '').toLowerCase()
        const type = (item.type || '').toLowerCase()
        return emp.includes(q) || reason.includes(q) || date.includes(q) || type.includes(q)
      }
      return true
    })
  }, [requests, statusFilter, searchQuery])

  const handleOpenRejectModal = (id: number) => {
    setRejectingId(id)
    setRejectReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectingId) return
    setSubmittingReject(true)
    try {
      const ok = await handleReject(rejectingId, rejectReason.trim() || null)
      if (ok) {
        setRejectingId(null)
        setRejectReason('')
      }
    } finally {
      setSubmittingReject(false)
    }
  }

  return (
    <div className="attendance-management-view flex flex-col gap-[20px]">
      {/* Top Banner / Actions Bar */}
      <div className="flex items-center justify-between gap-[16px] flex-wrap p-[18px_22px] rounded-[14px] bg-white dark:bg-[#1a241f] border border-[#e2e8df] dark:border-[#28382d] shadow-[0_3px_12px_-2px_rgba(25,60,51,0.03)]">
        <div>
          <div className="flex items-center gap-[8px]">
            <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154] dark:text-[#a0c49d]">
              TIME & ATTENDANCE
            </span>
            {isApprover && pendingCount > 0 && (
              <span className="px-[8px] py-[1px] rounded-full text-[10.5px] font-black bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]/40 animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <h2 className="my-[4px_0] text-[#193c33] dark:text-[#edf5ef] font-sans text-[20px] font-bold">
            {isEmployee ? 'My Attendance & Requests' : 'Attendance Operations & Review'}
          </h2>
          <p className="m-0 text-[#718478] dark:text-[#8e9f94] text-[12px]">
            {isEmployee
              ? 'Log daily check-ins, submit punch adjustments, and monitor approval states in real time.'
              : 'Approve and reject attendance petitions live. Real-time multi-reviewer race condition safety.'}
          </p>
        </div>

        <div className="flex items-center gap-[10px] flex-wrap">
          {/* Daily punch buttons for employees */}
          {isEmployee && (
            <>
              {onCheckIn && (
                <button
                  type="button"
                  className="px-[14px] py-[8px] rounded-[7px] text-[12px] font-bold border border-[#dce3d8] bg-white text-[#224434] hover:bg-[#f0f5e9] transition-colors cursor-pointer"
                  onClick={onCheckIn}
                >
                  Check In
                </button>
              )}
              {onCheckOut && (
                <button
                  type="button"
                  className="px-[14px] py-[8px] rounded-[7px] text-[12px] font-bold border-0 bg-[#28483b] text-white hover:bg-[#193c33] transition-colors cursor-pointer"
                  onClick={onCheckOut}
                >
                  Check Out
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-[7px] text-[12px] font-bold border-0 bg-[#193c33] hover:bg-[#255648] text-[#d9ed74] shadow-[0_2px_8px_rgba(25,60,51,0.2)] transition-all cursor-pointer"
                onClick={() => setShowRequestModal(true)}
              >
                <Plus size={16} />
                <span>Request Attendance</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="icon-button grid w-[34px] h-[34px] place-items-center border border-[#e1e8df] dark:border-[#2c3d31] rounded-[7px] text-[#546a5d] dark:text-[#a0b3a6] bg-white dark:bg-[#1f2d25] hover:bg-[#f3f6ef] dark:hover:bg-[#28382e] transition-colors cursor-pointer"
            onClick={() => {
              void refresh()
              void fetchLogs()
            }}
            title="Refresh records"
          >
            <RefreshCw size={15} className={loadingRequests || loadingLogs ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Requests vs Daily Logs) */}
      <div className="flex items-center justify-between gap-[16px] flex-wrap border-b border-[#e5ebe2] dark:border-[#27382d] pb-[10px]">
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            className={`flex items-center gap-[7px] px-[16px] py-[8px] rounded-[8px] text-[13px] font-bold border-0 cursor-pointer transition-all ${
              activeTab === 'requests'
                ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                : 'bg-transparent text-[#64776c] dark:text-[#8e9f94] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            <Clock size={16} />
            <span>Attendance Requests</span>
            {pendingCount > 0 && (
              <span className="px-[6px] py-[1px] rounded-full text-[10.5px] font-black bg-[#fee2e2] text-[#dc2626]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`flex items-center gap-[7px] px-[16px] py-[8px] rounded-[8px] text-[13px] font-bold border-0 cursor-pointer transition-all ${
              activeTab === 'logs'
                ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                : 'bg-transparent text-[#64776c] dark:text-[#8e9f94] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <Calendar size={16} />
            <span>Daily Attendance Logs</span>
            <span className="px-[6px] py-[1px] rounded-full text-[10.5px] font-extrabold bg-[#e5ebe1] dark:bg-[#25362b] text-[#4d5e53] dark:text-[#a1b4a7]">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Filters if on requests tab */}
        {activeTab === 'requests' && (
          <div className="flex items-center gap-[10px] flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-[10px] top-[9px] text-[#86998e]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-[30px] pr-[12px] py-[6px] rounded-[7px] text-[12px] border border-[#dce3d8] dark:border-[#2b3c31] bg-white dark:bg-[#16201a] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#193c33]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold border border-[#dce3d8] dark:border-[#2b3c31] bg-white dark:bg-[#16201a] text-[#193c33] dark:text-[#edf5ef] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending ({pendingCount})</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab: Attendance Requests */}
      {activeTab === 'requests' ? (
        filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white dark:bg-[#1a241f] rounded-[14px] border border-dashed border-[#dce2d7] dark:border-[#2b3c31]">
            <div className="w-[52px] h-[52px] rounded-full bg-[#f2f7ec] dark:bg-[#202d26] text-[#193c33] dark:text-[#d9ed74] flex items-center justify-center mb-[12px]">
              <Clock size={26} />
            </div>
            <strong className="block text-[16px] font-bold text-[#193c33] dark:text-[#edf5ef]">
              No attendance requests found
            </strong>
            <p className="m-0 text-[12px] text-[#718478] dark:text-[#8e9f94] mt-[4px] max-w-[340px]">
              {isEmployee
                ? 'You have not submitted any attendance adjustment requests yet. Click "Request Attendance" above to submit one.'
                : 'There are no attendance requests matching the current filters.'}
            </p>
            {isEmployee && (
              <button
                type="button"
                className="inline-flex items-center gap-[6px] mt-[16px] px-[16px] py-[8px] rounded-[7px] text-[12px] font-bold border-0 bg-[#193c33] text-[#d9ed74] hover:bg-[#265648] cursor-pointer"
                onClick={() => setShowRequestModal(true)}
              >
                <Plus size={15} />
                <span>Submit First Request</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[12px]">
            {filteredRequests.map((item) => {
              const isPending = item.status === 'PENDING'
              const isApproved = item.status === 'APPROVED'
              const isRejected = item.status === 'REJECTED'
              const isNew = newArrivalIds.has(item.id)
              const isInFlight = submittingIds.has(item.id)

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-[12px] p-[16px_20px] rounded-[12px] border transition-all duration-300 ${
                    isNew
                      ? 'border-l-[4px] border-l-[#d9ed74] bg-[#f9fdf6] dark:bg-[#1f2b23] shadow-md animate-pulse'
                      : 'border-[#e2e8df] dark:border-[#28392e] bg-white dark:bg-[#18231d] hover:border-[#cbdbca] dark:hover:border-[#384e3f]'
                  }`}
                >
                  {/* Header Row: Employee Info, Badges */}
                  <div className="flex items-center justify-between gap-[12px] flex-wrap">
                    <div className="flex items-center gap-[12px] min-w-0">
                      <UserAvatar
                        name={item.employeeName || 'Employee'}
                        avatarUrl={item.employeeAvatarUrl}
                        size={36}
                        className="rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-[14px] font-bold text-[#193c33] dark:text-[#edf5ef] truncate">
                          {item.employeeName || 'Employee'}
                        </strong>
                        <span className="block text-[11.5px] text-[#718478] dark:text-[#8d9e92] truncate">
                          {item.departmentName || 'General'} • {item.employeeCode || 'EMP'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-[8px] shrink-0">
                      {/* Request Type Badge */}
                      <span className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-[6px] text-[11px] font-bold bg-[#edf4ea] dark:bg-[#202e26] text-[#224838] dark:text-[#d9ed74] border border-[#d6e3d2] dark:border-[#2c4033]">
                        {formatTypeLabel(item.type)}
                      </span>

                      {/* Status Badge: Yellow Pending, Green Approved, Red Rejected */}
                      <span
                        className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-extrabold ${
                          isPending
                            ? 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-[#34220b] dark:text-[#fde68a] dark:border-[#523712]'
                            : isApproved
                              ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] dark:bg-[#132a20] dark:text-[#34d399] dark:border-[#1e4835]'
                              : 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] dark:bg-[#2b1414] dark:text-[#f87171] dark:border-[#4d1f1f]'
                        }`}
                      >
                        {isPending && <Clock size={12} />}
                        {isApproved && <Check size={12} />}
                        {isRejected && <X size={12} />}
                        <span>{item.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Box: Target Date, Times, Reason */}
                  <div className="p-[12px_14px] rounded-[9px] bg-[#f9fbf9] dark:bg-[#131b16] border border-[#edf2ea] dark:border-[#223027] text-[12.5px] flex flex-col gap-[6px]">
                    <div className="flex items-center gap-[18px] flex-wrap text-[#264438] dark:text-[#d8e6dc] font-semibold text-[12px]">
                      <div className="flex items-center gap-[5px]">
                        <Calendar size={14} className="text-[#517154] dark:text-[#d9ed74]" />
                        <span>Date Requested: {formatDate(item.date)}</span>
                      </div>
                      {(item.checkInTime || item.checkOutTime) && (
                        <div className="flex items-center gap-[5px]">
                          <Clock size={14} className="text-[#517154] dark:text-[#d9ed74]" />
                          <span>
                            Hours: {item.checkInTime || '--:--'} → {item.checkOutTime || '--:--'}
                          </span>
                        </div>
                      )}
                      <span className="text-[#83978b] text-[11.5px] ml-auto">
                        Submitted {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="m-0 text-[#4c5f53] dark:text-[#9fb2a5] text-[12px] italic mt-[2px]">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  </div>

                  {/* Decision info or Approver buttons */}
                  <div className="flex items-center justify-between gap-[12px] flex-wrap pt-[4px]">
                    {!isPending ? (
                      <div className="flex items-center gap-[8px] text-[12px] text-[#63776b] dark:text-[#8e9f94]">
                        <UserCheck size={15} className="text-[#517154] dark:text-[#d9ed74]" />
                        <span>
                          {isApproved ? 'Approved' : 'Rejected'} by{' '}
                          <strong className="text-[#193c33] dark:text-[#edf5ef]">
                            {item.decidedByName || 'Reviewer'}
                          </strong>{' '}
                          ({item.decidedByRole || 'ADMIN'}) • {formatDate(item.decidedAt || item.updatedAt)}
                        </span>
                        {item.rejectReason && (
                          <span className="text-[#dc2626] font-semibold">
                            (Note: {item.rejectReason})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#718478] dark:text-[#8e9f94]">
                        Awaiting decision by Administrator / HR
                      </div>
                    )}

                    {/* Approver Action Buttons (Visible only to Admin/HR/Super Admin on pending requests) */}
                    {isApprover && isPending && (
                      <div className="flex items-center gap-[8px] ml-auto">
                        <button
                          type="button"
                          className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] text-[12px] font-bold border border-[#fee2e2] dark:border-[#4c1d1d] bg-[#fef2f2] dark:bg-[#2c1515] text-[#dc2626] dark:text-[#f87171] hover:bg-[#fee2e2] transition-colors cursor-pointer disabled:opacity-40"
                          onClick={() => handleOpenRejectModal(item.id)}
                          disabled={isInFlight}
                          title="Reject attendance request"
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-[6px] px-[16px] py-[6px] rounded-[6px] text-[12px] font-bold border-0 bg-[#193c33] hover:bg-[#265648] text-[#d9ed74] shadow-[0_2px_6px_rgba(25,60,51,0.15)] transition-all cursor-pointer disabled:opacity-40"
                          onClick={() => void handleApprove(item.id)}
                          disabled={isInFlight}
                          title="Approve request and update attendance record"
                        >
                          {isInFlight ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#d9ed74] rounded-full animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Approve</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Tab: Daily Attendance Logs */
        logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[60px_20px] text-center bg-white dark:bg-[#1a241f] rounded-[14px] border border-dashed border-[#dce2d7] dark:border-[#2b3c31]">
            <Calendar size={26} className="text-[#8c9e93] mb-[10px]" />
            <strong className="block text-[15px] font-bold text-[#193c33] dark:text-[#edf5ef]">
              No attendance records logged
            </strong>
            <p className="m-0 text-[12px] text-[#718478] dark:text-[#8e9f94] mt-[4px]">
              Daily check-ins and approved attendance requests will record entries here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-[#e2e8df] dark:border-[#27382d] bg-white dark:bg-[#18231d]">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead>
                <tr className="border-b border-[#e7ede4] dark:border-[#26372c] bg-[#f8faf7] dark:bg-[#141d18] text-[#55695d] dark:text-[#8e9f94] uppercase tracking-wider text-[11px] font-extrabold">
                  {!isEmployee && <th className="p-[12px_16px]">Employee</th>}
                  <th className="p-[12px_16px]">Date</th>
                  <th className="p-[12px_16px]">Check-In</th>
                  <th className="p-[12px_16px]">Check-Out</th>
                  <th className="p-[12px_16px]">Working Hours</th>
                  <th className="p-[12px_16px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#edf2ea] dark:border-[#223027] hover:bg-[#fbfcfb] dark:hover:bg-[#1b2721] transition-colors"
                  >
                    {!isEmployee && (
                      <td className="p-[12px_16px]">
                        <div className="flex items-center gap-[8px]">
                          <UserAvatar
                            name={row.fullName || 'Employee'}
                            avatarUrl={row.avatarUrl}
                            size={26}
                            className="rounded-full shrink-0"
                          />
                          <span className="font-bold text-[#193c33] dark:text-[#edf5ef]">
                            {row.fullName || 'Employee'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="p-[12px_16px] font-semibold text-[#243e32] dark:text-[#d8e6dc]">
                      {formatDate(row.attendanceDate)}
                    </td>
                    <td className="p-[12px_16px] text-[#4d6054] dark:text-[#9db0a3]">
                      {formatTime(row.checkIn)}
                    </td>
                    <td className="p-[12px_16px] text-[#4d6054] dark:text-[#9db0a3]">
                      {formatTime(row.checkOut)}
                    </td>
                    <td className="p-[12px_16px] font-mono text-[#193c33] dark:text-[#edf5ef]">
                      {row.workingHours ? `${row.workingHours} hrs` : '—'}
                    </td>
                    <td className="p-[12px_16px]">
                      <span
                        className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-extrabold ${
                          row.status === 'PRESENT'
                            ? 'bg-[#ecfdf5] text-[#059669] dark:bg-[#12281e] dark:text-[#34d399]'
                            : row.status === 'LATE'
                              ? 'bg-[#fef3c7] text-[#d97706] dark:bg-[#34220b] dark:text-[#fbbf24]'
                              : 'bg-[#fef2f2] text-[#dc2626] dark:bg-[#2b1414] dark:text-[#f87171]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Request Modal Dialog */}
      <RequestAttendanceModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => {
          void refresh()
          void fetchLogs()
        }}
      />

      {/* Reject Confirmation Modal Dialog */}
      {rejectingId !== null && (
        <div
          className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-[16px] z-[10000]"
          onClick={() => setRejectingId(null)}
        >
          <div
            className="modal p-[22px] bg-white dark:bg-[#19231e] rounded-[14px] border border-[#dce2d7] dark:border-[#27372e] shadow-2xl max-w-[440px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-[14px]">
              <div className="flex items-center gap-[10px]">
                <div className="w-[36px] h-[36px] rounded-full bg-[#fef2f2] dark:bg-[#311616] flex items-center justify-center text-[#dc2626]">
                  <XCircle size={20} />
                </div>
                <h3 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#edf5ef]">
                  Reject Attendance Request
                </h3>
              </div>
              <button
                type="button"
                className="bg-transparent border-0 text-[#7c8e83] hover:text-[#193c33] cursor-pointer"
                onClick={() => setRejectingId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12px] text-[#697d71] dark:text-[#90a297] mb-[12px]">
              Provide an optional reason explaining why this attendance adjustment cannot be accepted.
            </p>

            <textarea
              rows={3}
              className="w-full px-[12px] py-[8px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2d3e33] bg-white dark:bg-[#141c18] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#dc2626] mb-[16px] resize-none"
              placeholder="e.g. Unverified absence, incorrect check-in timestamp..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000}
            />

            <div className="flex items-center justify-end gap-[10px]">
              <button
                type="button"
                className="px-[14px] py-[8px] rounded-[7px] text-[12px] font-semibold border border-[#dce3d8] bg-white text-[#4d6356] hover:bg-[#f2f6ee] cursor-pointer"
                onClick={() => setRejectingId(null)}
                disabled={submittingReject}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-[7px] text-[12px] font-bold border-0 bg-[#dc2626] text-white hover:bg-[#b91c1c] cursor-pointer disabled:opacity-50"
                onClick={() => void handleConfirmReject()}
                disabled={submittingReject}
              >
                {submittingReject ? (
                  <span>Rejecting...</span>
                ) : (
                  <>
                    <X size={14} />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
