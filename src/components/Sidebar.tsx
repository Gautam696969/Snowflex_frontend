import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Snowflake,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
  Building2,
  Clock3,
  CalendarDays,
  Calendar,
  CheckSquare2,
  ShieldCheck,
  Server,
  UserCircle2,
  LogOut,
  PanelLeftOpen,
  Menu,
  X,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import UserAvatar from './UserAvatar'
import UnreadBadge from './UnreadBadge'
import { clearToken, logout, normalizeRole, readToken, type SafeUser } from '../lib/auth-api'

export type SidebarView =
  | 'overview'
  | 'chat'
  | 'assistant'
  | 'employees'
  | 'departments'
  | 'attendance'
  | 'leaves'
  | 'holidays'
  | 'tasks'
  | 'users'
  | 'system'
  | 'themes'
  | 'profile'

export interface SidebarProps {
  currentView?: SidebarView | string
  onSelectView?: (viewId: SidebarView) => void
  user?: SafeUser | null
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean | ((c: boolean) => boolean)) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean | ((o: boolean) => boolean)) => void
  leaveUnreadCount?: number
  chatUnreadCount?: number
  attendanceUnreadCount?: number
  onLogout?: () => void
  className?: string
}

export default function Sidebar({
  currentView = 'overview',
  onSelectView,
  user,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  leaveUnreadCount = 0,
  chatUnreadCount = 0,
  attendanceUnreadCount = 0,
  onLogout,
  className = '',
}: SidebarProps) {
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Close mobile drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen, setMobileSidebarOpen])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [mobileSidebarOpen])

  const role = normalizeRole(user?.role)
  const canManage = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'HR'
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const roleLabel = role.replace('_', ' ')

  const navGroups = useMemo(() => {
    const groups: {
      label: string
      items: {
        id: SidebarView
        label: string
        icon: LucideIcon
        path: string
        badgeCount?: number
        badgeType?: 'leave' | 'chat' | 'attendance'
      }[]
    }[] = [
      {
        label: 'OVERVIEW',
        items: [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard?view=overview' },
          { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/dashboard?view=chat', badgeCount: chatUnreadCount, badgeType: 'chat' },
          { id: 'assistant', label: 'AI Employee', icon: Sparkles, path: '/dashboard?view=assistant' },
        ],
      },
    ]

    if (canManage) {
      groups.push({
        label: 'MANAGEMENT',
        items: [
          { id: 'employees', label: 'Employees', icon: Users, path: '/dashboard?view=employees' },
          { id: 'departments', label: 'Departments', icon: Building2, path: '/dashboard?view=departments' },
        ],
      })
    }

    groups.push({
      label: 'TIME & WORK',
      items: [
        { id: 'attendance', label: 'Attendance', icon: Clock3, path: '/dashboard?view=attendance', badgeCount: attendanceUnreadCount, badgeType: 'attendance' },
        { id: 'leaves', label: 'Leave requests', icon: CalendarDays, path: '/dashboard?view=leaves', badgeCount: leaveUnreadCount, badgeType: 'leave' },
        { id: 'holidays', label: 'Holidays', icon: Calendar, path: '/dashboard?view=holidays' },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare2, path: '/dashboard?view=tasks' },
      ],
    })

    if (isAdmin) {
      groups.push({
        label: 'ADMINISTRATION',
        items: [
          { id: 'users', label: 'Users & Roles', icon: ShieldCheck, path: '/dashboard?view=users' },
          { id: 'system', label: 'System Diagnostics', icon: Server, path: '/dashboard?view=system' },
          { id: 'themes', label: 'Theme Settings', icon: Palette, path: '/dashboard?view=themes' },
        ],
      })
    }

    groups.push({
      label: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'My Profile', icon: UserCircle2, path: '/profile' },
      ],
    })

    return groups
  }, [canManage, isAdmin, leaveUnreadCount, chatUnreadCount, attendanceUnreadCount])

  const handleNavClick = (id: SidebarView, path: string) => {
    if (onSelectView) {
      onSelectView(id)
    } else {
      if (id === 'profile') {
        navigate('/profile')
      } else {
        navigate(path)
      }
    }
    setMobileSidebarOpen(false)
  }

  const handleConfirmLogout = async () => {
    setSigningOut(true)
    if (onLogout) {
      try {
        await onLogout()
      } finally {
        setSigningOut(false)
        setShowLogoutConfirm(false)
      }
      return
    }

    const token = readToken()
    try {
      if (token) {
        await logout(token).catch(() => {})
      }
    } finally {
      clearToken()
      sessionStorage.clear()
      toast.success('Signed out successfully.')
      navigate('/login', { replace: true })
      setSigningOut(false)
      setShowLogoutConfirm(false)
    }
  }

  return (
    <>
      <aside
        className={`workbench-sidebar sticky z-[5] top-0 flex h-screen min-w-0 flex-col p-0 text-[#e9eee7] bg-[#193c33] border-r border-white/[0.06] overflow-hidden transition-all duration-180 ease-in-out select-none ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[256px]'
        } ${className}`.trim()}
        aria-label="Workspace sidebar"
      >
        {/* Brand Header: Fixed 60px row, vertically centered with 1px border */}
        <div
          className={`sidebar-brand-row flex items-center justify-between h-[60px] min-h-[60px] px-4 border-b border-white/[0.06] shrink-0 ${
            sidebarCollapsed ? '!px-2 !justify-center' : ''
          }`}
        >
          {sidebarCollapsed ? (
            <button
              className="sidebar-toggle grid w-8 h-8 shrink-0 place-items-center border border-white/10 rounded-[8px] text-white/70 bg-transparent cursor-pointer hover:text-white hover:bg-white/[0.06] hover:border-white/20 transition-all duration-150"
              type="button"
              title="Expand sidebar"
              aria-label="Expand sidebar"
              onClick={() => setSidebarCollapsed(false)}
            >
              <PanelLeftOpen size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <>
              <Link
                className="workbench-brand flex items-center gap-2.5 text-inherit no-underline min-w-0"
                to="/dashboard"
                title="Snowflex People Operations"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span className="workbench-mark grid w-8 h-8 place-items-center rounded-[8px_8px_8px_2px] text-[#193c33] bg-[#d9ed74] shrink-0 shadow-sm">
                  <Snowflake size={18} strokeWidth={2.2} />
                </span>
                <span className="sidebar-brand-copy min-w-0 flex flex-col leading-none">
                  <span className="text-[14.5px] font-extrabold tracking-tight text-white font-sans">
                    snowflex
                  </span>
                  <span className="brand-caption block mt-1 text-white/45 font-mono text-[8px] tracking-[0.08em] uppercase">
                    PEOPLE OPERATIONS
                  </span>
                </span>
              </Link>

              <button
                className="sidebar-toggle grid w-8 h-8 shrink-0 place-items-center border border-white/10 rounded-[8px] text-white/70 bg-transparent cursor-pointer hover:text-white hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9ed74] focus-visible:outline-offset-2 transition-all duration-150"
                type="button"
                title={mobileSidebarOpen ? 'Close navigation' : 'Collapse sidebar'}
                aria-label={mobileSidebarOpen ? 'Close navigation' : 'Collapse sidebar'}
                aria-expanded={mobileSidebarOpen || !sidebarCollapsed}
                onClick={() => {
                  if (window.matchMedia('(max-width: 680px)').matches) {
                    setMobileSidebarOpen(false)
                  } else {
                    setSidebarCollapsed((c) => !c)
                  }
                }}
              >
                {mobileSidebarOpen ? (
                  <X size={17} strokeWidth={1.75} />
                ) : (
                  <Menu size={17} strokeWidth={1.75} />
                )}
              </button>
            </>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <nav
          className={`workbench-nav flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-[1px] py-2 [scrollbar-width:none] hover:[scrollbar-width:thin] hover:[scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full ${
            sidebarCollapsed ? 'px-2' : 'px-3'
          }`}
          aria-label="Workspace navigation"
        >
          {navGroups.map(({ label: groupLabel, items }, groupIndex) => (
            <div className="nav-group flex flex-col gap-[1px]" key={groupLabel}>
              {!sidebarCollapsed && (
                <div
                  className={`workspace-label px-3 font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-white/45 select-none ${
                    groupIndex === 0 ? 'pt-2.5 pb-1.5' : 'pt-4 pb-1.5'
                  }`}
                >
                  {groupLabel}
                </div>
              )}

              {items.map(({ id, label, icon: Icon, path, badgeCount, badgeType }) => {
                const isSelected = currentView === id

                return (
                  <button
                    key={id}
                    className={`nav-item group relative flex w-full h-[40px] min-h-[40px] items-center rounded-[10px] text-left text-[13px] font-medium cursor-pointer transition-all duration-150 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9ed74] focus-visible:outline-offset-2 ${
                      sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
                    } ${
                      isSelected
                        ? 'selected text-[#d9ed74] bg-[#d9ed74]/[0.12] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-r-[3px] before:bg-[#d9ed74] before:content-[\'\']'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                    }`}
                    title={sidebarCollapsed ? label : undefined}
                    aria-label={label}
                    onClick={() => handleNavClick(id, path)}
                    type="button"
                  >
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className={`shrink-0 transition-colors ${
                          isSelected ? 'text-[#d9ed74]' : 'text-white/60 group-hover:text-white'
                        }`}
                      />
                      {/* Compact dot badge in collapsed mode */}
                      {sidebarCollapsed && badgeCount && badgeCount > 0 ? (
                        <span
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-[#193c33] ${
                            badgeType === 'leave' || badgeType === 'attendance' ? 'bg-[#f43f5e]' : 'bg-[#d9ed74]'
                          }`}
                        />
                      ) : null}
                    </div>

                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 leading-none">{label}</span>

                        {/* Unread badge in expanded mode */}
                        {badgeCount && badgeCount > 0 ? (
                          <UnreadBadge
                            count={badgeCount}
                            className={badgeType === 'leave' || badgeType === 'attendance' ? 'sidebar-leave-badge ml-auto' : 'sidebar-chat-badge ml-auto'}
                          />
                        ) : null}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Status & Profile Area - Fixed at bottom */}
        <div
          className={`sidebar-bottom shrink-0 flex flex-col gap-3 p-3 mt-auto border-t border-white/[0.06] ${
            sidebarCollapsed ? '!p-2 !gap-2' : ''
          }`}
        >
          {/* Status Pill */}
          {!sidebarCollapsed ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70 text-[12px] w-fit select-none"
              title="Snowflake Connected Workspace • Live synchronization active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0 shadow-[0_0_6px_#10b981]" />
              <span className="font-medium text-[12px] tracking-tight text-white/80">Snowflake DB v2.4</span>
            </div>
          ) : (
            <div
              className="flex items-center justify-center py-1 select-none"
              title="Snowflake DB v2.4 • Connected"
            >
              <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
            </div>
          )}

          {/* Profile Card */}
          <div
            className={`profile-card group flex items-center h-[56px] rounded-[12px] p-3 gap-3 bg-white/[0.04] border border-white/[0.06] text-white text-left cursor-pointer hover:bg-white/[0.07] hover:border-white/10 transition-all duration-150 ${
              currentView === 'profile' ? 'bg-white/[0.08] border-white/15' : ''
            } ${sidebarCollapsed ? '!p-2 !justify-center !h-[48px]' : ''}`}
            onClick={() => handleNavClick('profile', '/profile')}
            title="My Profile & Security"
          >
            <UserAvatar
              name={user?.fullName || 'User'}
              avatarUrl={user?.avatarUrl}
              size={36}
              className="profile-avatar shrink-0 rounded-full ring-1 ring-white/10"
            />
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
                  <span className="text-[14px] font-semibold text-white truncate">
                    {user?.fullName || 'User'}
                  </span>
                  <span className="text-[11px] text-white/50 font-mono uppercase tracking-wider truncate mt-0.5">
                    {roleLabel}
                  </span>
                </div>

                <button
                  type="button"
                  className="sidebar-logout-icon-btn grid w-7 h-7 place-items-center rounded-[8px] text-white/50 hover:text-[#f87171] hover:bg-white/[0.08] transition-all duration-150 cursor-pointer ml-auto shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowLogoutConfirm(true)
                  }}
                  title="Sign out of Snowflex"
                  aria-label="Sign out"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <button
          className="mobile-sidebar-backdrop fixed inset-0 z-[40] bg-[rgba(10,24,20,0.55)] backdrop-blur-[2px] border-0 cursor-pointer animate-[fade-in_150ms_ease]"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Self-contained Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="modal-overlay fixed inset-0 z-[9999] grid place-items-center bg-[rgba(10,24,20,0.6)] backdrop-blur-[3px] p-[20px] animate-[fade-in_150ms_ease]"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-logout-modal-title"
        >
          <div
            className="modal w-[min(100%,380px)] border border-[#e2e8df] dark:border-[#27372e] rounded-[10px] bg-white dark:bg-[#19231e] shadow-[0_24px_50px_rgba(0,0,0,0.25)] animate-[slide-up_180ms_ease] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb] dark:border-[#25352c]">
              <h3
                id="sidebar-logout-modal-title"
                className="m-0 text-[#243a33] dark:text-[#f1f7f2] font-bold text-[16px] font-sans"
              >
                Sign Out
              </h3>
              <button
                className="modal-close grid w-[30px] h-[30px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33] dark:hover:bg-[#25352c] dark:hover:text-white transition-colors"
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="modal-body m-0 p-[20px] text-[#546a5d] dark:text-[#a1b3a7] text-[14px] leading-[1.5]">
              Are you sure you want to end your Snowflex session? You will need to enter your credentials to log in again.
            </p>

            <div className="modal-footer flex justify-end gap-[10px] p-[16px_20px] border-t border-[#edf0eb] dark:border-[#25352c] bg-[#fafcfa] dark:bg-[#141c18]">
              <button
                className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[8px] border border-[#d6dfd3] dark:border-[#2d4035] rounded-[5px] text-[#42554a] dark:text-[#c4d6c9] bg-white dark:bg-[#19231e] font-sans text-[13px] font-semibold cursor-pointer hover:bg-[#f3f6ef] dark:hover:bg-[#25352c] transition-colors"
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={signingOut}
              >
                Cancel
              </button>

              <button
                className="primary-button danger inline-flex items-center gap-[6px] px-[14px] py-[8px] border border-[#dc2626] rounded-[5px] text-white bg-[#dc2626] font-sans text-[13px] font-semibold cursor-pointer hover:bg-[#b91c1c] transition-colors disabled:opacity-60 disabled:cursor-wait shadow-sm"
                type="button"
                onClick={handleConfirmLogout}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
