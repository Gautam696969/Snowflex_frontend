import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readToken } from './auth-api'
import { getMyTheme, setMyMode, type UserTheme } from './theme-api'
import { applyThemeCssVariables, getCachedCustomTheme, CUSTOM_THEME_STORAGE_KEY } from './theme-utils'
import { toast } from 'react-hot-toast'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  customTheme: UserTheme | null
  applyCustomTheme: (theme: UserTheme | null) => void
  refreshCustomTheme: () => Promise<void>
  isCustomThemeActive: boolean
}

const storageKey = 'snowflex.theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function toggleThemeMode(): Theme {
  const currentSaved = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null
  const currentIsDark = currentSaved
    ? currentSaved === 'dark'
    : (typeof document !== 'undefined' &&
       (document.documentElement.classList.contains('dark') ||
        document.documentElement.dataset.theme === 'dark'))

  const next: Theme = currentIsDark ? 'light' : 'dark'

  if (typeof document !== 'undefined') {
    // 1. Temporarily disable all transitions to prevent stutter & lag during switch
    document.documentElement.classList.add('no-transitions')

    // 2. Synchronously drive the theme via CSS variables + class & dataset on <html>
    document.documentElement.dataset.theme = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next

    try {
      localStorage.setItem(storageKey, next)
    } catch {}

    // 3. Keep cached custom theme in sync
    try {
      const cached = getCachedCustomTheme()
      if (cached) {
        const updated = { ...cached, mode: next }
        localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(updated))
        applyThemeCssVariables(updated, next)
      } else {
        applyThemeCssVariables(null, next)
      }
    } catch {}

    // 4. Double requestAnimationFrame: remove no-transitions only after style calculation and paint commit
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transitions')
      })
    })

    // 5. Notify React context & other listeners
    window.dispatchEvent(new CustomEvent('snowflex:theme-toggled', { detail: next }))
  }

  // 6. Background persist to server if user is authenticated
  const token = readToken()
  if (token) {
    setMyMode(token, next).catch(() => {})
  }

  return next
}

function getInitialTheme(): Theme {
  // 1. Explicit user manual toggle takes highest precedence
  const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

  // 2. Custom assigned theme default mode
  const cached = getCachedCustomTheme()
  if (cached?.mode === 'light' || cached?.mode === 'dark') return cached.mode

  // 3. System preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [customTheme, setCustomTheme] = useState<UserTheme | null>(() => getCachedCustomTheme())

  // Apply light/dark class, data-theme, and mode-aware CSS variables on change
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(storageKey, theme)

    applyThemeCssVariables(customTheme, theme)
  }, [theme, customTheme])

  // Listen to external theme toggle events
  useEffect(() => {
    const handleToggled = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail
      if (next && next !== theme) {
        setTheme(next)
      }
    }
    window.addEventListener('snowflex:theme-toggled', handleToggled)
    return () => {
      window.removeEventListener('snowflex:theme-toggled', handleToggled)
    }
  }, [theme])

  const refreshCustomTheme = async () => {
    const token = readToken()
    if (!token) {
      setCustomTheme(null)
      applyThemeCssVariables(null, theme)
      return
    }

    try {
      const serverTheme = await getMyTheme(token)
      setCustomTheme(serverTheme)
      applyThemeCssVariables(serverTheme, theme)

      // Only sync mode from server if the user hasn't made an explicit manual toggle in localStorage
      const userManualChoice = localStorage.getItem(storageKey)
      if (!userManualChoice && (serverTheme?.mode === 'light' || serverTheme?.mode === 'dark')) {
        setTheme(serverTheme.mode)
      }
    } catch {
      // If offline or network error, fallback to cached
    }
  }

  // Load server theme on mount and token change, listen to admin theme events
  useEffect(() => {
    void refreshCustomTheme()

    const handleAuthChange = () => {
      void refreshCustomTheme()
    }

    const handleThemeUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserTheme & { updatedBy?: number }>
      const newTheme = customEvent.detail

      // Check if custom palette colors changed (not just dark/light mode)
      const colorsChanged = Boolean(
        (newTheme?.bgColor ?? null) !== (customTheme?.bgColor ?? null) ||
        (newTheme?.primaryColor ?? null) !== (customTheme?.primaryColor ?? null) ||
        (newTheme?.accentColor ?? null) !== (customTheme?.accentColor ?? null) ||
        (newTheme?.sidebarColor ?? null) !== (customTheme?.sidebarColor ?? null) ||
        (newTheme?.cardColor ?? null) !== (customTheme?.cardColor ?? null) ||
        (newTheme?.textColor ?? null) !== (customTheme?.textColor ?? null)
      )

      setCustomTheme(newTheme)

      if (newTheme?.mode === 'light' || newTheme?.mode === 'dark') {
        setTheme(newTheme.mode)
        localStorage.setItem(storageKey, newTheme.mode)
        applyThemeCssVariables(newTheme, newTheme.mode)
      } else {
        applyThemeCssVariables(newTheme, theme)
      }

      // Check if the update was performed by the user themselves
      let isSelfAction = false
      try {
        const token = readToken()
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload?.id && newTheme?.updatedBy && payload.id === newTheme.updatedBy) {
            isSelfAction = true
          }
        }
      } catch {}

      // Do NOT show notification toaster when switching between dark mode and light mode
      // Only notify if custom theme colors were updated by an administrator
      if (colorsChanged && !isSelfAction && newTheme?.updatedBy) {
        toast.success('Your workspace theme was updated by an administrator!', { id: 'theme-updated-notif' })
      }
    }

    const handleThemeReset = () => {
      setCustomTheme(null)
      applyThemeCssVariables(null, theme)
      toast('Workspace theme reset to default by an administrator.', { icon: '🎨', id: 'theme-reset-notif' })
    }

    window.addEventListener('auth-token-changed', handleAuthChange)
    window.addEventListener('snowflex:theme-updated', handleThemeUpdated)
    window.addEventListener('snowflex:theme-reset', handleThemeReset)

    return () => {
      window.removeEventListener('auth-token-changed', handleAuthChange)
      window.removeEventListener('snowflex:theme-updated', handleThemeUpdated)
      window.removeEventListener('snowflex:theme-reset', handleThemeReset)
    }
  }, [theme])

  function toggleTheme() {
    const next = toggleThemeMode()
    setTheme(next)
  }

  function applyCustomTheme(newTheme: UserTheme | null) {
    setCustomTheme(newTheme)
    if (newTheme?.mode === 'light' || newTheme?.mode === 'dark') {
      setTheme(newTheme.mode)
      localStorage.setItem(storageKey, newTheme.mode)
      applyThemeCssVariables(newTheme, newTheme.mode)
    } else {
      applyThemeCssVariables(newTheme, theme)
    }
  }

  const isCustomThemeActive = Boolean(
    customTheme &&
      (customTheme.mode ||
        customTheme.bgColor ||
        customTheme.primaryColor ||
        customTheme.accentColor ||
        customTheme.sidebarColor ||
        customTheme.cardColor ||
        customTheme.textColor)
  )

  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    toggleTheme,
    customTheme,
    applyCustomTheme,
    refreshCustomTheme,
    isCustomThemeActive,
  }), [theme, customTheme, isCustomThemeActive])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}