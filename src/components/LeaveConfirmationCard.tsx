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
      <div className="leave-confirmation-card confirmed">
        <div className="leave-confirmation-header">
          <div className="leave-confirmation-title">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Leave Request Submitted</span>
          </div>
          <span className="leave-status-pill pending">PENDING</span>
        </div>
        <p className="leave-confirmation-msg">
          Your request for <strong>{confirmation.leaveTypeName}</strong> ({confirmation.startDate} to {confirmation.endDate}) is pending approval.
        </p>
        <div className="leave-confirmation-footer">
          <a
            href="/dashboard?view=leaves"
            className="leave-confirmation-link"
            onClick={(e) => {
              // If we are already on the dashboard, update URL and dispatch view change
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
      <div className="leave-confirmation-card cancelled">
        <div className="leave-confirmation-header">
          <div className="leave-confirmation-title">
            <XCircle size={16} className="text-gray-400" />
            <span className="text-gray-500">Request Cancelled</span>
          </div>
        </div>
        <p className="leave-confirmation-subtext">You cancelled this leave submission.</p>
      </div>
    )
  }

  return (
    <div className="leave-confirmation-card">
      <div className="leave-confirmation-header">
        <div className="leave-confirmation-title">
          <Calendar size={15} />
          <span>{confirmation.leaveTypeName} ({confirmation.leaveTypeCode})</span>
        </div>
        <span className={`leave-badge ${confirmation.isPaid ? 'badge-paid' : 'badge-unpaid'}`}>
          {confirmation.isPaid ? 'PAID' : 'UNPAID'}
        </span>
      </div>

      <div className="leave-confirmation-body">
        <div className="leave-confirmation-row">
          <span className="row-label">Dates:</span>
          <span className="row-value font-medium">
            {confirmation.startDate} {confirmation.startDate !== confirmation.endDate && `to ${confirmation.endDate}`}
            {' '}({confirmation.daysCount} {confirmation.daysCount === 1 ? 'day' : 'days'}
            {confirmation.halfDaySession ? ` - ${confirmation.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'}` : ''})
          </span>
        </div>

        <div className="leave-confirmation-row">
          <span className="row-label">Reason:</span>
          <span className="row-value">{confirmation.reason}</span>
        </div>

        <div className="leave-confirmation-row">
          <span className="row-label">Balance After:</span>
          <span className="row-value font-semibold text-emerald-700">
            {confirmation.isUnlimited ? 'Unlimited' : `${confirmation.balanceAfter} days remaining`}
          </span>
        </div>
      </div>

      {status === 'error' && error && (
        <div className="leave-confirmation-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="leave-confirmation-actions">
        {status === 'submitting' ? (
          <div className="leave-submitting-indicator">
            <Loader2 size={14} className="animate-spin text-emerald-700" />
            <span>Submitting your request...</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="agent-btn-confirm"
              onClick={onConfirm}
              id="confirm-leave-btn"
            >
              Confirm
            </button>
            <button
              type="button"
              className="agent-btn-edit"
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="agent-btn-cancel"
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
