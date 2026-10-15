import { useNavigate } from 'react-router-dom'
import { CheckCheck, BellOff, ArrowRight } from 'lucide-react'
import type { NotificationItem as NotificationItemType } from '../lib/notification-api'
import NotificationItem from './NotificationItem'
import UnreadBadge from './UnreadBadge'
import { SkeletonNotifications } from './Skeleton'

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
    <div className="notif-dropdown-popover absolute top-[calc(100%+8px)] right-0 w-[380px] max-w-[calc(100vw-20px)] bg-white border border-[#dce5d9] rounded-[14px] shadow-[0_16px_40px_-8px_rgba(15,23,42,0.16),0_0_0_1px_rgba(0,0,0,0.04)] z-[1000] overflow-hidden animate-[notifDropIn_0.2s_cubic-bezier(0.16,1,0.3,1)] dark:bg-[#1a231e] dark:border-[#303b34] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)]" role="dialog" aria-label="Notifications panel">
      {/* Header */}
      <div className="notif-dropdown-header flex items-center justify-between p-[12px_16px] bg-[#f7faf5] border-b border-[#e3ece0] dark:bg-[#151d18] dark:border-[#27352d]">
        <div className="notif-header-title-box flex items-center gap-[8px]">
          <span className="notif-header-title font-bold text-[13.5px] text-[#193c33] tracking-[-0.01em] dark:text-[#edf2ec]">Notifications</span>
          <UnreadBadge count={unreadTotal} className="notif-header-badge" />
        </div>

        {unreadTotal > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-[#193c33] bg-transparent border-0 cursor-pointer p-[4px_8px] rounded-[6px] transition-all duration-150 hover:bg-[#e3ece0] hover:text-[#0b221d] dark:text-[#c4d2c7] dark:hover:bg-[#253329] dark:hover:text-[#edf2ec]"
            onClick={() => void onMarkAllAsRead()}
            title="Mark all notifications as read"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Body List */}
      <div className="notif-dropdown-body max-h-[380px] overflow-y-auto [overscroll-behavior:contain]">
        {loading && notifications.length === 0 ? (
          <SkeletonNotifications count={4} />
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state flex flex-col items-center justify-center p-[38px_20px] text-center text-[#6b7280]">
            <div className="notif-empty-icon-wrap w-[50px] h-[50px] rounded-full bg-[#f1f6ef] grid place-items-center mb-[12px] text-[#8c9e93] dark:bg-[#202c24] dark:text-[#7f8f84]">
              <BellOff size={28} strokeWidth={1.5} />
            </div>
            <strong className="text-[13.5px] text-[#193c33] mb-[4px] dark:text-[#edf2ec]">No notifications yet</strong>
            <p className="text-[12px] m-0 text-[#6b7280] max-w-[230px] leading-[1.4] dark:text-[#9eab9f]">You're all caught up with your workspace alerts!</p>
          </div>
        ) : (
          <div className="notif-list-container flex flex-col">
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
        <div className="notif-dropdown-footer p-[10px_16px] bg-[#f7faf5] border-t border-[#e3ece0] text-center dark:bg-[#151d18] dark:border-[#27352d]">
          <button
            type="button"
            className="notif-footer-action-btn bg-transparent border-0 text-[12px] font-semibold text-[#193c33] cursor-pointer inline-flex items-center gap-[6px] p-[4px_10px] rounded-[6px] transition-all duration-150 hover:text-[#047857] hover:underline dark:text-[#c4d2c7] dark:hover:text-[#34d399]"
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
