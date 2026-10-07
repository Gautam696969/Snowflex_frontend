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
        className={`unread-badge-dot ${className}`.trim()}
        title={`${count} unread notifications`}
        aria-label={`${count} unread notifications`}
      />
    )
  }

  return (
    <span
      className={`unread-badge ${className}`.trim()}
      title={`${count} unread notifications`}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  )
}
