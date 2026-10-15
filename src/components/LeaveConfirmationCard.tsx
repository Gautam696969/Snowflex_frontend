import { Calendar, CheckCircle2, AlertCircle, ArrowRight, Loader2, XCircle } from 'lucide-react'
import type { LeaveConfirmationPayload, ConfirmLeaveResponse } from '../lib/auth-api'

interface LeaveConfirmationCardProps {
  confirmation: LeaveConfirmationPayload
  status?: 'pending' | 'submitting' | 'confirmed' | 'cancelled' | 'error'
  error?: string
  result?: ConfirmLeaveResponse['leaveRequest'] | null
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
}

export default function LeaveConfirmationCard({
  confirmation,
  status = 'pending',
  error,
  onConfirm,
  onEdit,
  onCancel,
}: LeaveConfirmationCardProps) {
  if (status === 'confirmed') {
    return (
      <div className="leave-confirmation-card confirmed mt-[8px] p-[10px_12px] border border-[#a7d9b7] rounded-[8px] bg-[#f6fcf8] text-[#243a33] grid gap-[8px] text-[11px] shadow-[0_2px_6px_rgba(17,40,28,0.04)] dark:bg-[#14261c] dark:border-[#274834] dark:text-[#edf2ec]">
        <div className="leave-confirmation-header flex items-center justify-between gap-[6px] pb-[6px] border-b border-[#edf2ea] dark:border-[#27352d]">
          <div className="leave-confirmation-title inline-flex items-center gap-[6px] font-bold text-[#1f3629] text-[11.5px] dark:text-[#edf2ec]">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Leave Request Submitted</span>
          </div>
          <span className="leave-status-pill pending px-[6px] py-[1px] rounded-full text-[9px] font-bold text-[#a0680d] bg-[#fef7e6] border border-[#f6deb2] dark:bg-[#3d3215] dark:text-[#fde68a] dark:border-[#524115]">PENDING</span>
        </div>
        <p className="leave-confirmation-msg m-0 text-[#22372c] dark:text-[#edf2ec]">
          Your request for <strong>{confirmation.leaveTypeName}</strong> ({confirmation.startDate} to {confirmation.endDate}) is pending approval.
        </p>
        <div className="leave-confirmation-footer pt-[4px]">
          <a
            href="/dashboard?view=leaves"
            className="leave-confirmation-link inline-flex items-center gap-[4px] text-[11px] font-semibold text-[#059669] hover:underline dark:text-[#34d399]"
            onClick={(e) => {
              if (window.location.pathname === '/dashboard') {
                e.preventDefault()
                const url = new URL(window.location.href)
                url.searchParams.set('view', 'leaves')
                window.history.pushState({}, '', url.toString())
                window.dispatchEvent(new PopStateEvent('popstate'))
              }
            }}
          >
            <span>View in Leave Requests</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="leave-confirmation-card cancelled mt-[8px] p-[10px_12px] border border-[#e5eae3] rounded-[8px] bg-[#fbfcfb] opacity-85 text-[#243a33] grid gap-[8px] text-[11px] shadow-[0_2px_6px_rgba(17,40,28,0.04)] dark:bg-[#151c17] dark:border-[#27352d] dark:text-[#edf2ec]">
        <div className="leave-confirmation-header flex items-center justify-between gap-[6px] pb-[6px] border-b border-[#edf2ea] dark:border-[#27352d]">
          <div className="leave-confirmation-title inline-flex items-center gap-[6px] font-bold text-[#1f3629] text-[11.5px] dark:text-[#edf2ec]">
            <XCircle size={16} className="text-gray-400" />
            <span className="text-gray-500">Request Cancelled</span>
          </div>
        </div>
        <p className="leave-confirmation-subtext m-0 text-[#728177] dark:text-[#7f8f84]">You cancelled this leave submission.</p>
      </div>
    )
  }

  return (
    <div className="leave-confirmation-card mt-[8px] p-[10px_12px] border border-[#dce6d6] rounded-[8px] bg-white text-[#243a33] grid gap-[8px] text-[11px] shadow-[0_2px_6px_rgba(17,40,28,0.04)] dark:bg-[#1a231e] dark:border-[#303b34] dark:text-[#edf2ec]">
      <div className="leave-confirmation-header flex items-center justify-between gap-[6px] pb-[6px] border-b border-[#edf2ea] dark:border-[#27352d]">
        <div className="leave-confirmation-title inline-flex items-center gap-[6px] font-bold text-[#1f3629] text-[11.5px] dark:text-[#edf2ec]">
          <Calendar size={15} />
          <span>{confirmation.leaveTypeName} ({confirmation.leaveTypeCode})</span>
        </div>
        <span className={`leave-badge inline-block px-[5px] py-[1px] rounded-[4px] text-[9px] font-bold tracking-[0.3px] uppercase ${confirmation.isPaid ? 'badge-paid bg-[#eaf4e2] text-[#2c5938] border border-[#c9e3bc] dark:bg-[#193a28] dark:text-[#86efac] dark:border-[#047857]' : 'badge-unpaid bg-[#f1f3f0] text-[#637367] border border-[#dfe5dc] dark:bg-[#25322a] dark:text-[#9ca3af] dark:border-[#374151]'}`}>
          {confirmation.isPaid ? 'PAID' : 'UNPAID'}
        </span>
      </div>

      <div className="leave-confirmation-body grid gap-[4px] leading-[1.45]">
        <div className="leave-confirmation-row flex items-start gap-[6px]">
          <span className="row-label text-[#728177] min-w-[78px] shrink-0 dark:text-[#7f8f84]">Dates:</span>
          <span className="row-value font-medium text-[#22372c] break-words dark:text-[#edf2ec]">
            {confirmation.startDate} {confirmation.startDate !== confirmation.endDate && `to ${confirmation.endDate}`}
            {' '}({confirmation.daysCount} {confirmation.daysCount === 1 ? 'day' : 'days'}
            {confirmation.halfDaySession ? ` - ${confirmation.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'}` : ''})
          </span>
        </div>

        <div className="leave-confirmation-row flex items-start gap-[6px]">
          <span className="row-label text-[#728177] min-w-[78px] shrink-0 dark:text-[#7f8f84]">Reason:</span>
          <span className="row-value text-[#22372c] break-words dark:text-[#edf2ec]">{confirmation.reason}</span>
        </div>

        <div className="leave-confirmation-row flex items-start gap-[6px]">
          <span className="row-label text-[#728177] min-w-[78px] shrink-0 dark:text-[#7f8f84]">Balance After:</span>
          <span className="row-value font-semibold text-emerald-700 dark:text-emerald-400">
            {confirmation.isUnlimited ? 'Unlimited' : `${confirmation.balanceAfter} days remaining`}
          </span>
        </div>
      </div>

      {status === 'error' && error && (
        <div className="leave-confirmation-error flex items-center gap-[6px] p-[6px_8px] rounded-[5px] text-[#934c3f] bg-[#fff5f3] border border-[#efd4cc] text-[10px] dark:bg-[#2f1715] dark:border-[#5a2e28] dark:text-[#f8b4ab]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="leave-confirmation-actions flex items-center gap-[6px] mt-[4px]">
        {status === 'submitting' ? (
          <div className="leave-submitting-indicator flex items-center gap-[6px] text-[11px] text-[#2c5938] dark:text-[#86efac]">
            <Loader2 size={14} className="animate-spin text-emerald-700" />
            <span>Submitting your request...</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="agent-btn-confirm px-[12px] py-[5px] border-0 rounded-[5px] bg-[#24523c] text-[#f5f8ef] text-[11px] font-semibold cursor-pointer transition-colors duration-140 hover:bg-[#193d2b] dark:bg-[#10b981] dark:text-[#0b221d] dark:hover:bg-[#059669]"
              onClick={onConfirm}
              id="confirm-leave-btn"
            >
              Confirm
            </button>
            <button
              type="button"
              className="agent-btn-edit px-[10px] py-[5px] border border-[#d0dbcc] rounded-[5px] bg-[#f5f8f3] text-[#384f40] text-[11px] font-semibold cursor-pointer transition-colors duration-140 hover:bg-[#e9efe5] dark:bg-[#222e26] dark:border-[#344439] dark:text-[#c4d2c7] dark:hover:bg-[#2b3a30]"
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="agent-btn-cancel px-[8px] py-[5px] border-0 rounded-[5px] bg-transparent text-[#79897e] text-[11px] font-medium cursor-pointer transition-colors duration-140 hover:text-[#b83d32] dark:text-[#8a9b8f] dark:hover:text-[#ef4444]"
              onClick={onCancel}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
