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
      className={`notif-item-row ${!notification.isRead ? 'is-unread' : 'is-read'} ${bgClass}`}
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
      <div className={`notif-item-icon-box ${badgeClass}`}>
        <Icon size={16} strokeWidth={2} />
      </div>

      <div className="notif-item-content">
        <div className="notif-item-header-row">
          <span className="notif-item-title">{notification.title}</span>
          <span className="notif-item-time" title={new Date(notification.createdAt).toLocaleString()}>
            <Clock size={11} style={{ marginRight: '3px' }} />
            {relativeTime}
          </span>
        </div>

        <p className="notif-item-message">{notification.message}</p>

        {notification.link && (
          <span className="notif-item-link-hint">Click to view details →</span>
        )}
      </div>

      {!notification.isRead && (
        <span className="notif-item-unread-dot" title="Unread notification" />
      )}
    </div>
  )
}
