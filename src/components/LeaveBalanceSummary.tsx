import type { LeaveBalance } from '../lib/leave-api'
import { Sparkles } from 'lucide-react'
import { SkeletonLeaveBalances } from './Skeleton'

interface LeaveBalanceSummaryProps {
  balances: LeaveBalance[]
  loading?: boolean
  onSelectType?: (typeId: number) => void
}

export default function LeaveBalanceSummary({
  balances,
  loading = false,
  onSelectType,
}: LeaveBalanceSummaryProps) {
  if (loading && balances.length === 0) {
    return <SkeletonLeaveBalances count={4} />
  }

  if (balances.length === 0) {
    return null
  }

  return (
    <div className="leave-balance-summary-section">
      <div className="leave-balance-header">
        <div>
          <div className="section-kicker">ANNUAL ALLOWANCE & ACCRUAL</div>
          <h3 className="leave-balance-title">My Leave Balances ({new Date().getFullYear()})</h3>
        </div>
        <div className="leave-balance-meta-pill">
          <Sparkles size={13} />
          <span>Real-time Quota Tracker</span>
        </div>
      </div>

      <div className="leave-balance-grid">
        {balances.map((b) => {
          const isUnlimited = b.isUnlimited
          const total = b.total
          const used = b.used
          const pending = b.pending
          const remaining = b.remaining

          const usedPercent = isUnlimited ? 0 : Math.min(100, Math.round((used / (total || 1)) * 100))
          const pendingPercent = isUnlimited ? 0 : Math.min(100 - usedPercent, Math.round((pending / (total || 1)) * 100))

          return (
            <div
              key={b.id}
              className="leave-balance-card"
              onClick={() => onSelectType && onSelectType(b.leaveTypeId)}
              title={onSelectType ? `Click to apply for ${b.leaveTypeName}` : undefined}
              style={{ cursor: onSelectType ? 'pointer' : 'default' }}
            >
              <div className="balance-card-top">
                <span className="balance-type-name">{b.leaveTypeName}</span>
                <span className={`balance-paid-pill ${b.isPaid ? 'paid' : 'unpaid'}`}>
                  {b.isPaid ? 'PAID' : 'UNPAID'}
                </span>
              </div>

              <div className="balance-card-middle">
                <div className="balance-remaining-num">
                  {isUnlimited ? '∞' : remaining}
                  <span className="balance-unit">{isUnlimited ? 'Unlimited' : remaining === 1 ? 'day left' : 'days left'}</span>
                </div>
                {pending > 0 && (
                  <span className="balance-pending-tag" title="Days reserved in pending approval">
                    +{pending} pending
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {!isUnlimited ? (
                <div className="balance-progress-track">
                  <div
                    className="balance-progress-used"
                    style={{ width: `${usedPercent}%` }}
                    title={`${used} days used`}
                  />
                  <div
                    className="balance-progress-pending"
                    style={{ width: `${pendingPercent}%` }}
                    title={`${pending} days pending`}
                  />
                </div>
              ) : (
                <div className="balance-progress-unlimited">
                  <span>No yearly ceiling</span>
                </div>
              )}

              <div className="balance-card-bottom">
                <span>
                  {isUnlimited ? `${used} days taken` : `${used} of ${total} days used`}
                </span>
                {onSelectType && (
                  <span className="balance-apply-hint">Apply →</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
