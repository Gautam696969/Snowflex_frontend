import { useState } from 'react'
import {
  Clock, CheckCircle2, XCircle, ArrowUpRight, Check, X,
  RefreshCw, Calendar
} from 'lucide-react'
import UserAvatar from './UserAvatar'
import { type AttendanceRequestItem } from '../lib/attendance-request-api'

interface AttendanceRequestsWidgetProps {
  pendingRequests: AttendanceRequestItem[]
  handledRequests: AttendanceRequestItem[]
  loading: boolean
  submittingIds: Set<number>
  newArrivalIds: Set<number>
  onApprove: (id: number) => Promise<boolean>
  onReject: (id: number, reason?: string | null) => Promise<boolean>
  onRefresh: () => void
  onNavigate?: () => void
}

function timeAgo(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 30) return 'just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'recently'
  }
}

function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AttendanceRequestsWidget({
  pendingRequests,
  handledRequests,
  loading,
  submittingIds,
  newArrivalIds,
  onApprove,
  onReject,
  onRefresh,
  onNavigate,
}: AttendanceRequestsWidgetProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'handled'>('pending')
  const [rejectModalId, setRejectModalId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [submittingReject, setSubmittingReject] = useState<boolean>(false)

  const handleOpenReject = (id: number) => {
    setRejectModalId(id)
    setRejectReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectModalId) return
    setSubmittingReject(true)
    try {
      const ok = await onReject(rejectModalId, rejectReason.trim() || null)
      if (ok) {
        setRejectModalId(null)
        setRejectReason('')
      }
    } finally {
      setSubmittingReject(false)
    }
  }

  return (
    <article className="overview-card bg-white dark:bg-[#1a241f] border border-[#e2e8df] dark:border-[#27382d] rounded-[14px] p-[22px] shadow-[0_4px_16px_-2px_rgba(25,60,51,0.03)] flex flex-col relative">
      {/* Card Header */}
      <div className="overview-card-header flex items-start justify-between gap-[16px] mb-[18px]">
        <div>
          <div className="flex items-center gap-[8px]">
            <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154] dark:text-[#a0c49d]">
              REAL-TIME QUEUE
            </span>
            {pendingRequests.length > 0 && (
              <span className="inline-flex items-center px-[8px] py-[1px] rounded-full text-[10.5px] font-black bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]/40 animate-pulse">
                {pendingRequests.length} Live
              </span>
            )}
          </div>
          <h2 className="my-[4px_0] text-[#193c33] dark:text-[#eaf2ec] font-sans text-[18px] font-bold">
            Pending Attendance Requests
          </h2>
          <p className="m-0 text-[#7a8b81] dark:text-[#8e9f94] text-[12px]">
            First reviewer to decide claims the decision. Real-time broadcast to all reviewers.
          </p>
        </div>

        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            className="icon-button grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] dark:border-[#2f4035] rounded-[6px] text-[#546a5d] dark:text-[#a1b4a8] bg-white dark:bg-[#202d26] hover:bg-[#f3f6ef] dark:hover:bg-[#27362e] transition-colors cursor-pointer"
            onClick={onRefresh}
            title="Refresh queue"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {onNavigate && (
            <button
              type="button"
              className="icon-button grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] dark:border-[#2f4035] rounded-[6px] text-[#546a5d] dark:text-[#a1b4a8] bg-white dark:bg-[#202d26] hover:bg-[#f3f6ef] dark:hover:bg-[#27362e] transition-colors cursor-pointer"
              onClick={onNavigate}
              title="Open full attendance view"
            >
              <ArrowUpRight size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-[6px] p-[3px] bg-[#edf2ea] dark:bg-[#141c17] rounded-[9px] mb-[16px] w-fit">
        <button
          type="button"
          className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-bold border-0 cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-[#223128] text-[#193c33] dark:text-[#d9ed74] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'bg-transparent text-[#66776e] dark:text-[#8c9e93] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <span>Pending</span>
          <span
            className={`px-[6px] py-[1px] rounded-full text-[10px] font-extrabold ${
              pendingRequests.length > 0
                ? 'bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#193c33]'
                : 'bg-[#dce3d8] dark:bg-[#2a3a30] text-[#53655a] dark:text-[#9bb0a2]'
            }`}
          >
            {pendingRequests.length}
          </span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-bold border-0 cursor-pointer transition-all ${
            activeTab === 'handled'
              ? 'bg-white dark:bg-[#223128] text-[#193c33] dark:text-[#d9ed74] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'bg-transparent text-[#66776e] dark:text-[#8c9e93] hover:text-[#193c33] dark:hover:text-[#d9ed74]'
          }`}
          onClick={() => setActiveTab('handled')}
        >
          <span>Recently Handled</span>
          <span className="px-[6px] py-[1px] rounded-full text-[10px] font-extrabold bg-[#dce3d8] dark:bg-[#2a3a30] text-[#53655a] dark:text-[#9bb0a2]">
            {handledRequests.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Pending */}
      {activeTab === 'pending' ? (
        pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[36px_20px] text-center bg-[#fafcfa] dark:bg-[#16201b] rounded-[12px] border border-dashed border-[#dce3d8] dark:border-[#2a3c30]">
            <div className="w-[44px] h-[44px] rounded-full bg-[#ecf5e9] dark:bg-[#1f2d25] flex items-center justify-center text-[#10b981] mb-[10px]">
              <CheckCircle2 size={24} />
            </div>
            <strong className="block text-[14px] font-bold text-[#193c33] dark:text-[#eaf2ec]">
              All caught up!
            </strong>
            <p className="m-0 text-[12px] text-[#718478] dark:text-[#8e9f94] mt-[4px] max-w-[320px]">
              There are no pending attendance adjustment requests right now. New petitions will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px] max-h-[420px] overflow-y-auto pr-[4px]">
            {pendingRequests.map((item) => {
              const isNew = newArrivalIds.has(item.id)
              const isInFlight = submittingIds.has(item.id)

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-[10px] p-[14px_16px] rounded-[11px] border transition-all duration-300 ${
                    isNew
                      ? 'border-l-[4px] border-l-[#d9ed74] border-t-[#d9ed74]/40 border-r-[#d9ed74]/40 border-b-[#d9ed74]/40 bg-[#f8fcf5] dark:bg-[#1f2b23] shadow-[0_4px_16px_rgba(217,237,116,0.15)] animate-pulse'
                      : 'border-[#e4eae0] dark:border-[#29392e] bg-white dark:bg-[#16201a] hover:border-[#cbdbca] dark:hover:border-[#384e3f]'
                  }`}
                >
                  {/* Top row: Employee + Type badge + time ago */}
                  <div className="flex items-center justify-between gap-[10px]">
                    <div className="flex items-center gap-[10px] min-w-0">
                      <UserAvatar
                        name={item.employeeName || 'Employee'}
                        avatarUrl={item.employeeAvatarUrl}
                        size={32}
                        className="rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] truncate">
                          {item.employeeName || 'Employee'}
                        </strong>
                        <span className="block text-[11px] text-[#788b80] dark:text-[#8e9f94] truncate">
                          {item.departmentName || 'General'} • {item.employeeCode || 'EMP'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-[6px] shrink-0">
                      <span className="px-[8px] py-[2px] rounded-[6px] text-[10.5px] font-extrabold bg-[#edf4ea] dark:bg-[#202f26] text-[#224838] dark:text-[#d9ed74] border border-[#d6e3d2] dark:border-[#2e4236]">
                        {formatTypeLabel(item.type)}
                      </span>
                      <span className="text-[11px] text-[#86998d] dark:text-[#7f9184]">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Date requested, times & reason */}
                  <div className="p-[10px_12px] rounded-[8px] bg-[#f9fbf9] dark:bg-[#131b16] border border-[#eef2ec] dark:border-[#223027] text-[12px] flex flex-col gap-[6px]">
                    <div className="flex items-center gap-[14px] flex-wrap text-[#264438] dark:text-[#d8e6dc] font-semibold text-[11.5px]">
                      <div className="flex items-center gap-[5px]">
                        <Calendar size={13} className="text-[#517154] dark:text-[#d9ed74]" />
                        <span>Target Date: {item.date}</span>
                      </div>
                      {(item.checkInTime || item.checkOutTime) && (
                        <div className="flex items-center gap-[5px]">
                          <Clock size={13} className="text-[#517154] dark:text-[#d9ed74]" />
                          <span>
                            {item.checkInTime || '--:--'} → {item.checkOutTime || '--:--'}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="m-0 text-[#55695d] dark:text-[#a0b2a6] text-[11.5px] italic line-clamp-2">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  </div>

                  {/* Bottom row: Approve / Reject Buttons */}
                  <div className="flex items-center justify-end gap-[8px] pt-[2px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] text-[12px] font-bold border border-[#fee2e2] dark:border-[#4c1d1d] bg-[#fef2f2] dark:bg-[#2c1515] text-[#dc2626] dark:text-[#f87171] hover:bg-[#fee2e2] dark:hover:bg-[#3d1a1a] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => handleOpenReject(item.id)}
                      disabled={isInFlight}
                      title="Reject attendance request"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[12px] font-bold border-0 bg-[#193c33] hover:bg-[#265648] text-[#d9ed74] shadow-[0_2px_6px_rgba(25,60,51,0.15)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => void onApprove(item.id)}
                      disabled={isInFlight}
                      title="Approve attendance request and sync attendance record"
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
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Tab Content: Handled */
        handledRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[36px_20px] text-center bg-[#fafcfa] dark:bg-[#16201b] rounded-[12px] border border-dashed border-[#dce3d8] dark:border-[#2a3c30]">
            <Clock size={24} className="text-[#8c9e93] mb-[10px]" />
            <strong className="block text-[14px] font-bold text-[#193c33] dark:text-[#eaf2ec]">
              No handled requests yet
            </strong>
            <p className="m-0 text-[12px] text-[#718478] dark:text-[#8e9f94] mt-[4px]">
              Decisions will appear here in real time as reviewers resolve petitions.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px] max-h-[420px] overflow-y-auto pr-[4px]">
            {handledRequests.slice(0, 15).map((item) => {
              const isApproved = item.status === 'APPROVED'

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-[8px] p-[12px_14px] rounded-[10px] border border-[#e4eae0] dark:border-[#29392e] bg-white dark:bg-[#16201a]"
                >
                  <div className="flex items-center justify-between gap-[10px]">
                    <div className="flex items-center gap-[8px] min-w-0">
                      <UserAvatar
                        name={item.employeeName || 'Employee'}
                        avatarUrl={item.employeeAvatarUrl}
                        size={26}
                        className="rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-[12.5px] font-bold text-[#193c33] dark:text-[#edf5ef] truncate">
                          {item.employeeName || 'Employee'}
                        </strong>
                        <span className="block text-[11px] text-[#798d81] dark:text-[#8f9f95] truncate">
                          {item.date} • {formatTypeLabel(item.type)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[10.5px] font-extrabold ${
                        isApproved
                          ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] dark:bg-[#12281e] dark:text-[#34d399] dark:border-[#1e4432]'
                          : 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] dark:bg-[#2a1414] dark:text-[#f87171] dark:border-[#4d1f1f]'
                      }`}
                    >
                      {isApproved ? <Check size={12} /> : <X size={12} />}
                      <span>{item.status}</span>
                    </span>
                  </div>

                  {/* Approver Snapshot */}
                  <div className="flex items-center justify-between text-[11px] text-[#718478] dark:text-[#8e9f94] pt-[6px] border-t border-[#f0f4ee] dark:border-[#202c25]">
                    <span>
                      {isApproved ? 'Approved' : 'Rejected'} by{' '}
                      <strong className="text-[#193c33] dark:text-[#edf5ef]">
                        {item.decidedByName || 'Reviewer'}
                      </strong>{' '}
                      ({item.decidedByRole || 'ADMIN'})
                    </span>
                    <span>{timeAgo(item.decidedAt || item.updatedAt)}</span>
                  </div>

                  {item.rejectReason && (
                    <div className="text-[11px] text-[#dc2626] dark:text-[#f87171] bg-[#fef2f2] dark:bg-[#251212] p-[6px_8px] rounded-[6px]">
                      Reason: {item.rejectReason}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Reject Confirmation / Reason Modal */}
      {rejectModalId !== null && (
        <div
          className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-[16px] z-[10000]"
          onClick={() => setRejectModalId(null)}
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
                onClick={() => setRejectModalId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12px] text-[#697d71] dark:text-[#90a297] mb-[12px]">
              You are about to reject this request. Provide an optional reason to explain this decision to the employee.
            </p>

            <textarea
              rows={3}
              className="w-full px-[12px] py-[8px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2d3e33] bg-white dark:bg-[#141c18] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#dc2626] mb-[16px] resize-none"
              placeholder="e.g. Unverified absence, incorrect hours specified..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000}
            />

            <div className="flex items-center justify-end gap-[10px]">
              <button
                type="button"
                className="px-[14px] py-[8px] rounded-[7px] text-[12px] font-semibold border border-[#dce3d8] bg-white text-[#4d6356] hover:bg-[#f2f6ee] cursor-pointer"
                onClick={() => setRejectModalId(null)}
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
    </article>
  )
}
