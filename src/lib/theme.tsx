import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
      const customEvent = e as CustomEvent<UserTheme>
      const newTheme = customEvent.detail
      setCustomTheme(newTheme)

      if (newTheme?.mode === 'light' || newTheme?.mode === 'dark') {
        setTheme(newTheme.mode)
        localStorage.setItem(storageKey, newTheme.mode)
        applyThemeCssVariables(newTheme, newTheme.mode)
      } else {
        applyThemeCssVariables(newTheme, theme)
      }
      toast.success('Your workspace theme was updated by an administrator!', { id: 'theme-updated-notif' })
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
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light'

      // Synchronously apply DOM changes immediately
      document.documentElement.dataset.theme = next
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.style.colorScheme = next
      localStorage.setItem(storageKey, next)

      // Keep customTheme cached mode in sync
      if (customTheme) {
        const updatedCustom = { ...customTheme, mode: next }
        setCustomTheme(updatedCustom)
        try {
          localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(updatedCustom))
        } catch {}
        applyThemeCssVariables(updatedCustom, next)
      } else {
        applyThemeCssVariables(null, next)
      }

      // Persist mode choice to server in background if user is authenticated
      const token = readToken()
      if (token) {
        setMyMode(token, next).catch(() => {})
      }

      return next
    })
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

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        customTheme,
        applyCustomTheme,
        refreshCustomTheme,
        isCustomThemeActive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}