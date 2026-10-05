export interface LeaveTypeBadgeProps {
  name?: string | null
  code?: string | null
  isPaid?: boolean | null
  status?: string | null
  className?: string
}

export default function LeaveTypeBadge({
  name,
  code,
  isPaid = true,
  status,
  className = '',
}: LeaveTypeBadgeProps) {
  const displayName = name && name.trim() ? name.trim() : 'Not specified'
  const upperCode = (code || '').toUpperCase()

  // Generate class based on code
  let typeClass = 'badge-type-other'
  if (upperCode === 'CL') typeClass = 'badge-type-cl'
  else if (upperCode === 'SL') typeClass = 'badge-type-sl'
  else if (upperCode === 'EL') typeClass = 'badge-type-el'
  else if (upperCode === 'LWP') typeClass = 'badge-type-lwp'
  else if (upperCode === 'ML' || upperCode === 'PL') typeClass = 'badge-type-maternity'
  else if (upperCode === 'COMP' || upperCode === 'BL') typeClass = 'badge-type-compoff'
  else if (upperCode === 'HDL') typeClass = 'badge-type-halfday'

  return (
    <div className={`leave-type-badge-container ${typeClass} ${className}`.trim()}>
      <span className="badge-name">{displayName}</span>
      {code && upperCode !== 'OTHER' && (
        <span className="badge-code">({code})</span>
      )}
      <span className={`badge-pay-tag ${isPaid ? 'paid' : 'unpaid'}`}>
        {isPaid ? 'PAID' : 'UNPAID'}
      </span>
      {status && (
        <span className={`badge-status-tag status-${status.toLowerCase()}`}>
          • {status === 'PENDING' ? 'Pending' : status}
        </span>
      )}
    </div>
  )
}
