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
  let typeClass = 'badge-type-other bg-[#f1f5f9] text-[#475569] border-[#cbd5e1] dark:bg-[#1e293b] dark:text-[#94a3b8] dark:border-[#334155]'
  if (upperCode === 'CL') typeClass = 'badge-type-cl bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[#172554] dark:text-[#93c5fd] dark:border-[#1e3a8a]'
  else if (upperCode === 'SL') typeClass = 'badge-type-sl bg-[#fffbeb] text-[#b45309] border-[#fde68a] dark:bg-[#451a03] dark:text-[#fde68a] dark:border-[#78350f]'
  else if (upperCode === 'EL') typeClass = 'badge-type-el bg-[#ecfdf5] text-[#047857] border-[#a7f3d0] dark:bg-[#064e3b] dark:text-[#6ee7b7] dark:border-[#065f46]'
  else if (upperCode === 'LWP') typeClass = 'badge-type-lwp bg-[#fff1f2] text-[#be123c] border-[#fecdd3] dark:bg-[#4c0519] dark:text-[#fecdd3] dark:border-[#881337]'
  else if (upperCode === 'ML' || upperCode === 'PL') typeClass = 'badge-type-maternity bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff] dark:bg-[#3b0764] dark:text-[#d8b4fe] dark:border-[#581c87]'
  else if (upperCode === 'COMP' || upperCode === 'BL') typeClass = 'badge-type-compoff bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4] dark:bg-[#042f2e] dark:text-[#5eead4] dark:border-[#115e59]'
  else if (upperCode === 'HDL') typeClass = 'badge-type-halfday bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe] dark:bg-[#1e1b4b] dark:text-[#a5b4fc] dark:border-[#312e81]'

  return (
    <div className={`leave-type-badge-container inline-flex items-center gap-[6px] px-[8px] py-[3px] rounded-[6px] text-[12px] font-semibold leading-[1.2] border border-transparent whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${typeClass} ${className}`.trim()}>
      <span className="badge-name font-semibold">{displayName}</span>
      {code && upperCode !== 'OTHER' && (
        <span className="badge-code text-[11px] opacity-85">({code})</span>
      )}
      <span className={`badge-pay-tag text-[9px] font-bold tracking-[0.5px] uppercase px-[4px] py-[1px] rounded-[4px] ${isPaid ? 'paid bg-[#dcfce7] text-[#15803d] dark:bg-[#193a28] dark:text-[#86efac]' : 'unpaid bg-[#fee2e2] text-[#b91c1c] dark:bg-[#3d1818] dark:text-[#fca5a5]'}`}>
        {isPaid ? 'PAID' : 'UNPAID'}
      </span>
      {status && (
        <span className={`badge-status-tag text-[11px] font-semibold opacity-90 status-${status.toLowerCase()} ${status === 'PENDING' ? 'text-[#d97706]' : ''}`}>
          • {status === 'PENDING' ? 'Pending' : status}
        </span>
      )}
    </div>
  )
}
