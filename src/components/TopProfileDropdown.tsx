import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, Shield, ChevronDown, LayoutDashboard, Sparkles } from 'lucide-react'
import type { SafeUser } from '../lib/auth-api'
import { getAvatarBackground, getInitials, getFullAvatarUrl } from '../lib/avatar'
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
    <div className={`topbar-profile-container ${className}`.trim()} ref={dropdownRef}>
      <button
        type="button"
        className={`topbar-profile-trigger ${isOpen ? 'is-active' : ''} ${isProfileActive ? 'is-current-page' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`My Profile (${displayName})`}
        aria-label="User profile menu"
      >
        <div className="topbar-profile-avatar-wrap">
          {user?.avatarUrl ? (
            <img
              src={getFullAvatarUrl(user.avatarUrl) || ''}
              alt={displayName}
              className="topbar-profile-avatar-img"
            />
          ) : (
            <span
              className="topbar-profile-avatar-initials"
              style={{ background: getAvatarBackground(displayName) }}
            >
              {getInitials(displayName)}
            </span>
          )}
          <span className="topbar-profile-status-indicator" title="Online" />
        </div>
        <span className="topbar-profile-name">{displayName}</span>
        <ChevronDown
          size={14}
          className={`topbar-profile-chevron ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="topbar-profile-menu-popover" role="menu">
          {/* Header Card */}
          <div
            className="topbar-profile-card-header"
            onClick={() => handleNavigate('/profile')}
            role="button"
            tabIndex={0}
            title="Click to view full profile"
          >
            <div className="topbar-card-avatar-wrap">
              {user?.avatarUrl ? (
                <img
                  src={getFullAvatarUrl(user.avatarUrl) || ''}
                  alt={displayName}
                  className="topbar-card-avatar-img"
                />
              ) : (
                <span
                  className="topbar-card-avatar-initials"
                  style={{ background: getAvatarBackground(displayName) }}
                >
                  {getInitials(displayName)}
                </span>
              )}
            </div>
            <div className="topbar-card-user-info">
              <div className="topbar-card-name-row">
                <span className="topbar-card-name">{displayName}</span>
                <span className="topbar-card-badge">{displayRole}</span>
              </div>
              <span className="topbar-card-email">{user?.email || 'Authenticated User'}</span>
            </div>
          </div>

          <div className="topbar-menu-divider" />

          {/* Navigation Links */}
          <div className="topbar-menu-items">
            <button
              type="button"
              className={`topbar-menu-item ${isProfileActive ? 'active' : ''}`}
              role="menuitem"
              onClick={() => handleNavigate('/profile')}
            >
              <User size={16} className="topbar-menu-icon" />
              <span>My Profile</span>
              <span className="topbar-menu-tag">View</span>
            </button>

            <button
              type="button"
              className="topbar-menu-item"
              role="menuitem"
              onClick={() => handleNavigate('/profile')}
            >
              <Shield size={16} className="topbar-menu-icon" />
              <span>Security & Password</span>
            </button>

            {isProfileActive ? (
              <button
                type="button"
                className="topbar-menu-item"
                role="menuitem"
                onClick={() => handleNavigate('/dashboard')}
              >
                <LayoutDashboard size={16} className="topbar-menu-icon" />
                <span>Return to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                className="topbar-menu-item"
                role="menuitem"
                onClick={() => handleNavigate('/profile')}
              >
                <Sparkles size={16} className="topbar-menu-icon" />
                <span>Account Preferences</span>
              </button>
            )}
          </div>

          <div className="topbar-menu-divider" />

          {/* Logout Action */}
          <div className="topbar-menu-footer">
            <LogoutButton variant="ghost" className="topbar-menu-logout-btn" />
          </div>
        </div>
      )}
    </div>
  )
}
