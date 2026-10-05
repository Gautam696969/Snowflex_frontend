import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import NotificationDropdown from './NotificationDropdown'
import UnreadBadge from './UnreadBadge'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const bellContainerRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCounts,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  // Outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellContainerRef.current && !bellContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`notif-bell-container ${className}`.trim()} ref={bellContainerRef}>
      <button
        type="button"
        className={`notif-bell-btn icon-button ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCounts.total} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={unreadCounts.total > 0 ? `${unreadCounts.total} unread notifications` : 'Notifications'}
      >
        <Bell size={18} className={unreadCounts.total > 0 ? 'bell-has-unread' : ''} />
        <UnreadBadge count={unreadCounts.total} className="notif-bell-badge" />
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadTotal={unreadCounts.total}
          loading={loading}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  )
}
