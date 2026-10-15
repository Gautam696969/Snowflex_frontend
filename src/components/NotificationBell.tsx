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
    <div className={`notif-bell-container relative inline-flex items-center justify-center ${className}`.trim()} ref={bellContainerRef}>
      <button
        type="button"
        className={`notif-bell-btn relative w-[32px] h-[32px] bg-white border border-[#e1e8df] rounded-[6px] cursor-pointer p-0 text-[#4b5e52] inline-flex items-center justify-center transition-all duration-180 ease-out hover:bg-[#edf4ea] hover:text-[#193c33] dark:bg-[#1a231e] dark:border-[#303b34] dark:text-[#a4b2a8] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec] ${isOpen ? 'is-active bg-[#edf4ea] text-[#193c33] dark:bg-[#25322a] dark:text-[#edf2ec]' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCounts.total} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={unreadCounts.total > 0 ? `${unreadCounts.total} unread notifications` : 'Notifications'}
      >
        <Bell size={18} className={unreadCounts.total > 0 ? 'bell-has-unread text-[#193c33] animate-[notifBellWiggle_3s_infinite_ease-in-out] dark:text-[#edf2ec]' : ''} />
        <UnreadBadge count={unreadCounts.total} className="notif-bell-badge absolute -top-[4px] -right-[4px] z-[3] pointer-events-none min-w-[17px] h-[17px] px-[4px] py-0 rounded-full bg-[#ef4444] text-white text-[9.5px] font-extrabold leading-none border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.2),0_0_4px_rgba(239,68,68,0.4)] inline-flex items-center justify-center box-border tracking-[-0.02em]" />
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
