interface UnreadBadgeProps {
  count: number
  max?: number
  className?: string
  dotOnly?: boolean
}

export default function UnreadBadge({
  count,
  max = 99,
  className = '',
  dotOnly = false,
}: UnreadBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > max ? `${max}+` : String(count)

  if (dotOnly) {
    return (
      <span
        className={`unread-badge-dot inline-block w-[8px] h-[8px] rounded-full bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.6)] shrink-0 ${className}`.trim()}
        title={`${count} unread notifications`}
        aria-label={`${count} unread notifications`}
      />
    )
  }

  return (
    <span
      className={`unread-badge inline-flex items-center justify-center font-inherit text-[9.5px] font-extrabold leading-none rounded-full bg-[#ef4444] text-white min-w-[17px] h-[17px] px-[4px] py-0 shadow-[0_1px_4px_rgba(239,68,68,0.4)] tracking-[-0.02em] box-border text-center whitespace-nowrap ${className}`.trim()}
      title={`${count} unread notifications`}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  )
}
