import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Clock3, CalendarDays,
  CheckSquare2, Sparkles, ChevronRight, LogOut,
  Menu, X, CircleHelp, UserCircle2, KeyRound,
  ShieldCheck, Server, AlertCircle, Snowflake, PanelLeftOpen
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import ProfileHeader from '../components/ProfileHeader'
import ProfileForm from '../components/ProfileForm'
import ChangePasswordForm from '../components/ChangePasswordForm'
import LogoutButton from '../components/LogoutButton'
import TopProfileDropdown from '../components/TopProfileDropdown'
import NotificationBell from '../components/NotificationBell'
import UnreadBadge from '../components/UnreadBadge'
import UserAvatar from '../components/UserAvatar'
import { useNotifications } from '../hooks/useNotifications'
import { clearToken, getCurrentUser, readToken, type SafeUser } from '../lib/auth-api'
import { useProfile } from '../hooks/useProfile'

export default function Profile() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { leaveUnreadCount } = useNotifications()

  // Load profile via useProfile hook
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    update: updateProfileData,
    uploadPhoto,
    removePhoto,
    refresh: refreshProfile,
  } = useProfile(token)

  useEffect(() => {
    let active = true
    const currentToken = readToken()
    if (!currentToken) {
      navigate('/login', { replace: true })
      return () => { active = false }
    }
    setToken(currentToken)
    getCurrentUser(currentToken)
      .then((user) => {
        if (!active) return
        setCurrentUser(user)
      })
      .catch((err) => {
        clearToken()
        toast.error(err instanceof Error ? err.message : 'Session expired.')
        navigate('/login', { replace: true })
      })
    return () => { active = false }
  }, [navigate])

  const handleSaveProfile = async (payload: Parameters<typeof updateProfileData>[0]) => {
    const updated = await updateProfileData(payload)
    // Update local currentUser so sidebar name and avatar immediately reflect changes
    setCurrentUser((prev) =>
      prev ? { ...prev, fullName: updated.fullName, email: updated.email } : null
    )
    return updated
  }

  const handleUploadAvatar = async (file: File) => {
    const avatarUrl = await uploadPhoto(file)
    setCurrentUser((prev) =>
      prev ? { ...prev, avatarUrl } : null
    )
    return avatarUrl
  }

  const handleRemoveAvatar = async () => {
    await removePhoto()
    setCurrentUser((prev) =>
      prev ? { ...prev, avatarUrl: null } : null
    )
  }

  const role = currentUser?.role || 'EMPLOYEE'
  const isEmployee = role === 'EMPLOYEE'
  const canManage = role === 'ADMIN' || role === 'HR'

  const navGroups = [
    {
      label: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard, path: '/dashboard?view=overview' },
        { id: 'assistant', label: 'AI Workspace Agent', icon: Sparkles, path: '/dashboard?view=assistant' },
      ],
    },
    {
      label: 'PEOPLE OPS',
      items: [
        ...(canManage ? [
          { id: 'employees', label: 'Employee Directory', icon: Users, path: '/dashboard?view=employees' },
          { id: 'departments', label: 'Departments', icon: Building2, path: '/dashboard?view=departments' },
        ] : []),
        { id: 'attendance', label: 'Attendance Tracking', icon: Clock3, path: '/dashboard?view=attendance' },
        { id: 'leaves', label: isEmployee ? 'Request Leave' : 'Leave Administration', icon: CalendarDays, path: '/dashboard?view=leaves' },
        { id: 'tasks', label: 'Task Deliverables', icon: CheckSquare2, path: '/dashboard?view=tasks' },
      ],
    },
    ...(role === 'ADMIN' ? [{
      label: 'ADMINISTRATION',
      items: [
        { id: 'users', label: 'Users & Roles', icon: ShieldCheck, path: '/dashboard?view=users' },
        { id: 'system', label: 'System Diagnostics', icon: Server, path: '/dashboard?view=system' },
      ],
    }] : []),
    {
      label: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'My Profile', icon: UserCircle2, path: '/profile' },
      ],
    },
  ]

  return (
    <main
      className={`workbench${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${
        mobileSidebarOpen ? ' is-mobile-sidebar-open' : ''
      }`}
    >
      {/* Workspace Sidebar - Exactly matching Dashboard layout */}
      <aside className="workbench-sidebar" aria-label="Workspace sidebar">
        <div className="sidebar-brand-row">
          <Link className="workbench-brand" to="/dashboard" title="Snowflex People Operations">
            <Snowflake className="workbench-mark" size={20} strokeWidth={2.5} />
            <span className="sidebar-brand-copy">
              snowflex
              <span className="brand-caption">PEOPLE OPERATIONS</span>
            </span>
          </Link>
          <button
            className="sidebar-toggle"
            type="button"
            title={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={mobileSidebarOpen || !sidebarCollapsed}
            onClick={() => {
              if (window.matchMedia('(max-width: 680px)').matches) setMobileSidebarOpen(false)
              else setSidebarCollapsed((collapsed) => !collapsed)
            }}
          >
            {mobileSidebarOpen ? <X size={19} /> : sidebarCollapsed ? <PanelLeftOpen size={17} /> : <Menu size={19} />}
          </button>
        </div>

        <nav className="workbench-nav" aria-label="Workspace navigation">
          {navGroups.map(({ label: groupLabel, items }, groupIndex) => (
            <div className="nav-group" key={groupLabel}>
              <div className="workspace-label">{groupLabel}</div>
              {items.map(({ id, label, icon: Icon, path }) => (
                <button
                  key={id}
                  className={id === 'profile' ? 'nav-item selected' : 'nav-item'}
                  title={sidebarCollapsed ? label : undefined}
                  aria-label={label}
                  onClick={() => {
                    if (id === 'profile') {
                      setActiveTab('info')
                    } else {
                      navigate(path)
                    }
                    setMobileSidebarOpen(false)
                  }}
                  type="button"
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  {id === 'leaves' && <UnreadBadge count={leaveUnreadCount} className="sidebar-leave-badge" />}
                  {id === 'profile' && <ChevronRight className="nav-chevron" size={15} />}
                </button>
              ))}
              {groupIndex < navGroups.length - 1 && <div className="nav-separator" />}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-row" title="Snowflake Connected Workspace">
            <CircleHelp size={16} />
            <span>Snowflake DB v2.4</span>
          </div>
          <div
            className="profile-chip"
            style={{ cursor: 'pointer' }}
            title="My Profile & Security"
            onClick={() => setActiveTab('info')}
          >
            <UserAvatar name={currentUser?.fullName || 'User'} avatarUrl={currentUser?.avatarUrl} size={34} className="profile-avatar" />
            <span className="profile-copy">
              <strong>{currentUser?.fullName || 'User'}</strong>
              <small>{role}</small>
            </span>
            <button
              type="button"
              className="sidebar-logout-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowLogoutConfirm(true)
              }}
              title="Sign out"
            >
              <LogOut size={16} aria-label="Sign out" />
            </button>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <button
          className="mobile-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Stage */}
      <section className="workbench-main">
        {/* Top Header Bar */}
        <header className="workbench-topbar">
          <div className="topbar-location">
            <button
              className="mobile-sidebar-open-button"
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <Link to="/dashboard" className="breadcrumb" style={{ textDecoration: 'none' }}>
              Dashboard
            </Link>
            <span className="breadcrumb-divider">/</span>
            <strong>My Profile</strong>
          </div>

          <div className="topbar-actions">
            <div className="dash-snowflake-pill" title="Live Snowflake Connection">
              <span className="dash-pulse-dot" />
              <span>Snowflake Live</span>
            </div>
            <span className="today-label">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <NotificationBell />
            <ThemeToggle className="topbar-theme-toggle" />
            <TopProfileDropdown user={currentUser} />
          </div>
        </header>

        {/* Profile Page Content */}
        <div className="page-content profile-page-content">
          <div className="page-heading">
            <div>
              <div className="section-kicker">PERSONAL IDENTITY & ACCESS CONTROL</div>
              <h1>My Profile</h1>
              <p>Manage your employee details, contact info, and Snowflake credentials.</p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary-action"
                type="button"
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={14} />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>

          {profileError && (
            <div className="notice error-notice" role="alert">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          {/* Responsive Two-Column Profile Layout */}
          <div className="profile-layout-grid">
            {/* Left Column: Profile Card */}
            <div className="profile-left-col">
              {profileLoading ? (
                <div className="profile-header-card profile-card-loading">
                  <div className="profile-header-cover" />
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div className="skeleton-bar" style={{ width: '96px', height: '96px', borderRadius: '50%' }} />
                    <div className="skeleton-bar" style={{ width: '180px', height: '22px', borderRadius: '4px' }} />
                    <div className="skeleton-bar" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
                  </div>
                </div>
              ) : profile ? (
                <ProfileHeader
                  profile={profile}
                  onUploadAvatar={handleUploadAvatar}
                  onRemoveAvatar={handleRemoveAvatar}
                />
              ) : null}
            </div>

            {/* Right Column: Tabbed Forms */}
            <div className="profile-right-col">
              <div className="profile-tabs-bar">
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  <UserCircle2 size={16} />
                  <span>Personal Details</span>
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <KeyRound size={16} />
                  <span>Security & Password</span>
                </button>
              </div>

              {activeTab === 'info' && profile && (
                <ProfileForm
                  profile={profile}
                  onSave={handleSaveProfile}
                  loading={profileLoading}
                />
              )}

              {activeTab === 'security' && (
                <ChangePasswordForm
                  token={token || ''}
                  hasPassword={profile?.hasPassword ?? true}
                  onPasswordChanged={refreshProfile}
                />
              )}
            </div>
          </div>

          <footer className="content-foot">
            <span>Snowflex People Operations Platform • Identity & Access Control</span>
            <span>Connected to Snowflake <span className="connection-dot" /></span>
          </footer>
        </div>
      </section>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-logout-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="sidebar-logout-title">Sign Out</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--text-sub, #4b5563)', fontSize: '14px', lineHeight: 1.5 }}>
                Are you sure you want to sign out of Snowflex People Operations?
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <LogoutButton variant="danger" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
