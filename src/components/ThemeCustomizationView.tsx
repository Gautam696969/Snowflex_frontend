import { useState, useEffect, useMemo } from 'react'
import {
  Palette,
  Sparkles,
  Shield,
  ShieldAlert,
  Check,
  RotateCcw,
  Eye,
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RefreshCw,
  CheckCheck,
  Sun,
  Moon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { SafeUser } from '../lib/auth-api'
import {
  getUserTheme,
  setUserTheme,
  resetUserTheme,
  bulkSetThemeByRole,
  type UserTheme,
  type SetThemeInput,
} from '../lib/theme-api'
import {
  THEME_PRESETS,
  isValidHex,
  normalizeHex,
  isWcagAaCompliant,
  getAccessibleTextColor,
} from '../lib/theme-utils'
import { useTheme } from '../lib/theme'
import UserAvatar from './UserAvatar'

export interface ThemeCustomizationViewProps {
  currentUser: SafeUser
  token: string
  users: SafeUser[]
  onRefreshUsers?: () => void
}

export const DEFAULT_LIGHT_THEME: SetThemeInput = {
  mode: 'light',
  bgColor: '#f4f6f1',
  primaryColor: '#193c33',
  accentColor: '#ed6b4f',
  sidebarColor: '#193c33',
  cardColor: '#ffffff',
  textColor: '#20251f',
}

export const DEFAULT_DARK_THEME: SetThemeInput = {
  mode: 'dark',
  bgColor: '#141a17',
  primaryColor: '#d9ed74',
  accentColor: '#ed6b4f',
  sidebarColor: '#193c33',
  cardColor: '#1d2621',
  textColor: '#e7eee8',
}

const DEFAULT_THEME_INPUT: SetThemeInput = DEFAULT_LIGHT_THEME

export default function ThemeCustomizationView({
  currentUser,
  token,
  users,
  onRefreshUsers,
}: ThemeCustomizationViewProps) {
  const { applyCustomTheme } = useTheme()
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN'
  const isAdmin = currentUser.role === 'ADMIN'

  // State
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null)
  const [targetScope, setTargetScope] = useState<'USER' | 'ROLE'>('USER')
  const [bulkRole, setBulkRole] = useState<string>('EMPLOYEE')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [loadingTheme, setLoadingTheme] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  // Current editor theme values
  const [themeInput, setThemeInput] = useState<SetThemeInput>(DEFAULT_THEME_INPUT)
  const [originalUserTheme, setOriginalUserTheme] = useState<UserTheme | null>(null)

  // Initial selection: select the first editable user or current user
  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      // Find current user or first allowed user
      const self = users.find((u) => u.id === currentUser.id)
      if (self) {
        setSelectedUser(self)
      } else {
        setSelectedUser(users[0])
      }
    }
  }, [users, currentUser.id, selectedUser])

  // Check if current user can edit target user's theme
  const canEditUser = (target: SafeUser): boolean => {
    if (isSuperAdmin) return true
    if (isAdmin) {
      // Admin cannot edit Super Admin
      if (target.role === 'SUPER_ADMIN') return false
      return true
    }
    return false
  }

  // Check if current user can bulk edit target role
  const canBulkEditRole = (role: string): boolean => {
    if (isSuperAdmin) return true
    if (isAdmin) {
      return role !== 'SUPER_ADMIN' && role !== 'ADMIN'
    }
    return false
  }

  // Load theme when selected user changes
  useEffect(() => {
    if (!selectedUser || targetScope !== 'USER') return

    let cancelled = false
    setLoadingTheme(true)

    getUserTheme(token, selectedUser.id)
      .then((theme) => {
        if (cancelled) return
        setOriginalUserTheme(theme)
        if (theme) {
          const isDark = theme.mode === 'dark'
          const fallback = isDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME
          setThemeInput({
            mode: theme.mode || 'light',
            bgColor: theme.bgColor || fallback.bgColor,
            primaryColor: theme.primaryColor || fallback.primaryColor,
            accentColor: theme.accentColor || fallback.accentColor,
            sidebarColor: theme.sidebarColor || fallback.sidebarColor,
            cardColor: theme.cardColor || fallback.cardColor,
            textColor: theme.textColor || fallback.textColor,
          })
        } else {
          setThemeInput(DEFAULT_THEME_INPUT)
        }
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(err instanceof Error ? err.message : 'Failed to fetch user theme')
      })
      .finally(() => {
        if (!cancelled) setLoadingTheme(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedUser, token, targetScope])

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  // Real-time contrast checks
  const contrastCheck = useMemo(() => {
    const text = themeInput.textColor || '#20251f'
    const card = themeInput.cardColor || '#ffffff'
    const bg = themeInput.bgColor || '#f4f6f1'

    const onCard = isWcagAaCompliant(text, card)
    const onBg = isWcagAaCompliant(text, bg)

    return {
      onCard,
      onBg,
      hasWarning: !onCard.compliant || !onBg.compliant,
    }
  }, [themeInput])

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!originalUserTheme) {
      return (
        themeInput.mode !== DEFAULT_THEME_INPUT.mode ||
        themeInput.bgColor !== DEFAULT_THEME_INPUT.bgColor ||
        themeInput.primaryColor !== DEFAULT_THEME_INPUT.primaryColor ||
        themeInput.accentColor !== DEFAULT_THEME_INPUT.accentColor ||
        themeInput.sidebarColor !== DEFAULT_THEME_INPUT.sidebarColor ||
        themeInput.cardColor !== DEFAULT_THEME_INPUT.cardColor ||
        themeInput.textColor !== DEFAULT_THEME_INPUT.textColor
      )
    }

    return (
      (themeInput.mode || null) !== (originalUserTheme.mode || null) ||
      (themeInput.bgColor || null) !== (originalUserTheme.bgColor || null) ||
      (themeInput.primaryColor || null) !== (originalUserTheme.primaryColor || null) ||
      (themeInput.accentColor || null) !== (originalUserTheme.accentColor || null) ||
      (themeInput.sidebarColor || null) !== (originalUserTheme.sidebarColor || null) ||
      (themeInput.cardColor || null) !== (originalUserTheme.cardColor || null) ||
      (themeInput.textColor || null) !== (originalUserTheme.textColor || null)
    )
  }, [themeInput, originalUserTheme])

  // Field change handler
  const handleColorChange = (field: keyof SetThemeInput, value: string) => {
    setThemeInput((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Apply a preset
  const handleApplyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    setThemeInput({
      mode: preset.mode || 'light',
      bgColor: preset.bgColor,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      sidebarColor: preset.sidebarColor,
      cardColor: preset.cardColor,
      textColor: preset.textColor,
    })
    toast.success(`Preset "${preset.name}" loaded into preview!`, { id: 'preset-applied' })
  }

  // Auto-fix contrast
  const handleAutoFixContrast = () => {
    const cardBg = themeInput.cardColor || '#ffffff'
    const bestTextColor = getAccessibleTextColor(cardBg)
    setThemeInput((prev) => ({
      ...prev,
      textColor: bestTextColor,
    }))
    toast.success(`Auto-adjusted text color to ${bestTextColor} for maximum contrast!`)
  }

  // Save theme for individual user
  const handleSaveUserTheme = async () => {
    if (!selectedUser) return
    if (!canEditUser(selectedUser)) {
      if (selectedUser.role === 'SUPER_ADMIN') {
        toast.error('Permission denied: Administrators cannot modify themes or display mode for Super Admins.')
      } else {
        toast.error('Permission denied: You cannot modify this user’s theme.')
      }
      return
    }

    // Validate hex codes (skip 'mode' field which is 'light' | 'dark')
    for (const [key, val] of Object.entries(themeInput)) {
      if (key === 'mode') continue
      if (val && !isValidHex(val)) {
        toast.error(`Invalid hex color format for ${key}: ${val}`)
        return
      }
    }

    setSaving(true)
    try {
      const updated = await setUserTheme(token, selectedUser.id, themeInput)
      setOriginalUserTheme(updated)
      toast.success(`Theme successfully updated for ${selectedUser.fullName}!`)

      // If updating current user, apply immediately to active session
      if (selectedUser.id === currentUser.id) {
        applyCustomTheme(updated)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save theme.')
    } finally {
      setSaving(false)
    }
  }

  // Reset theme for individual user
  const handleResetUserTheme = async () => {
    if (!selectedUser) return
    if (!canEditUser(selectedUser)) {
      toast.error('Permission denied: You cannot reset this user’s theme.')
      return
    }

    setResetting(true)
    try {
      await resetUserTheme(token, selectedUser.id)
      setOriginalUserTheme(null)
      setThemeInput(DEFAULT_THEME_INPUT)
      setShowResetConfirm(false)
      toast.success(`Theme reset to default for ${selectedUser.fullName}!`)

      if (selectedUser.id === currentUser.id) {
        applyCustomTheme(null)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset theme.')
    } finally {
      setResetting(false)
    }
  }

  // Bulk apply theme to all users in a role
  const handleBulkApply = async () => {
    if (!canBulkEditRole(bulkRole)) {
      if (bulkRole === 'SUPER_ADMIN') {
        toast.error('Permission denied: Administrators cannot modify themes or display mode for Super Admins.')
      } else {
        toast.error(`Permission denied: You cannot bulk update themes for role "${bulkRole}".`)
      }
      return
    }

    // Validate hex codes (skip 'mode' field)
    for (const [key, val] of Object.entries(themeInput)) {
      if (key === 'mode') continue
      if (val && !isValidHex(val)) {
        toast.error(`Invalid hex color format for ${key}: ${val}`)
        return
      }
    }

    setSaving(true)
    try {
      const result = await bulkSetThemeByRole(token, bulkRole, themeInput)
      setShowBulkConfirm(false)
      toast.success(`Theme applied to all ${result.count} users in role "${bulkRole}"!`)

      // If current user is in this role, update current session theme
      if (currentUser.role === bulkRole) {
        applyCustomTheme(result.theme)
      }
      if (onRefreshUsers) onRefreshUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk theme update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-emerald-900/10 dark:border-white/10 bg-gradient-to-r from-emerald-900/5 via-teal-900/5 to-transparent dark:from-emerald-950/30 dark:to-transparent">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-800 text-emerald-200 dark:bg-emerald-600/30 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-sm">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Role-Based Theme Customization
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Shield className="w-3 h-3" />
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              {isSuperAdmin
                ? 'Super Admin privileges active: You can customize color themes for all users and bulk-assign to roles.'
                : 'Admin privileges active: You can customize themes for Managers, HR, Employees, and your own account. Super Admin themes are protected.'}
            </p>
          </div>
        </div>

        {/* Scope selector tabs */}
        <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800/80 p-1 rounded-lg text-xs font-semibold self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setTargetScope('USER')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              targetScope === 'USER'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Individual User
          </button>
          <button
            type="button"
            onClick={() => setTargetScope('ROLE')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              targetScope === 'ROLE'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Bulk by Role
          </button>
        </div>
      </div>

      {/* Main Grid: User List on Left (if Individual), Editor & Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scope Selection */}
        <div className="lg:col-span-5 space-y-4">
          {targetScope === 'USER' ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Select Target User
                  </h3>
                  <span className="text-[11px] font-medium text-zinc-500">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                  </span>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {['ALL', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-all ${
                        roleFilter === r
                          ? 'bg-emerald-800 text-white dark:bg-emerald-600'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* User List */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[480px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    No users matching criteria.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.id === user.id
                    const canEdit = canEditUser(user)
                    const isSelf = user.id === currentUser.id

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={user.fullName}
                            avatarUrl={user.avatarUrl}
                            size={34}
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {user.fullName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate block">
                              {user.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              user.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                : user.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                : user.role === 'MANAGER'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : user.role === 'HR'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            {user.role.replace('_', ' ')}
                          </span>

                          {!canEdit && (
                            <span
                              title="Super Admin theme is protected from modification by Admin"
                              className="inline-flex items-center text-zinc-400"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            /* Bulk by Role Picker */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Bulk Role Assignment
                </h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Applying a theme in bulk will overwrite the workspace color palette for all users
                assigned to the chosen role.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Choose Target Role:
                </label>
                <div className="space-y-1.5">
                  {(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'] as const).map((r) => {
                    const allowed = canBulkEditRole(r)
                    const count = users.filter((u) => u.role === r).length

                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={!allowed}
                        onClick={() => setBulkRole(r)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all ${
                          !allowed
                            ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
                            : bulkRole === r
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                            : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>{r.replace('_', ' ')}</span>
                          {!allowed && (
                            <span className="text-[10px] text-amber-600 font-normal">
                              (Protected)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-normal text-zinc-500">
                          {count} {count === 1 ? 'user' : 'users'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Curated Theme Presets
              </h4>
              <span className="text-[11px] text-zinc-500">Click to preview</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/40 hover:border-emerald-500 dark:hover:border-emerald-400 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ background: p.primaryColor }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ background: p.accentColor }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ background: p.sidebarColor }}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Color Pickers & Live Preview */}
        <div className="lg:col-span-7 space-y-5">
          {/* Editor Header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  {targetScope === 'USER'
                    ? selectedUser
                      ? `Customize Theme for ${selectedUser.fullName}`
                      : 'Select a user'
                    : `Bulk Theme for All "${bulkRole.replace('_', ' ')}" Users`}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Adjust background, primary, accent, and card tokens. Changes are live in the
                  preview below.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {loadingTheme && (
                  <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Loading theme...
                  </span>
                )}
                {originalUserTheme && targetScope === 'USER' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Custom Theme Active
                  </span>
                )}
              </div>
            </div>

            {/* Read-only warning if Admin viewing Super Admin */}
            {targetScope === 'USER' && selectedUser && !canEditUser(selectedUser) && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Super Admin Protection Active:</strong>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                    Administrators cannot modify the theme of Super Admin users. All controls below
                    are read-only for this target.
                  </p>
                </div>
              </div>
            )}

            {/* Workspace Mode: Light vs Dark Mode */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {themeInput.mode === 'dark' ? (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    Workspace Display Mode (Light / Dark)
                  </label>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Control whether this user's interface renders in light mode or dark mode.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                  <button
                    type="button"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    onClick={() => {
                      if (targetScope === 'USER' && selectedUser && !canEditUser(selectedUser)) {
                        toast.error('Permission denied: Administrators cannot modify themes or display mode for Super Admins.')
                        return
                      }
                      setThemeInput((prev) => ({
                        ...prev,
                        mode: 'light',
                        // If colors were dark (either Snowflex dark or previous slate), set authentic Snowflex classic light
                        bgColor: (!prev.bgColor || prev.bgColor === '#141a17' || prev.bgColor === '#0f172a' || prev.bgColor === '#1c2520') ? '#f4f6f1' : prev.bgColor,
                        cardColor: (!prev.cardColor || prev.cardColor === '#1d2621' || prev.cardColor === '#1e293b' || prev.cardColor === '#19231d') ? '#ffffff' : prev.cardColor,
                        textColor: (!prev.textColor || prev.textColor === '#e7eee8' || prev.textColor === '#f1f5f9' || prev.textColor === '#edf2ec') ? '#20251f' : prev.textColor,
                        primaryColor: (!prev.primaryColor || prev.primaryColor === '#d9ed74' || prev.primaryColor === '#38bdf8') ? '#193c33' : prev.primaryColor,
                      }))
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      themeInput.mode === 'light'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    } disabled:opacity-50`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Light Mode
                  </button>
                  <button
                    type="button"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    onClick={() => {
                      if (targetScope === 'USER' && selectedUser && !canEditUser(selectedUser)) {
                        toast.error('Permission denied: Administrators cannot modify themes or display mode for Super Admins.')
                        return
                      }
                      setThemeInput((prev) => ({
                        ...prev,
                        mode: 'dark',
                        // If colors were light or slate, set authentic Snowflex forest dark tokens
                        bgColor: (!prev.bgColor || prev.bgColor === '#f4f6f1' || prev.bgColor === '#ffffff' || prev.bgColor === '#f8fafc' || prev.bgColor === '#f0fdf4' || prev.bgColor === '#0f172a') ? '#141a17' : prev.bgColor,
                        cardColor: (!prev.cardColor || prev.cardColor === '#ffffff' || prev.cardColor === '#1e293b') ? '#1d2621' : prev.cardColor,
                        textColor: (!prev.textColor || prev.textColor === '#20251f' || prev.textColor === '#0f172a' || prev.textColor === '#f1f5f9') ? '#e7eee8' : prev.textColor,
                        primaryColor: (!prev.primaryColor || prev.primaryColor === '#193c33') ? '#d9ed74' : prev.primaryColor,
                      }))
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      themeInput.mode === 'dark'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    } disabled:opacity-50`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Dark Mode
                  </button>
                </div>
              </div>
            </div>

            {/* Color Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>App Canvas Background</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {themeInput.bgColor || '#f4f6f1'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.bgColor || '#f4f6f1')}
                    onChange={(e) => handleColorChange('bgColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.bgColor || ''}
                    placeholder="#f4f6f1"
                    onChange={(e) => handleColorChange('bgColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Primary Brand Color</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {themeInput.primaryColor || '#193c33'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.primaryColor || '#193c33')}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.primaryColor || ''}
                    placeholder="#193c33"
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Accent / Highlights</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {themeInput.accentColor || '#ed6b4f'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.accentColor || '#ed6b4f')}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.accentColor || ''}
                    placeholder="#ed6b4f"
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Sidebar Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Sidebar Navigation</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {themeInput.sidebarColor || '#193c33'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.sidebarColor || '#193c33')}
                    onChange={(e) => handleColorChange('sidebarColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.sidebarColor || ''}
                    placeholder="#193c33"
                    onChange={(e) => handleColorChange('sidebarColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Card Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Panel & Card Background</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {themeInput.cardColor || '#ffffff'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.cardColor || '#ffffff')}
                    onChange={(e) => handleColorChange('cardColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.cardColor || ''}
                    placeholder="#ffffff"
                    onChange={(e) => handleColorChange('cardColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Content Text Color
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFixContrast}
                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> Auto
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={normalizeHex(themeInput.textColor || '#20251f')}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-10 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                  <input
                    type="text"
                    disabled={targetScope === 'USER' && selectedUser ? !canEditUser(selectedUser) : false}
                    value={themeInput.textColor || ''}
                    placeholder="#20251f"
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* WCAG AA Contrast Evaluation Bar */}
            <div className="p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                {contrastCheck.hasWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    WCAG AA Contrast Check:
                  </span>{' '}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Card Text: {contrastCheck.onCard.ratio}:1 ({contrastCheck.onCard.level}) • Canvas:{' '}
                    {contrastCheck.onBg.ratio}:1 ({contrastCheck.onBg.level})
                  </span>
                </div>
              </div>

              {contrastCheck.hasWarning && (
                <button
                  type="button"
                  onClick={handleAutoFixContrast}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shrink-0 transition-colors"
                >
                  Fix Contrast
                </button>
              )}
            </div>

            {/* LIVE PREVIEW COMPONENT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  Live Workspace Preview
                </span>
                <span className="text-[10px] text-zinc-400">Dynamic UI Simulation</span>
              </div>

              {/* Mini App UI Frame */}
              <div
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 p-3 shadow-md transition-all overflow-hidden"
                style={{
                  background: themeInput.bgColor || '#f4f6f1',
                  color: themeInput.textColor || '#20251f',
                }}
              >
                <div className="grid grid-cols-12 gap-3 min-h-[190px]">
                  {/* Mini Sidebar */}
                  <div
                    className="col-span-3 rounded-lg p-2 flex flex-col justify-between"
                    style={{
                      background: themeInput.sidebarColor || '#193c33',
                      color: getAccessibleTextColor(themeInput.sidebarColor || '#193c33'),
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-xs flex items-center justify-center font-bold text-[9px]"
                          style={{
                            background: themeInput.accentColor || '#ed6b4f',
                            color: getAccessibleTextColor(themeInput.accentColor || '#ed6b4f'),
                          }}
                        >
                          S
                        </div>
                        <span className="text-[10px] font-bold">SnowFlex</span>
                      </div>
                      <div className="space-y-1 text-[9px]">
                        <div
                          className="px-1.5 py-1 rounded font-semibold flex items-center gap-1"
                          style={{
                            background: 'rgba(255,255,255,0.15)',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: themeInput.accentColor || '#ed6b4f' }}
                          />
                          Dashboard
                        </div>
                        <div className="px-1.5 py-1 opacity-70">Employees</div>
                        <div className="px-1.5 py-1 opacity-70">Leaves</div>
                      </div>
                    </div>

                    <div className="text-[8px] opacity-60">v2.4.0 Live</div>
                  </div>

                  {/* Mini Main Content */}
                  <div className="col-span-9 space-y-2.5">
                    {/* Mini Topbar */}
                    <div
                      className="p-2 rounded-lg flex items-center justify-between border border-black/5"
                      style={{
                        background: themeInput.cardColor || '#ffffff',
                        color: themeInput.textColor || '#20251f',
                      }}
                    >
                      <div className="text-[10px] font-semibold">Workspace Overview</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded font-bold"
                          style={{
                            background: themeInput.primaryColor || '#193c33',
                            color: getAccessibleTextColor(themeInput.primaryColor || '#193c33'),
                          }}
                        >
                          Active
                        </span>
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                          style={{
                            background: themeInput.accentColor || '#ed6b4f',
                            color: '#fff',
                          }}
                        >
                          U
                        </div>
                      </div>
                    </div>

                    {/* Mini Metric Panels */}
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="p-2.5 rounded-lg border border-black/5 shadow-xs"
                        style={{
                          background: themeInput.cardColor || '#ffffff',
                          color: themeInput.textColor || '#20251f',
                        }}
                      >
                        <div className="text-[9px] opacity-70">Total Staff</div>
                        <div className="text-base font-extrabold mt-0.5">142</div>
                        <div
                          className="text-[8px] font-semibold mt-1 inline-block"
                          style={{ color: themeInput.accentColor || '#ed6b4f' }}
                        >
                          +12% this month
                        </div>
                      </div>

                      <div
                        className="p-2.5 rounded-lg border border-black/5 shadow-xs"
                        style={{
                          background: themeInput.cardColor || '#ffffff',
                          color: themeInput.textColor || '#20251f',
                        }}
                      >
                        <div className="text-[9px] opacity-70">Present Today</div>
                        <div className="text-base font-extrabold mt-0.5">98.4%</div>
                        <div
                          className="text-[8px] font-semibold mt-1 inline-block"
                          style={{ color: themeInput.accentColor || '#ed6b4f' }}
                        >
                          Optimal Attendance
                        </div>
                      </div>
                    </div>

                    {/* Mini Primary Button Sample */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 rounded text-[10px] font-bold shadow-xs cursor-default"
                        style={{
                          background: themeInput.primaryColor || (themeInput.mode === 'dark' ? '#d9ed74' : '#193c33'),
                          color: getAccessibleTextColor(themeInput.primaryColor || (themeInput.mode === 'dark' ? '#d9ed74' : '#193c33')),
                        }}
                      >
                        Sample Primary Button
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 rounded text-[10px] font-bold shadow-xs cursor-default"
                        style={{
                          background: themeInput.accentColor || '#ed6b4f',
                          color: getAccessibleTextColor(themeInput.accentColor || '#ed6b4f'),
                        }}
                      >
                        Accent Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {targetScope === 'USER' && (
                  <button
                    type="button"
                    disabled={
                      !selectedUser ||
                      !canEditUser(selectedUser) ||
                      resetting ||
                      !originalUserTheme
                    }
                    onClick={() => setShowResetConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                )}

                {hasChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      if (originalUserTheme) {
                        setThemeInput({
                          bgColor: originalUserTheme.bgColor || DEFAULT_THEME_INPUT.bgColor,
                          primaryColor:
                            originalUserTheme.primaryColor || DEFAULT_THEME_INPUT.primaryColor,
                          accentColor:
                            originalUserTheme.accentColor || DEFAULT_THEME_INPUT.accentColor,
                          sidebarColor:
                            originalUserTheme.sidebarColor || DEFAULT_THEME_INPUT.sidebarColor,
                          cardColor:
                            originalUserTheme.cardColor || DEFAULT_THEME_INPUT.cardColor,
                          textColor:
                            originalUserTheme.textColor || DEFAULT_THEME_INPUT.textColor,
                        })
                      } else {
                        setThemeInput(DEFAULT_THEME_INPUT)
                      }
                      toast('Reverted unsaved color edits', { icon: '↩️' })
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Revert Edits
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {targetScope === 'USER' ? (
                  <>
                    {/* Optional: Bulk apply to selected user's role */}
                    {selectedUser && canBulkEditRole(selectedUser.role) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkRole(selectedUser.role)
                          setShowBulkConfirm(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Apply to All {selectedUser.role.replace('_', ' ')}s
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!selectedUser || !canEditUser(selectedUser) || saving}
                      onClick={handleSaveUserTheme}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Save Theme
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!canBulkEditRole(bulkRole) || saving}
                    onClick={() => setShowBulkConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        Apply to All {bulkRole.replace('_', ' ')}s
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Reset Theme to Default?
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  This will remove all custom color overrides for {selectedUser.fullName}.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              The user’s workspace interface will immediately revert to the classic Snowflex color
              palette upon their next reload or real-time sync.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetUserTheme}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Apply Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Apply Theme to All {bulkRole.replace('_', ' ')}s?
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Overwrites custom themes for every user with this role.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every staff member currently assigned to the <strong>{bulkRole.replace('_', ' ')}</strong>{' '}
              role will have their workspace interface updated to this color scheme.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleBulkApply}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Applying...' : 'Confirm Bulk Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
