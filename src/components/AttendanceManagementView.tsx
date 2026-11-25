import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Clock, Calendar, XCircle, Plus,
  RefreshCw, Search, UserCheck, Check, X,
  Camera, CheckCircle2, Image as ImageIcon,
  ZoomIn, ZoomOut, RotateCcw, Download,
  ShieldCheck, AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import UserAvatar from './UserAvatar'
import RequestAttendanceModal from './RequestAttendanceModal'
import CameraCaptureModal from './CameraCaptureModal'
import { useAttendanceRequests } from '../hooks/useAttendanceRequests'
import { type SafeUser, readToken, normalizeRole } from '../lib/auth-api'
import { apiBase } from '../lib/api-config'

export function resolveAttendancePhotoUrl(
  photoUrl: string | null | undefined,
  recordId: number,
  type: 'checkin' | 'checkout'
): string {
  if (!photoUrl) {
    return `${apiBase}/attendance/${recordId}/photo/${type}`
  }
  if (photoUrl.startsWith('data:image/')) {
    return photoUrl
  }
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl
  }
  // Relative path (e.g. /uploads/attendance/... or uploads/attendance/...)
  const serverOrigin = apiBase.replace(/\/api\/?$/, '')
  return `${serverOrigin}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`
}

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
  checkInPhoto?: string | null
  checkOutPhoto?: string | null
}

interface TodayAttendanceStatus {
  checkedIn: boolean
  checkedOut: boolean
  record: AttendanceLogRecord | null
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

interface LightboxPhotoState {
  url: string
  fallbackUrl?: string
  title: string
  employeeName: string
  type: 'Check-In' | 'Check-Out'
  time?: string
  date?: string
  status?: string
}

export default function AttendanceManagementView({
  currentUser,
}: AttendanceManagementViewProps) {
  const role = normalizeRole(currentUser?.role)
  const isApprover = ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)
  const isEmployee = role === 'EMPLOYEE'

  const [activeTab, setActiveTab] = useState<'requests' | 'logs'>('requests')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false)

  // Camera modal state
  const [cameraModalMode, setCameraModalMode] = useState<'check-in' | 'check-out' | null>(null)

  // Photo lightbox preview with zoom, download & fallback
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhotoState | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState<number>(1)
  const [lightboxLoading, setLightboxLoading] = useState<boolean>(true)
  const [lightboxError, setLightboxError] = useState<boolean>(false)

  const handleDownloadPhoto = async () => {
    if (!lightboxPhoto) return
    try {
      const response = await fetch(lightboxPhoto.url)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const safeName = (lightboxPhoto.employeeName || 'employee').replace(/\s+/g, '_').toLowerCase()
      const safeType = lightboxPhoto.type.replace(/\s+/g, '_').toLowerCase()
      link.href = objectUrl
      link.download = `${safeName}_${safeType}_attendance.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
      toast.success('Attendance photo downloaded')
    } catch {
      const link = document.createElement('a')
      link.href = lightboxPhoto.url
      link.download = 'attendance_photo.jpg'
      link.target = '_blank'
      link.click()
    }
  }

  // Today shift punch status for employee
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null)
  const [loadingToday, setLoadingToday] = useState<boolean>(false)

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

  const fetchTodayStatus = useCallback(async () => {
    if (!isEmployee) return
    setLoadingToday(true)
    try {
      const token = readToken()
      if (!token) return
      const res = await fetch(`${apiBase}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (body.success && body.data) {
        setTodayStatus(body.data)
      }
    } catch (err) {
      console.warn('Failed to fetch today attendance status:', err)
    } finally {
      setLoadingToday(false)
    }
  }, [isEmployee])

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
    void fetchTodayStatus()
  }, [fetchLogs, fetchTodayStatus])

  // Camera Check-In / Check-Out confirmation
  const handleCameraAttendanceSubmit = async (photoBase64: string) => {
    if (!cameraModalMode) return
    const token = readToken()
    if (!token) return

    const endpoint = cameraModalMode === 'check-in' ? '/attendance/check-in' : '/attendance/check-out'
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ photo: photoBase64 }),
    })
    const body = await res.json()
    if (!res.ok || !body.success) {
      const errMsg = body.message || `Failed to ${cameraModalMode}`
      toast.error(errMsg)
      throw new Error(errMsg)
    }

    toast.success(
      cameraModalMode === 'check-in'
        ? 'Checked in successfully! Real-time notification sent to Admins.'
        : 'Checked out successfully! Shift logged and reported to Admins.'
    )
    setCameraModalMode(null)
    await fetchTodayStatus()
    await fetchLogs()
  }

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
      {/* Employee Morning Shift & Check-In Action Card (prominent for employees) */}
      {isEmployee && (
        <div className="p-[20px_24px] rounded-[16px] bg-[linear-gradient(135deg,#f8fcf7_0%,#edf5e8_100%)] dark:bg-[linear-gradient(135deg,#16231c_0%,#1a2a22_100%)] border border-[#d5e5d3] dark:border-[#2d4234] shadow-[0_4px_16px_-4px_rgba(25,60,51,0.06)] flex items-center justify-between gap-[20px] flex-wrap">
          <div className="flex flex-col gap-[4px] max-w-[540px]">
            <div className="flex items-center gap-[8px]">
              <span className="font-mono text-[10.5px] font-black uppercase tracking-[0.1em] text-[#2c5b3d] dark:text-[#90c49f] px-[8px] py-[2px] rounded-[5px] bg-[#e1eedc] dark:bg-[#203528]">
                {!todayStatus?.checkedIn
                  ? 'MORNING SHIFT • AWAITING CHECK-IN'
                  : !todayStatus?.checkedOut
                  ? 'SHIFT IN PROGRESS'
                  : 'SHIFT COMPLETED TODAY'}
              </span>
              {todayStatus?.checkedIn && !todayStatus?.checkedOut && (
                <span className="flex items-center gap-[6px] text-[11px] font-bold text-[#10b981] bg-white/80 dark:bg-black/30 px-[8px] py-[2px] rounded-full border border-[#10b981]/30">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                  <span>Clock Active</span>
                </span>
              )}
            </div>

            <h3 className="m-0 mt-1 text-[19px] font-bold text-[#193c33] dark:text-[#edf5ef] leading-tight">
              {!todayStatus?.checkedIn
                ? 'Ready for your shift? Record Check-In with Camera'
                : !todayStatus?.checkedOut
                ? `Checked in at ${formatTime(todayStatus.record?.checkIn || null)} (${todayStatus.record?.status || 'PRESENT'})`
                : `Shift complete: ${formatTime(todayStatus.record?.checkIn || null)} → ${formatTime(todayStatus.record?.checkOut || null)} (${todayStatus.record?.workingHours || 0} hrs)`}
            </h3>

            <p className="m-0 text-[12.5px] text-[#556b5e] dark:text-[#97a89e] leading-relaxed">
              {!todayStatus?.checkedIn
                ? 'Click "Check In with Camera" below to verify attendance with selfie capture. Timestamp and photo are instantly forwarded to Admin & Super Admin.'
                : !todayStatus?.checkedOut
                ? 'Your shift is currently active. When you finish work, click "Check Out with Camera" to log your exit timestamp and wrap up your day.'
                : 'Your daily attendance has been fully logged and synchronized with Admin & Super Admin systems.'}
            </p>

            {/* Quick action to submit request if employee forgot */}
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className="text-[12px] text-[#2f5e42] dark:text-[#a0d2af] font-semibold underline hover:text-[#193c33] cursor-pointer bg-transparent border-0 p-0"
                onClick={() => setShowRequestModal(true)}
              >
                Forgot to punch or need time adjustment? Submit attendance request →
              </button>
            </div>
          </div>

          {/* Action buttons & Verified Photos */}
          <div className="flex items-center gap-[12px] flex-wrap ml-auto">
            {todayStatus?.record?.checkInPhoto && (
              <button
                type="button"
                onClick={() => {
                  setLightboxZoom(1)
                  setLightboxLoading(true)
                  setLightboxError(false)
                  setLightboxPhoto({
                    url: resolveAttendancePhotoUrl(todayStatus.record!.checkInPhoto, todayStatus.record!.id, 'checkin'),
                    fallbackUrl: `${apiBase}/attendance/${todayStatus.record!.id}/photo/checkin`,
                    title: 'Check-In Verification Photo',
                    employeeName: currentUser?.fullName || 'Employee',
                    type: 'Check-In',
                    time: formatTime(todayStatus.record!.checkIn),
                    date: formatDate(todayStatus.record!.attendanceDate),
                    status: todayStatus.record!.status,
                  })
                }}
                className="group relative flex items-center gap-2 p-1.5 pr-3 rounded-[9px] bg-white/90 dark:bg-[#1a251f] border border-[#d5e0d3] dark:border-[#2f4236] shadow-sm hover:border-[#10b981] transition-all cursor-pointer text-left"
                title="View verified check-in photo"
              >
                <img
                  src={resolveAttendancePhotoUrl(todayStatus.record.checkInPhoto, todayStatus.record.id, 'checkin')}
                  alt="Check-in selfie"
                  className="w-8 h-8 rounded-[6px] object-cover border border-[#c5d3c3]"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true'
                      target.src = `${apiBase}/attendance/${todayStatus.record!.id}/photo/checkin`
                    }
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#4e6456] dark:text-[#8ea295]">Check-In</span>
                  <span className="text-[11px] font-extrabold text-[#193c33] dark:text-[#edf5ef]">
                    {formatTime(todayStatus.record.checkIn)}
                  </span>
                </div>
              </button>
            )}

            {todayStatus?.record?.checkOutPhoto && (
              <button
                type="button"
                onClick={() => {
                  setLightboxZoom(1)
                  setLightboxLoading(true)
                  setLightboxError(false)
                  setLightboxPhoto({
                    url: resolveAttendancePhotoUrl(todayStatus.record!.checkOutPhoto, todayStatus.record!.id, 'checkout'),
                    fallbackUrl: `${apiBase}/attendance/${todayStatus.record!.id}/photo/checkout`,
                    title: 'Check-Out Verification Photo',
                    employeeName: currentUser?.fullName || 'Employee',
                    type: 'Check-Out',
                    time: formatTime(todayStatus.record!.checkOut),
                    date: formatDate(todayStatus.record!.attendanceDate),
                    status: todayStatus.record!.status,
                  })
                }}
                className="group relative flex items-center gap-2 p-1.5 pr-3 rounded-[9px] bg-white/90 dark:bg-[#1a251f] border border-[#d5e0d3] dark:border-[#2f4236] shadow-sm hover:border-[#10b981] transition-all cursor-pointer text-left"
                title="View verified check-out photo"
              >
                <img
                  src={resolveAttendancePhotoUrl(todayStatus.record.checkOutPhoto, todayStatus.record.id, 'checkout')}
                  alt="Check-out selfie"
                  className="w-8 h-8 rounded-[6px] object-cover border border-[#c5d3c3]"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true'
                      target.src = `${apiBase}/attendance/${todayStatus.record!.id}/photo/checkout`
                    }
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#4e6456] dark:text-[#8ea295]">Check-Out</span>
                  <span className="text-[11px] font-extrabold text-[#193c33] dark:text-[#edf5ef]">
                    {formatTime(todayStatus.record.checkOut)}
                  </span>
                </div>
              </button>
            )}

            {/* Shift punch buttons */}
            {!todayStatus?.checkedIn ? (
              <button
                type="button"
                onClick={() => setCameraModalMode('check-in')}
                className="inline-flex items-center gap-[8px] px-[20px] py-[11px] rounded-[10px] bg-[#193c33] hover:bg-[#235345] text-white text-[13.5px] font-extrabold shadow-[0_4px_14px_rgba(25,60,51,0.25)] transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Camera size={18} />
                <span>Check In with Camera</span>
              </button>
            ) : !todayStatus?.checkedOut ? (
              <button
                type="button"
                onClick={() => setCameraModalMode('check-out')}
                className="inline-flex items-center gap-[8px] px-[20px] py-[11px] rounded-[10px] bg-[#059669] hover:bg-[#047857] text-white text-[13.5px] font-extrabold shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Camera size={18} />
                <span>Check Out with Camera</span>
              </button>
            ) : (
              <div className="flex items-center gap-[10px] flex-wrap">
                <div className="inline-flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] bg-[#ecfdf5] dark:bg-[#152a20] border border-[#a7f3d0] dark:border-[#1d4d36] text-[#065f46] dark:text-[#6ee7b7] text-[13px] font-bold">
                  <CheckCircle2 size={18} className="text-[#10b981]" />
                  <span>Today's Shift Completed</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraModalMode('check-out')}
                  className="inline-flex items-center gap-[6px] px-[14px] py-[10px] rounded-[10px] border border-[#d5e0d3] dark:border-[#2f4236] bg-white dark:bg-[#1f2d25] text-[#2c5339] dark:text-[#a0c5ac] hover:bg-[#f2f6f1] text-[12.5px] font-bold transition-all cursor-pointer shadow-xs"
                  title="Update check-out time"
                >
                  <Camera size={15} />
                  <span>Update Check-Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
              ? 'Log daily camera check-ins, submit punch adjustments, and monitor approval states in real time.'
              : 'Approve and reject attendance petitions live. Real-time multi-reviewer race condition safety.'}
          </p>
        </div>

        <div className="flex items-center gap-[10px] flex-wrap">
          {/* Daily punch button triggers for employees */}
          {isEmployee && (
            <>
              {!todayStatus?.checkedIn && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-[14px] py-[8px] rounded-[7px] text-[12px] font-bold border border-[#dce3d8] bg-white text-[#224434] hover:bg-[#f0f5e9] transition-colors cursor-pointer"
                  onClick={() => setCameraModalMode('check-in')}
                >
                  <Camera size={15} />
                  <span>Check In</span>
                </button>
              )}
              {todayStatus?.checkedIn && !todayStatus?.checkedOut && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-[14px] py-[8px] rounded-[7px] text-[12px] font-bold border-0 bg-[#28483b] text-white hover:bg-[#193c33] transition-colors cursor-pointer"
                  onClick={() => setCameraModalMode('check-out')}
                >
                  <Camera size={15} />
                  <span>Check Out</span>
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
              void fetchTodayStatus()
            }}
            title="Refresh records"
          >
            <RefreshCw size={15} className={loadingRequests || loadingLogs || loadingToday ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Requests vs Daily Logs) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[10px] sm:gap-[16px] border-b border-[#e5ebe2] dark:border-[#27382d] pb-[10px]">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-[6px] sm:gap-[8px] w-full sm:w-auto p-[3px] bg-[#f0f4ee] dark:bg-[#152019] sm:bg-transparent rounded-[10px] sm:rounded-none sm:p-0">
          <button
            type="button"
            className={`flex items-center justify-center gap-[6px] sm:gap-[7px] px-[10px] sm:px-[16px] py-[8px] rounded-[7px] sm:rounded-[8px] text-[12px] sm:text-[13px] font-bold border-0 cursor-pointer transition-all ${
              activeTab === 'requests'
                ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                : 'bg-transparent text-[#64776c] dark:text-[#8e9f94] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            <Clock size={15} className="shrink-0" />
            <span className="truncate">Attendance Requests</span>
            {pendingCount > 0 && (
              <span className="px-[5px] py-[0.5px] rounded-full text-[10px] font-black bg-[#fee2e2] text-[#dc2626] shrink-0">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`flex items-center justify-center gap-[6px] sm:gap-[7px] px-[10px] sm:px-[16px] py-[8px] rounded-[7px] sm:rounded-[8px] text-[12px] sm:text-[13px] font-bold border-0 cursor-pointer transition-all ${
              activeTab === 'logs'
                ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                : 'bg-transparent text-[#64776c] dark:text-[#8e9f94] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <Calendar size={15} className="shrink-0" />
            <span className="truncate">Daily Attendance Logs</span>
            <span className="px-[5px] py-[0.5px] rounded-full text-[10px] font-extrabold bg-[#e5ebe1] dark:bg-[#25362b] text-[#4d5e53] dark:text-[#a1b4a7] shrink-0">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Filters if on requests tab */}
        {activeTab === 'requests' && (
          <div className="flex items-center gap-[8px] sm:gap-[10px] w-full sm:w-auto">
            <div className="relative flex-1 sm:w-auto">
              <Search size={14} className="absolute left-[10px] top-[9px] text-[#86998e]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[200px] pl-[30px] pr-[12px] py-[6px] rounded-[7px] text-[12px] border border-[#dce3d8] dark:border-[#2b3c31] bg-white dark:bg-[#16201a] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#193c33]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shrink-0 px-[10px] sm:px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold border border-[#dce3d8] dark:border-[#2b3c31] bg-white dark:bg-[#16201a] text-[#193c33] dark:text-[#edf5ef] focus:outline-none"
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
            <table className="w-full text-left text-[12.5px] border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#e7ede4] dark:border-[#26372c] bg-[#f8faf7] dark:bg-[#141d18] text-[#55695d] dark:text-[#8e9f94] uppercase tracking-wider text-[11px] font-extrabold">
                  {!isEmployee && <th className="p-[12px_16px]">Employee</th>}
                  <th className="p-[12px_16px]">Date</th>
                  <th className="p-[12px_16px]">Check-In</th>
                  <th className="p-[12px_16px]">Check-Out</th>
                  <th className="p-[12px_16px]">Working Hours</th>
                  <th className="p-[12px_16px]">Status</th>
                  <th className="p-[12px_16px]">Verification</th>
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
                    <td className="p-[12px_16px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {row.checkInPhoto ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxZoom(1)
                              setLightboxLoading(true)
                              setLightboxError(false)
                              setLightboxPhoto({
                                url: resolveAttendancePhotoUrl(row.checkInPhoto, row.id, 'checkin'),
                                fallbackUrl: `${apiBase}/attendance/${row.id}/photo/checkin`,
                                title: `${row.fullName || 'Employee'} — Check-In Photo`,
                                employeeName: row.fullName || 'Employee',
                                type: 'Check-In',
                                time: formatTime(row.checkIn),
                                date: formatDate(row.attendanceDate),
                                status: row.status,
                              })
                            }}
                            className="group relative flex items-center gap-1.5 p-1 rounded-[8px] bg-[#f4faf4] dark:bg-[#1a251f] border border-[#d2e2cf] dark:border-[#2f4236] hover:border-[#10b981] hover:shadow-sm transition-all cursor-pointer text-left"
                            title="Click to view Check-In photo"
                          >
                            <div className="relative w-9 h-9 rounded-[6px] overflow-hidden bg-black/10 shrink-0">
                              <img
                                src={resolveAttendancePhotoUrl(row.checkInPhoto, row.id, 'checkin')}
                                alt="Check-in selfie"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  if (!target.dataset.retried) {
                                    target.dataset.retried = 'true'
                                    target.src = `${apiBase}/attendance/${row.id}/photo/checkin`
                                  }
                                }}
                              />
                              <span className="absolute bottom-0 right-0 px-1 text-[8px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-tl-[3px]">
                                IN
                              </span>
                            </div>
                            <div className="flex flex-col pr-1">
                              <span className="text-[9.5px] font-bold uppercase text-[#476652] dark:text-[#8ea295]">In</span>
                              <span className="text-[11px] font-bold text-[#193c33] dark:text-[#edf5ef]">
                                {formatTime(row.checkIn)}
                              </span>
                            </div>
                          </button>
                        ) : null}

                        {row.checkOutPhoto ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxZoom(1)
                              setLightboxLoading(true)
                              setLightboxError(false)
                              setLightboxPhoto({
                                url: resolveAttendancePhotoUrl(row.checkOutPhoto, row.id, 'checkout'),
                                fallbackUrl: `${apiBase}/attendance/${row.id}/photo/checkout`,
                                title: `${row.fullName || 'Employee'} — Check-Out Photo`,
                                employeeName: row.fullName || 'Employee',
                                type: 'Check-Out',
                                time: formatTime(row.checkOut),
                                date: formatDate(row.attendanceDate),
                                status: row.status,
                              })
                            }}
                            className="group relative flex items-center gap-1.5 p-1 rounded-[8px] bg-[#f0f6fb] dark:bg-[#16232e] border border-[#cbdceb] dark:border-[#263e52] hover:border-[#3b82f6] hover:shadow-sm transition-all cursor-pointer text-left"
                            title="Click to view Check-Out photo"
                          >
                            <div className="relative w-9 h-9 rounded-[6px] overflow-hidden bg-black/10 shrink-0">
                              <img
                                src={resolveAttendancePhotoUrl(row.checkOutPhoto, row.id, 'checkout')}
                                alt="Check-out selfie"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  if (!target.dataset.retried) {
                                    target.dataset.retried = 'true'
                                    target.src = `${apiBase}/attendance/${row.id}/photo/checkout`
                                  }
                                }}
                              />
                              <span className="absolute bottom-0 right-0 px-1 text-[8px] font-black uppercase tracking-wider bg-blue-600 text-white rounded-tl-[3px]">
                                OUT
                              </span>
                            </div>
                            <div className="flex flex-col pr-1">
                              <span className="text-[9.5px] font-bold uppercase text-[#355b7c] dark:text-[#8eb2d4]">Out</span>
                              <span className="text-[11px] font-bold text-[#193c33] dark:text-[#edf5ef]">
                                {formatTime(row.checkOut)}
                              </span>
                            </div>
                          </button>
                        ) : null}

                        {!row.checkInPhoto && !row.checkOutPhoto && (
                          <span className="text-[#a0b0a5] text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Camera Capture Modal for Check-In and Check-Out */}
      {cameraModalMode && (
        <CameraCaptureModal
          isOpen={Boolean(cameraModalMode)}
          mode={cameraModalMode}
          initialStep="camera"
          employeeName={currentUser?.fullName}
          onRequestAdjustment={() => {
            setCameraModalMode(null)
            setShowRequestModal(true)
          }}
          onClose={() => setCameraModalMode(null)}
          onConfirm={handleCameraAttendanceSubmit}
        />
      )}

      {/* Photo Lightbox Preview Modal with Zoom, Download & Fallback */}
      {lightboxPhoto && (
        <div
          className="modal-overlay fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-[10001] animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-[620px] w-full bg-white dark:bg-[#18231d] rounded-[20px] overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title + Zoom + Download + Close */}
            <div className="flex items-center justify-between p-3.5 px-4 sm:px-5 bg-[#f6faf4] dark:bg-[#131d17] border-b border-[#e5ece3] dark:border-[#27362c]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#e3efe0] dark:bg-[#1e2f22] flex items-center justify-center text-[#193c33] dark:text-[#d9ed74] shrink-0">
                  <ImageIcon size={17} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#476652] dark:text-[#8ea295]">
                    {lightboxPhoto.type} • VERIFICATION
                  </span>
                  <span className="text-[14px] font-bold text-[#193c33] dark:text-[#edf5ef] truncate">
                    {lightboxPhoto.title}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.75))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#55695b] hover:text-[#193c33] hover:bg-[#e4ede1] dark:text-[#9fb2a4] dark:hover:text-white dark:hover:bg-[#202e24] transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  className="px-2 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold text-[#55695b] hover:text-[#193c33] hover:bg-[#e4ede1] dark:text-[#9fb2a4] dark:hover:text-white dark:hover:bg-[#202e24] transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(prev + 0.25, 3))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#55695b] hover:text-[#193c33] hover:bg-[#e4ede1] dark:text-[#9fb2a4] dark:hover:text-white dark:hover:bg-[#202e24] transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => void handleDownloadPhoto()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#55695b] hover:text-[#193c33] hover:bg-[#e4ede1] dark:text-[#9fb2a4] dark:hover:text-white dark:hover:bg-[#202e24] transition-colors cursor-pointer"
                  title="Download Photo"
                >
                  <Download size={16} />
                </button>

                <div className="w-[1px] h-4 bg-[#d5e0d3] dark:bg-[#2f4236] mx-1" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#63776a] hover:text-[#193c33] hover:bg-[#e4ede1] dark:text-[#9fb2a4] dark:hover:text-white dark:hover:bg-[#202e24] cursor-pointer"
                  aria-label="Close photo preview"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Photo Viewport Area */}
            <div className="relative p-3 bg-[#0d1410] flex items-center justify-center overflow-auto min-h-[300px] max-h-[65vh]">
              {lightboxLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1410] text-gray-400 gap-2 z-10">
                  <div className="w-9 h-9 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-[12px] font-medium">Loading high-resolution photo…</span>
                </div>
              )}

              {lightboxError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-200 gap-3 z-10">
                  <AlertTriangle size={36} className="text-amber-400" />
                  <div className="flex flex-col gap-1 max-w-[320px]">
                    <strong className="text-[14px] text-white">Photo Not Available On Disk</strong>
                    <span className="text-[12px] text-gray-300">
                      The image file from this session could not be loaded from temporary storage.
                    </span>
                  </div>
                  {lightboxPhoto.fallbackUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxError(false)
                        setLightboxLoading(true)
                        if (lightboxPhoto.fallbackUrl) {
                          setLightboxPhoto({
                            ...lightboxPhoto,
                            url: `${lightboxPhoto.fallbackUrl}?t=${Date.now()}`,
                          })
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold cursor-pointer transition-colors shadow"
                    >
                      <RotateCcw size={14} />
                      <span>Retry With Verification Badge</span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}
                >
                  <img
                    src={lightboxPhoto.url}
                    alt={lightboxPhoto.title}
                    className="max-h-[60vh] max-w-full w-auto object-contain rounded-[10px] shadow-lg"
                    onLoad={() => {
                      setLightboxLoading(false)
                      setLightboxError(false)
                    }}
                    onError={() => {
                      setLightboxLoading(false)
                      if (lightboxPhoto.fallbackUrl && lightboxPhoto.url !== lightboxPhoto.fallbackUrl) {
                        setLightboxPhoto((prev) =>
                          prev ? { ...prev, url: prev.fallbackUrl! } : null
                        )
                      } else {
                        setLightboxError(true)
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Metadata Footer */}
            <div className="p-3 px-4 sm:px-5 bg-[#f6faf4] dark:bg-[#131d17] border-t border-[#e5ece3] dark:border-[#27362c] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[12px] text-[#425749] dark:text-[#9fb2a4]">
                <ShieldCheck size={16} className="text-[#10b981]" />
                <span className="font-semibold">{lightboxPhoto.employeeName}</span>
                {lightboxPhoto.time && <span>• Punch Time: <strong className="text-[#193c33] dark:text-[#edf5ef]">{lightboxPhoto.time}</strong></span>}
                {lightboxPhoto.date && <span className="hidden sm:inline">({lightboxPhoto.date})</span>}
              </div>

              {lightboxPhoto.status && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {lightboxPhoto.status}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Modal Dialog */}
      <RequestAttendanceModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        currentUser={currentUser}
        onSuccess={() => {
          void refresh()
          void fetchLogs()
          void fetchTodayStatus()
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
