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
    <div className="leave-balance-summary-section flex flex-col gap-[14px] bg-white border border-[#e1e9df] rounded-[14px] p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:bg-[#1a231e] dark:border-[#303b34]">
      <div className="leave-balance-header flex items-center justify-between">
        <div>
          <div className="section-kicker text-[10px] font-bold text-[#6b7280] tracking-[0.05em] uppercase mb-[2px] dark:text-[#9eab9f]">ANNUAL ALLOWANCE & ACCRUAL</div>
          <h3 className="leave-balance-title m-0 text-[16px] font-bold text-[#193c33] dark:text-[#edf2ec]">My Leave Balances ({new Date().getFullYear()})</h3>
        </div>
        <div className="leave-balance-meta-pill inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#edf6ec] border border-[#d4e7d0] text-[#15803d] text-[11px] font-semibold dark:bg-[#16271c] dark:border-[#23422e] dark:text-[#86efac]">
          <Sparkles size={13} />
          <span>Real-time Quota Tracker</span>
        </div>
      </div>

      <div className="leave-balance-grid grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[12px]">
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
              className="leave-balance-card flex flex-col justify-between p-[14px_16px] bg-[#fbfdfa] border border-[#e5ede3] rounded-[10px] transition-all duration-180 ease-out hover:bg-white hover:border-[#10b981] hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)] hover:-translate-y-[1px] dark:bg-[#151d18] dark:border-[#27352d] dark:hover:bg-[#1f2b23]"
              onClick={() => onSelectType && onSelectType(b.leaveTypeId)}
              title={onSelectType ? `Click to apply for ${b.leaveTypeName}` : undefined}
              style={{ cursor: onSelectType ? 'pointer' : 'default' }}
            >
              <div className="balance-card-top flex items-start justify-between gap-[8px] mb-[8px]">
                <span className="balance-type-name text-[12.5px] font-bold text-[#193c33] leading-[1.3] dark:text-[#edf2ec]">{b.leaveTypeName}</span>
                <span className={`balance-paid-pill text-[9px] font-extrabold px-[6px] py-[2px] rounded-[4px] tracking-[0.04em] uppercase ${b.isPaid ? 'paid bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] dark:bg-[#193a28] dark:text-[#86efac] dark:border-[#047857]' : 'unpaid bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb] dark:bg-[#25322a] dark:text-[#9ca3af] dark:border-[#374151]'}`}>
                  {b.isPaid ? 'PAID' : 'UNPAID'}
                </span>
              </div>

              <div className="balance-card-middle flex items-baseline justify-between mb-[8px]">
                <div className="balance-remaining-num text-[22px] font-extrabold text-[#193c33] flex items-baseline gap-[5px] leading-none dark:text-[#edf2ec]">
                  {isUnlimited ? '∞' : remaining}
                  <span className="balance-unit text-[11px] font-semibold text-[#6b7280] dark:text-[#8a9b8f]">{isUnlimited ? 'Unlimited' : remaining === 1 ? 'day left' : 'days left'}</span>
                </div>
                {pending > 0 && (
                  <span className="balance-pending-tag text-[10px] font-bold text-[#b45309] bg-[#fef3c7] px-[6px] py-[2px] rounded-[4px] border border-[#fde68a] dark:bg-[#3d3215] dark:text-[#fde68a] dark:border-[#524115]" title="Days reserved in pending approval">
                    +{pending} pending
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {!isUnlimited ? (
                <div className="balance-progress-track w-full h-[6px] bg-[#edf2eb] rounded-[4px] flex overflow-hidden mb-[10px] dark:bg-[#27352d]">
                  <div
                    className="balance-progress-used h-full bg-[#10b981] transition-[width] duration-300 ease-out"
                    style={{ width: `${usedPercent}%` }}
                    title={`${used} days used`}
                  />
                  <div
                    className="balance-progress-pending h-full bg-[#f59e0b] transition-[width] duration-300 ease-out"
                    style={{ width: `${pendingPercent}%` }}
                    title={`${pending} days pending`}
                  />
                </div>
              ) : (
                <div className="balance-progress-unlimited text-[10.5px] font-semibold text-[#6b7280] mb-[10px] dark:text-[#8a9b8f]">
                  <span>No yearly ceiling</span>
                </div>
              )}

              <div className="balance-card-bottom flex items-center justify-between text-[11px] text-[#8c9e93] font-medium dark:text-[#7f9185]">
                <span>
                  {isUnlimited ? `${used} days taken` : `${used} of ${total} days used`}
                </span>
                {onSelectType && (
                  <span className="balance-apply-hint font-bold text-[#059669] dark:text-[#34d399]">Apply →</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
