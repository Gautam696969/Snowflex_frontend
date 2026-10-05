import { useNavigate } from 'react-router-dom'
import { CheckCheck, BellOff, ArrowRight } from 'lucide-react'
import type { NotificationItem as NotificationItemType } from '../lib/notification-api'
import NotificationItem from './NotificationItem'
import UnreadBadge from './UnreadBadge'

interface NotificationDropdownProps {
  notifications: NotificationItemType[]
  unreadTotal: number
  loading: boolean
  onClose: () => void
  onMarkAsRead: (id: number) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
}

export default function NotificationDropdown({
  notifications,
  unreadTotal,
  loading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const navigate = useNavigate()

  const handleItemClick = (notification: NotificationItemType) => {
    if (!notification.isRead) {
      void onMarkAsRead(notification.id)
    }
    onClose()
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const handleViewAll = () => {
    onClose()
    navigate('/dashboard?view=leaves')
  }

  return (
    <div className="notif-dropdown-popover" role="dialog" aria-label="Notifications panel">
      {/* Header */}
      <div className="notif-dropdown-header">
        <div className="notif-header-title-box">
          <span className="notif-header-title">Notifications</span>
          <UnreadBadge count={unreadTotal} className="notif-header-badge" />
        </div>

        {unreadTotal > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={() => void onMarkAllAsRead()}
            title="Mark all notifications as read"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Body List */}
      <div className="notif-dropdown-body">
        {loading && notifications.length === 0 ? (
          <div className="notif-loading-state">
            <span className="notif-spinner" />
            <small>Fetching notifications...</small>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon-wrap">
              <BellOff size={28} strokeWidth={1.5} />
            </div>
            <strong>No notifications yet</strong>
            <p>You're all caught up with your workspace alerts!</p>
          </div>
        ) : (
          <div className="notif-list-container">
            {notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onClick={handleItemClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="notif-dropdown-footer">
          <button
            type="button"
            className="notif-footer-action-btn"
            onClick={handleViewAll}
          >
            <span>View leave workspace</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
