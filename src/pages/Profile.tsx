import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Menu, AlertCircle, LayoutDashboard, UserCircle2, KeyRound
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import ThemeToggle from '../components/ThemeToggle'
import ProfileHeader from '../components/ProfileHeader'
import ProfileForm from '../components/ProfileForm'
import ChangePasswordForm from '../components/ChangePasswordForm'
import TopProfileDropdown from '../components/TopProfileDropdown'
import NotificationBell from '../components/NotificationBell'
import Sidebar from '../components/Sidebar'
import { useNotifications } from '../hooks/useNotifications'
import { clearToken, getCurrentUser, readToken, type SafeUser } from '../lib/auth-api'
import { AVATAR_UPDATED_EVENT } from '../lib/avatar'
import { useProfile } from '../hooks/useProfile'
import { Skeleton } from '../components/Skeleton'

export default function Profile() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
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

  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl: string | null }>
      const newAvatarUrl = customEvent.detail?.avatarUrl ?? null
      setCurrentUser((prev) => prev ? { ...prev, avatarUrl: newAvatarUrl } : null)
    }
    window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate)
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate)
  }, [])

  const handleUploadAvatar = async (file: File) => {
    const avatarUrl = await uploadPhoto(file)
    setPendingAvatarFile(null)
    setCurrentUser((prev) =>
      prev ? { ...prev, avatarUrl } : null
    )
    return avatarUrl
  }

  const handleRemoveAvatar = async () => {
    await removePhoto()
    setPendingAvatarFile(null)
    setCurrentUser((prev) =>
      prev ? { ...prev, avatarUrl: null } : null
    )
  }

  const handleSaveProfile = async (payload: Parameters<typeof updateProfileData>[0]) => {
    let latestAvatarUrl = profile?.avatarUrl ?? currentUser?.avatarUrl ?? null
    if (pendingAvatarFile) {
      try {
        latestAvatarUrl = await handleUploadAvatar(pendingAvatarFile)
        setPendingAvatarFile(null)
      } catch (avatarErr) {
        console.error('Failed to upload pending avatar:', avatarErr)
      }
    }
    const updated = await updateProfileData(payload)
    // Update local currentUser so sidebar name and avatar immediately reflect changes
    setCurrentUser((prev) =>
      prev ? { ...prev, fullName: updated.fullName, email: updated.email, avatarUrl: updated.avatarUrl ?? latestAvatarUrl } : null
    )
    return updated
  }

  return (
    <main
      className={`workbench${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${
        mobileSidebarOpen ? ' is-mobile-sidebar-open' : ''
      }`}
    >
      {/* Workspace Sidebar */}
      <Sidebar
        currentView="profile"
        onSelectView={(viewId) => {
          if (viewId === 'profile') {
            setActiveTab('info')
          } else {
            navigate(`/dashboard?view=${viewId}`)
          }
        }}
        user={currentUser}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        leaveUnreadCount={leaveUnreadCount}
      />

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
        <div className="page-content profile-page-content max-w-[1360px] mx-auto pb-[48px]">
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
          <div className="profile-layout-grid grid grid-cols-[360px_minmax(0,1fr)] max-[1060px]:grid-cols-[minmax(0,1fr)] gap-[28px] max-[1060px]:gap-[24px] items-start">
            {/* Left Column: Profile Card */}
            <div className="profile-left-col sticky top-[80px] max-[1060px]:static">
              {profileLoading ? (
                <div className="profile-header-card profile-card-loading">
                  <div className="profile-header-cover" />
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <Skeleton variant="circular" width={96} height={96} />
                    <Skeleton variant="rounded" width={180} height={22} />
                    <Skeleton variant="text" width={120} height={14} />
                  </div>
                </div>
              ) : profile ? (
                <ProfileHeader
                  profile={profile}
                  onUploadAvatar={handleUploadAvatar}
                  onRemoveAvatar={handleRemoveAvatar}
                  onPendingAvatarChange={setPendingAvatarFile}
                />
              ) : null}
            </div>

            {/* Right Column: Tabbed Forms */}
            <div className="profile-right-col min-w-0">
              <div className="profile-tabs-bar flex items-center gap-[6px] mb-[20px] border-b border-[#dce2d7] dark:border-[#27372e] pb-0">
                <button
                  type="button"
                  className={`profile-tab-btn inline-flex items-center gap-[8px] px-[18px] py-[10px] text-[13px] font-bold border-0 border-b-[3px] cursor-pointer transition-all -mb-[1px] rounded-t-[6px] ${
                    activeTab === 'info'
                      ? 'active text-[#10b981] dark:text-[#d9ed74] border-b-[#10b981] dark:border-b-[#d9ed74] bg-white dark:bg-transparent'
                      : 'text-[#55675c] dark:text-[#8c9d92] border-transparent bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74] hover:bg-[rgba(25,60,51,0.04)]'
                  }`}
                  onClick={() => setActiveTab('info')}
                >
                  <UserCircle2 size={16} />
                  <span>Personal Details</span>
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn inline-flex items-center gap-[8px] px-[18px] py-[10px] text-[13px] font-bold border-0 border-b-[3px] cursor-pointer transition-all -mb-[1px] rounded-t-[6px] ${
                    activeTab === 'security'
                      ? 'active text-[#10b981] dark:text-[#d9ed74] border-b-[#10b981] dark:border-b-[#d9ed74] bg-white dark:bg-transparent'
                      : 'text-[#55675c] dark:text-[#8c9d92] border-transparent bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74] hover:bg-[rgba(25,60,51,0.04)]'
                  }`}
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
                  hasPendingAvatar={Boolean(pendingAvatarFile)}
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
    </main>
  )
}
