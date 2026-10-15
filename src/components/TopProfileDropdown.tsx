import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, Shield, ChevronDown, LayoutDashboard, Sparkles } from 'lucide-react'
import type { SafeUser } from '../lib/auth-api'
import UserAvatar from './UserAvatar'
import LogoutButton from './LogoutButton'

interface TopProfileDropdownProps {
  user: SafeUser | null
  className?: string
}

export default function TopProfileDropdown({ user, className = '' }: TopProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const displayName = user?.fullName || 'User'
  const displayRole = user?.role === 'USER' ? 'EMPLOYEE' : user?.role || 'EMPLOYEE'
  const isProfileActive = location.pathname.startsWith('/profile')

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Close dropdown on Escape key
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

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  return (
    <div className={`topbar-profile-container relative inline-flex items-center ${className}`.trim()} ref={dropdownRef}>
      <button
        type="button"
        className={`topbar-profile-trigger flex items-center gap-[8px] pt-[3px] pr-[10px] pb-[3px] pl-[3px] rounded-full border border-[#e1e8df] bg-white text-[#193c33] cursor-pointer outline-none transition-all duration-150 ease-out select-none hover:border-[#10b981] hover:bg-[#f7faf6] hover:shadow-[0_2px_10px_rgba(16,185,129,0.12)] dark:bg-[#1a231e] dark:border-[#303b34] dark:text-[#edf2ec] dark:hover:bg-[#25322a] ${isOpen ? 'is-active border-[#10b981] bg-[#f7faf6] shadow-[0_2px_10px_rgba(16,185,129,0.12)] dark:bg-[#25322a]' : ''} ${isProfileActive ? 'is-current-page border-[#10b981] shadow-[0_0_0_1.5px_rgba(16,185,129,0.25)]' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`My Profile (${displayName})`}
        aria-label="User profile menu"
      >
        <div className="topbar-profile-avatar-wrap relative w-[32px] h-[32px] rounded-full overflow-hidden shrink-0 grid place-items-center">
          <UserAvatar name={displayName} avatarUrl={user?.avatarUrl} size={32} className="topbar-profile-avatar-initials" />
          <span className="topbar-profile-status-indicator absolute bottom-[1px] right-[1px] w-[8px] h-[8px] rounded-full bg-[#10b981] border-[1.5px] border-white" title="Online" />
        </div>
        <span className="topbar-profile-name text-[12px] font-semibold text-[#193c33] max-w-[120px] whitespace-nowrap overflow-hidden text-ellipsis dark:text-[#edf2ec]">{displayName}</span>
        <ChevronDown
          size={14}
          className={`topbar-profile-chevron text-[#798a7f] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="topbar-profile-menu-popover absolute top-[calc(100%+8px)] right-0 w-[270px] bg-white border border-[#e2e8df] rounded-[14px] shadow-[0_16px_36px_-4px_rgba(15,23,42,0.16),0_4px_12px_rgba(15,23,42,0.06)] p-[8px] z-[1000] animate-[popoverFadeIn_0.16s_cubic-bezier(0.16,1,0.3,1)] dark:bg-[#1a231e] dark:border-[#303b34] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)]" role="menu">
          {/* Header Card */}
          <div
            className="topbar-profile-card-header flex items-center gap-[11px] p-[9px_10px] rounded-[9px] bg-[#fbfdfa] border border-[#eaf0e7] cursor-pointer transition-all duration-150 hover:bg-[#f2f7ef] hover:border-[#dbe7d7] dark:bg-[#151d18] dark:border-[#27352d] dark:hover:bg-[#202c24]"
            onClick={() => handleNavigate('/profile')}
            role="button"
            tabIndex={0}
            title="Click to view full profile"
          >
            <div className="topbar-card-avatar-wrap w-[38px] h-[38px] rounded-full overflow-hidden shrink-0 grid place-items-center">
              <UserAvatar name={displayName} avatarUrl={user?.avatarUrl} size={38} className="topbar-card-avatar-initials" />
            </div>
            <div className="topbar-card-user-info flex-1 min-w-0">
              <div className="topbar-card-name-row flex items-center justify-between gap-[6px]">
                <span className="topbar-card-name font-bold text-[13px] text-[#193c33] whitespace-nowrap overflow-hidden text-ellipsis dark:text-[#edf2ec]">{displayName}</span>
                <span className="topbar-card-badge text-[9px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-[4px] bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-[#193a28] dark:text-[#6ee7b7] dark:border-[#047857]">{displayRole}</span>
              </div>
              <span className="topbar-card-email block text-[11px] text-[#76877b] whitespace-nowrap overflow-hidden text-ellipsis mt-[2px] dark:text-[#8a9b8f]">{user?.email || 'Authenticated User'}</span>
            </div>
          </div>

          <div className="topbar-menu-divider h-[1px] bg-[#e9efe7] my-[6px] dark:bg-[#27352d]" />

          {/* Navigation Links */}
          <div className="topbar-menu-items flex flex-col gap-[2px]">
            <button
              type="button"
              className={`topbar-menu-item flex items-center gap-[10px] w-full p-[8px_10px] rounded-[8px] border-0 bg-transparent text-[12px] font-medium text-[#2e473b] cursor-pointer text-left transition-all duration-120 select-none hover:bg-[#f1f6ee] hover:text-[#193c33] [&:hover_svg]:text-[#10b981] dark:text-[#a4b2a8] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec] ${isProfileActive ? 'active bg-[#e9f3e4] text-[#047857] font-semibold dark:bg-[#1b2d22] dark:text-[#34d399]' : ''}`}
              role="menuitem"
              onClick={() => handleNavigate('/profile')}
            >
              <User size={16} className="topbar-menu-icon text-[#6c7f73] shrink-0 dark:text-[#7f9185]" />
              <span>My Profile</span>
              <span className="topbar-menu-tag ml-auto text-[10px] text-[#10b981] font-bold uppercase tracking-[0.5px]">View</span>
            </button>

            <button
              type="button"
              className="topbar-menu-item flex items-center gap-[10px] w-full p-[8px_10px] rounded-[8px] border-0 bg-transparent text-[12px] font-medium text-[#2e473b] cursor-pointer text-left transition-all duration-120 select-none hover:bg-[#f1f6ee] hover:text-[#193c33] [&:hover_svg]:text-[#10b981] dark:text-[#a4b2a8] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec]"
              role="menuitem"
              onClick={() => handleNavigate('/profile')}
            >
              <Shield size={16} className="topbar-menu-icon text-[#6c7f73] shrink-0 dark:text-[#7f9185]" />
              <span>Security & Password</span>
            </button>

            {isProfileActive ? (
              <button
                type="button"
                className="topbar-menu-item flex items-center gap-[10px] w-full p-[8px_10px] rounded-[8px] border-0 bg-transparent text-[12px] font-medium text-[#2e473b] cursor-pointer text-left transition-all duration-120 select-none hover:bg-[#f1f6ee] hover:text-[#193c33] [&:hover_svg]:text-[#10b981] dark:text-[#a4b2a8] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec]"
                role="menuitem"
                onClick={() => handleNavigate('/dashboard')}
              >
                <LayoutDashboard size={16} className="topbar-menu-icon text-[#6c7f73] shrink-0 dark:text-[#7f9185]" />
                <span>Return to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                className="topbar-menu-item flex items-center gap-[10px] w-full p-[8px_10px] rounded-[8px] border-0 bg-transparent text-[12px] font-medium text-[#2e473b] cursor-pointer text-left transition-all duration-120 select-none hover:bg-[#f1f6ee] hover:text-[#193c33] [&:hover_svg]:text-[#10b981] dark:text-[#a4b2a8] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec]"
                role="menuitem"
                onClick={() => handleNavigate('/profile')}
              >
                <Sparkles size={16} className="topbar-menu-icon text-[#6c7f73] shrink-0 dark:text-[#7f9185]" />
                <span>Account Preferences</span>
              </button>
            )}
          </div>

          <div className="topbar-menu-divider h-[1px] bg-[#e9efe7] my-[6px] dark:bg-[#27352d]" />

          {/* Logout Action */}
          <div className="topbar-menu-footer pt-[2px]">
            <LogoutButton variant="ghost" className="topbar-menu-logout-btn !w-full !justify-start !p-[8px_10px] !rounded-[8px] !text-[#dc2626] !border-none" />
          </div>
        </div>
      )}
    </div>
  )
}
