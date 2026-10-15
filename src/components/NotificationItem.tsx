import { Calendar, CheckCircle2, XCircle, Bell, Clock } from 'lucide-react'
import type { NotificationItem as NotificationItemType } from '../lib/notification-api'

interface NotificationItemProps {
  notification: NotificationItemType
  onClick: (notification: NotificationItemType) => void
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 45) return 'just now'
  if (diffSec < 90) return '1 min ago'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getNotificationVisuals(type: string) {
  const upper = type.toUpperCase()
  if (upper === 'LEAVE_REQUESTED') {
    return {
      icon: Calendar,
      badgeClass: 'notif-badge-requested',
      bgClass: 'notif-bg-requested',
    }
  }
  if (upper === 'LEAVE_APPROVED') {
    return {
      icon: CheckCircle2,
      badgeClass: 'notif-badge-approved',
      bgClass: 'notif-bg-approved',
    }
  }
  if (upper === 'LEAVE_REJECTED') {
    return {
      icon: XCircle,
      badgeClass: 'notif-badge-rejected',
      bgClass: 'notif-bg-rejected',
    }
  }
  if (upper === 'HOLIDAY') {
    return {
      icon: Calendar,
      badgeClass: 'notif-badge-approved',
      bgClass: 'notif-bg-approved',
    }
  }
  return {
    icon: Bell,
    badgeClass: 'notif-badge-default',
    bgClass: 'notif-bg-default',
  }
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { icon: Icon, badgeClass, bgClass } = getNotificationVisuals(notification.type)
  const relativeTime = formatRelativeTime(notification.createdAt)

  return (
    <div
      className={`notif-item-row flex items-start gap-[12px] p-[12px_16px] border-b border-[#edf3eb] last:border-b-0 cursor-pointer transition-colors duration-150 relative text-left w-full box-border hover:bg-[#f6faf4] dark:border-[#27352d] dark:hover:bg-[#202c24] ${!notification.isRead ? 'is-unread bg-[#fcfdfa] dark:bg-[rgba(26,35,29,0.7)]' : 'is-read'} ${bgClass}`}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(notification)
        }
      }}
    >
      <div className={`notif-item-icon-box w-[32px] h-[32px] rounded-[8px] grid place-items-center shrink-0 mt-[2px] ${badgeClass}`}>
        <Icon size={16} strokeWidth={2} />
      </div>

      <div className="notif-item-content flex-1 min-w-0">
        <div className="notif-item-header-row flex items-baseline justify-between gap-[8px] mb-[3px]">
          <span className="notif-item-title text-[12px] font-bold text-[#193c33] leading-[1.3] truncate dark:text-[#edf2ec]">{notification.title}</span>
          <span className="notif-item-time text-[10.5px] text-[#8c9e93] whitespace-nowrap inline-flex items-center dark:text-[#7f8f84]" title={new Date(notification.createdAt).toLocaleString()}>
            <Clock size={11} style={{ marginRight: '3px' }} />
            {relativeTime}
          </span>
        </div>

        <p className="notif-item-message text-[12px] text-[#3f4e45] m-0 mb-[4px] leading-[1.45] break-words dark:text-[#c4d2c7]">{notification.message}</p>

        {notification.link && (
          <span className="notif-item-link-hint text-[10.5px] font-semibold text-[#059669] block dark:text-[#34d399]">Click to view details →</span>
        )}
      </div>

      {!notification.isRead && (
        <span className="notif-item-unread-dot w-[8px] h-[8px] rounded-full bg-[#10b981] shrink-0 mt-[6px] shadow-[0_0_0_2px_rgba(16,185,129,0.2)]" title="Unread notification" />
      )}
    </div>
  )
}
