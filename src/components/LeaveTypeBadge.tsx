export interface LeaveTypeBadgeProps {
  name: string
  code?: string
  isPaid?: boolean
  className?: string
}

export default function LeaveTypeBadge({
  name,
  code,
  isPaid = true,
  className = '',
}: LeaveTypeBadgeProps) {
  const upperCode = (code || '').toUpperCase()

  let colorStyle = {
    bg: '#f1f8f3',
    text: '#193c33',
    border: '#d2e4d7',
  }

  if (upperCode === 'CL') {
    colorStyle = { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }
  } else if (upperCode === 'SL') {
    colorStyle = { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
  } else if (upperCode === 'EL') {
    colorStyle = { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
  } else if (upperCode === 'LWP') {
    colorStyle = { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' }
  } else if (upperCode === 'ML' || upperCode === 'PL') {
    colorStyle = { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' }
  } else if (upperCode === 'COMP' || upperCode === 'BL') {
    colorStyle = { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }
  } else if (upperCode === 'HDL') {
    colorStyle = { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' }
  }

  return (
    <div
      className={`leave-type-badge-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '6px',
        backgroundColor: colorStyle.bg,
        border: `1px solid ${colorStyle.border}`,
        fontSize: '11.5px',
        fontWeight: 600,
        color: colorStyle.text,
      }}
    >
      <span>{name}</span>
      {code && (
        <span
          style={{
            fontSize: '9.5px',
            opacity: 0.85,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ({code})
        </span>
      )}
      <span
        style={{
          fontSize: '9px',
          padding: '1px 5px',
          borderRadius: '4px',
          fontWeight: 700,
          background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.18)',
          color: isPaid ? '#047857' : '#4b5563',
          border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.25)'}`,
          marginLeft: '2px',
        }}
      >
        {isPaid ? 'PAID' : 'UNPAID'}
      </span>
    </div>
  )
}
