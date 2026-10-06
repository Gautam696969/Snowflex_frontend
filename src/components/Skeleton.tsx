import React from 'react'

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rounded' | 'rectangular'
  width?: string | number
  height?: string | number
  className?: string
  style?: React.CSSProperties
  count?: number
}

/**
 * Base atomic Skeleton primitive with smooth pulse-shimmer animation.
 */
export function Skeleton({
  variant = 'rounded',
  width,
  height,
  className = '',
  style = {},
  count = 1,
}: SkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'skeleton-circle'
      case 'text':
        return 'skeleton-text'
      case 'rectangular':
        return 'skeleton-rect'
      case 'rounded':
      default:
        return 'skeleton-rounded'
    }
  }

  const items = Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={`skeleton-base skeleton-shimmer ${getVariantClass()} ${className}`.trim()}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
    />
  ))

  if (count === 1) {
    return items[0]
  }

  return <>{items}</>
}

export default Skeleton

/**
 * Skeleton Table Loader for tabular data (Employees, Departments, Attendance, Tasks, Leaves, Users).
 */
export interface SkeletonTableProps {
  columns?: number
  rows?: number
  hasAvatar?: boolean
  className?: string
}

export function SkeletonTable({
  columns = 5,
  rows = 5,
  hasAvatar = false,
  className = '',
}: SkeletonTableProps) {
  // Preset realistic percentage widths for text bars
  const widthPresets = ['75%', '55%', '85%', '45%', '65%', '90%']

  return (
    <div className={`saas-table-container skeleton-table-container ${className}`.trim()} role="status" aria-label="Loading table data">
      <table className="saas-grid-table skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, colIdx) => (
              <th key={colIdx}>
                <Skeleton
                  variant="text"
                  width={colIdx === 0 && hasAvatar ? '110px' : `${50 + (colIdx * 15) % 45}px`}
                  height="12px"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIdx) => (
            <tr key={rowIdx} className="skeleton-table-row">
              {Array.from({ length: columns }, (_, colIdx) => {
                if (colIdx === 0 && hasAvatar) {
                  return (
                    <td key={colIdx}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Skeleton variant="circular" width={34} height={34} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <Skeleton variant="text" width="120px" height="13px" />
                          <Skeleton variant="text" width="160px" height="11px" />
                        </div>
                      </div>
                    </td>
                  )
                }

                if (colIdx === columns - 1) {
                  // Actions column
                  return (
                    <td key={colIdx} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Skeleton variant="rounded" width={28} height={28} style={{ borderRadius: '6px' }} />
                        <Skeleton variant="rounded" width={28} height={28} style={{ borderRadius: '6px' }} />
                      </div>
                    </td>
                  )
                }

                if (colIdx === columns - 2) {
                  // Status pill column
                  return (
                    <td key={colIdx}>
                      <Skeleton variant="rounded" width={80} height={22} style={{ borderRadius: '9999px' }} />
                    </td>
                  )
                }

                const width = widthPresets[(rowIdx + colIdx) % widthPresets.length]
                return (
                  <td key={colIdx}>
                    <Skeleton variant="text" width={width} height="13px" />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton Cards Grid Loader (for Grid Cards view mode in Employees/Departments/Tasks).
 */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="saas-cards-grid skeleton-cards-grid" role="status" aria-label="Loading card records">
      {Array.from({ length: count }, (_, i) => (
        <article className="emp-profile-card skeleton-card-item" key={i}>
          <div className="emp-card-top" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Skeleton variant="circular" width={48} height={48} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="60%" height="15px" />
              <Skeleton variant="text" width="85%" height="12px" />
            </div>
            <Skeleton variant="rounded" width={26} height={26} style={{ borderRadius: '6px' }} />
          </div>

          <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="30%" height="12px" />
              <Skeleton variant="rounded" width="45%" height="20px" style={{ borderRadius: '9999px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="25%" height="12px" />
              <Skeleton variant="text" width="50%" height="12px" />
            </div>
          </div>

          <div className="emp-card-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border, #e5e7eb)' }}>
            <Skeleton variant="rounded" width={75} height={22} style={{ borderRadius: '9999px' }} />
            <Skeleton variant="rounded" width={60} height={26} style={{ borderRadius: '6px' }} />
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * Skeleton KPI Metric Cards (Used in Dashboard overview & Admin Users).
 */
export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-metric-grid skeleton-kpi-grid" role="status" aria-label="Loading workspace metrics">
      {Array.from({ length: count }, (_, i) => (
        <article className="kpi-card skeleton-kpi-card" key={i}>
          <div className="kpi-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="90px" height="13px" />
            <Skeleton variant="rounded" width={36} height={36} style={{ borderRadius: '10px' }} />
          </div>
          <div className="kpi-value-row" style={{ margin: '14px 0 8px' }}>
            <Skeleton variant="rounded" width="80px" height="32px" style={{ borderRadius: '6px' }} />
          </div>
          <div className="kpi-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="110px" height="11px" />
            <Skeleton variant="rounded" width={55} height={20} style={{ borderRadius: '9999px' }} />
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * Full Dashboard Overview Skeleton Loader.
 */
export function SkeletonOverview() {
  return (
    <div className="skeleton-overview-wrapper" role="status" aria-label="Loading overview dashboard">
      {/* 4 Metric Cards */}
      <SkeletonKpiGrid count={4} />

      {/* Main Grid: Pulse & Needs Attention */}
      <div className="overview-dashboard-grid" style={{ marginTop: '24px' }}>
        {/* Pulse Widget */}
        <article className="overview-card skeleton-overview-card">
          <div className="overview-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="110px" height="11px" />
              <Skeleton variant="text" width="180px" height="18px" />
              <Skeleton variant="text" width="240px" height="12px" />
            </div>
            <Skeleton variant="rounded" width={32} height={32} style={{ borderRadius: '8px' }} />
          </div>

          <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="rounded" width="90px" height="30px" />
              <Skeleton variant="text" width="130px" height="12px" />
            </div>
            <Skeleton variant="rounded" width="140px" height="28px" style={{ borderRadius: '9999px' }} />
          </div>

          {/* Progress bar track */}
          <div style={{ margin: '16px 0' }}>
            <Skeleton variant="rounded" width="100%" height="8px" style={{ borderRadius: '9999px' }} />
          </div>

          {/* 3 mini cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton variant="text" width="50%" height="11px" />
                <Skeleton variant="rounded" width="40%" height="18px" />
                <Skeleton variant="text" width="70%" height="10px" />
              </div>
            ))}
          </div>
        </article>

        {/* Needs Attention Widget */}
        <article className="overview-card skeleton-overview-card">
          <div className="overview-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="95px" height="11px" />
              <Skeleton variant="text" width="160px" height="18px" />
              <Skeleton variant="text" width="220px" height="12px" />
            </div>
            <Skeleton variant="rounded" width={32} height={32} style={{ borderRadius: '8px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #e5e7eb)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Skeleton variant="rounded" width={34} height={34} style={{ borderRadius: '8px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <Skeleton variant="text" width="120px" height="13px" />
                    <Skeleton variant="text" width="150px" height="11px" />
                  </div>
                </div>
                <Skeleton variant="rounded" width={28} height={20} style={{ borderRadius: '9999px' }} />
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Bottom Row: Activity & Quick Actions */}
      <div className="overview-dashboard-grid" style={{ marginTop: '24px' }}>
        <article className="overview-card skeleton-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="100px" height="11px" />
              <Skeleton variant="text" width="170px" height="18px" />
            </div>
            <Skeleton variant="text" width="70px" height="13px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                <Skeleton variant="circular" width={28} height={28} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Skeleton variant="text" width="80%" height="12px" />
                  <Skeleton variant="text" width="40%" height="10px" />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card skeleton-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="90px" height="11px" />
              <Skeleton variant="text" width="150px" height="18px" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skeleton variant="rounded" width={32} height={32} style={{ borderRadius: '8px' }} />
                <Skeleton variant="text" width="60%" height="13px" />
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

/**
 * Skeleton Leave Balances Grid (Used in LeaveManagementView).
 */
export function SkeletonLeaveBalances({ count = 4 }: { count?: number }) {
  return (
    <div className="leave-balance-summary-section skeleton-leave-balance-section" role="status" aria-label="Loading leave quota balances">
      <div className="leave-balance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton variant="text" width="160px" height="11px" />
          <Skeleton variant="text" width="220px" height="18px" />
        </div>
        <Skeleton variant="rounded" width="140px" height="24px" style={{ borderRadius: '9999px' }} />
      </div>

      <div className="leave-balance-grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="leave-balance-card skeleton-leave-balance-card">
            <div className="balance-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Skeleton variant="text" width="80px" height="14px" />
                <Skeleton variant="rounded" width={32} height={18} style={{ borderRadius: '4px' }} />
              </div>
              <Skeleton variant="rounded" width={42} height={18} style={{ borderRadius: '9999px' }} />
            </div>

            <div className="balance-card-main" style={{ margin: '14px 0 8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <Skeleton variant="rounded" width="55px" height="32px" style={{ borderRadius: '6px' }} />
              <Skeleton variant="text" width="80px" height="12px" />
            </div>

            <div style={{ margin: '10px 0' }}>
              <Skeleton variant="rounded" width="100%" height="6px" style={{ borderRadius: '9999px' }} />
            </div>

            <div className="balance-breakdown-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <Skeleton variant="text" width="30%" height="11px" />
              <Skeleton variant="text" width="30%" height="11px" />
              <Skeleton variant="text" width="30%" height="11px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton Notification Items (Used in NotificationDropdown).
 */
export function SkeletonNotifications({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-notifications-list" role="status" aria-label="Loading notifications">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="notif-item skeleton-notif-item"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 14px',
            borderBottom: '1px solid var(--border, #f0f2ee)',
          }}
        >
          <Skeleton variant="circular" width={36} height={36} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="60%" height="13px" />
              <Skeleton variant="text" width="40px" height="10px" />
            </div>
            <Skeleton variant="text" width="90%" height="11px" />
            <Skeleton variant="text" width="75%" height="11px" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton Diagnostics Cards (Used in AdminSystemView).
 */
export function SkeletonDiagnosticCards() {
  return (
    <div className="admin-diag-grid skeleton-diag-grid" role="status" aria-label="Loading infrastructure telemetry">
      {Array.from({ length: 3 }, (_, i) => (
        <article key={i} className="overview-card admin-diag-card skeleton-diag-card">
          <div className="overview-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton variant="rounded" width={38} height={38} style={{ borderRadius: '10px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Skeleton variant="text" width="160px" height="16px" />
                <Skeleton variant="text" width="120px" height="11px" />
              </div>
            </div>
            <Skeleton variant="rounded" width={85} height={24} style={{ borderRadius: '9999px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border, #f0f2ee)' }}>
                <Skeleton variant="text" width="90px" height="12px" />
                <Skeleton variant="text" width="120px" height="12px" />
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * Skeleton Conversation History items (Used in AiAssistant sidebar).
 */
export function SkeletonConversationHistory({ count = 5 }: { count?: number }) {
  return (
    <ul className="ai-history-list skeleton-history-list" role="status" aria-label="Loading conversation history">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton variant="rounded" width={22} height={22} style={{ borderRadius: '6px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Skeleton variant="text" width={`${65 + (i * 12) % 30}%`} height="13px" />
            <Skeleton variant="text" width="40%" height="10px" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Skeleton Message Bubbles (Used in AiAssistant conversation thread).
 */
export function SkeletonMessageBubbles({ count = 2 }: { count?: number }) {
  return (
    <div className="skeleton-messages-wrapper" role="status" aria-label="Loading messages">
      {Array.from({ length: count }, (_, i) => (
        <article key={i} className="ai-bubble assistant skeleton-ai-bubble" style={{ marginBottom: '16px' }}>
          <Skeleton variant="circular" width={27} height={27} style={{ flexShrink: 0 }} />
          <div className="ai-bubble-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton variant="rounded" width="85%" height="14px" />
            <Skeleton variant="rounded" width="92%" height="14px" />
            <Skeleton variant="rounded" width="60%" height="14px" />
            <Skeleton variant="text" width="90px" height="10px" style={{ marginTop: '4px' }} />
          </div>
        </article>
      ))}
    </div>
  )
}

/**
 * Skeleton Account Card (Used in Account.tsx).
 */
export function SkeletonAccount() {
  return (
    <div className="account-card skeleton-account-card" role="status" aria-label="Loading account profile">
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <Skeleton variant="circular" width={80} height={80} />
      </div>
      <div className="account-details" style={{ display: 'grid', gap: '14px', borderTop: '1px solid var(--border, #dce2d7)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="70px" height="13px" />
          <Skeleton variant="text" width="140px" height="13px" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="70px" height="13px" />
          <Skeleton variant="text" width="180px" height="13px" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="70px" height="13px" />
          <Skeleton variant="rounded" width="80px" height="20px" style={{ borderRadius: '9999px' }} />
        </div>
      </div>
      <div style={{ marginTop: '16px' }}>
        <Skeleton variant="rounded" width="100%" height="42px" style={{ borderRadius: '8px' }} />
      </div>
    </div>
  )
}
