import type { UserTheme } from './theme-api'

export const CUSTOM_THEME_STORAGE_KEY = 'snowflex.custom_theme'

export interface ThemePreset {
  id: string
  name: string
  description: string
  mode?: 'light' | 'dark'
  bgColor: string
  primaryColor: string
  accentColor: string
  sidebarColor: string
  cardColor: string
  textColor: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Snowflex Classic (Light)',
    description: 'Original forest green & warm terracotta',
    mode: 'light',
    bgColor: '#f4f6f1',
    primaryColor: '#193c33',
    accentColor: '#ed6b4f',
    sidebarColor: '#ffffff',
    cardColor: '#ffffff',
    textColor: '#20251f',
  },
  {
    id: 'snowflex-dark',
    name: 'Snowflex Forest (Dark)',
    description: 'Official Snowflex deep forest dark mode with lime accents',
    mode: 'dark',
    bgColor: '#141a17',
    primaryColor: '#d9ed74',
    accentColor: '#ed6b4f',
    sidebarColor: '#141d18',
    cardColor: '#1d2621',
    textColor: '#e7eee8',
  },
  {
    id: 'emerald',
    name: 'Emerald Executive',
    description: 'Prestigious deep emerald with mint accents',
    mode: 'light',
    bgColor: '#f0fdf4',
    primaryColor: '#065f46',
    accentColor: '#10b981',
    sidebarColor: '#064e3b',
    cardColor: '#ffffff',
    textColor: '#0f291e',
  },
  {
    id: 'nordic',
    name: 'Nordic Slate',
    description: 'Crisp scandinavian blues and modern slate',
    mode: 'light',
    bgColor: '#f8fafc',
    primaryColor: '#0f172a',
    accentColor: '#0284c7',
    sidebarColor: '#1e293b',
    cardColor: '#ffffff',
    textColor: '#0f172a',
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    description: 'Warm energizing coral with amber highlights',
    mode: 'light',
    bgColor: '#fff7ed',
    primaryColor: '#9a3412',
    accentColor: '#ea580c',
    sidebarColor: '#7c2d12',
    cardColor: '#ffffff',
    textColor: '#291508',
  },
  {
    id: 'royal',
    name: 'Royal Indigo',
    description: 'Elegant deep indigo with violet accents',
    mode: 'light',
    bgColor: '#faf5ff',
    primaryColor: '#4c1d95',
    accentColor: '#7c3aed',
    sidebarColor: '#3b0764',
    cardColor: '#ffffff',
    textColor: '#1e1136',
  },
  {
    id: 'midnight',
    name: 'Midnight Dark',
    description: 'Sleek dark mode theme with electric cyan highlights',
    mode: 'dark',
    bgColor: '#0f172a',
    primaryColor: '#38bdf8',
    accentColor: '#06b6d4',
    sidebarColor: '#090d16',
    cardColor: '#1e293b',
    textColor: '#f1f5f9',
  },
]

export function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim())
}

export function normalizeHex(hex: string): string {
  let clean = hex.trim()
  if (!clean.startsWith('#')) clean = `#${clean}`
  if (clean.length === 4) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  return clean.toLowerCase()
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hex)) return null
  const normalized = normalizeHex(hex)
  const num = parseInt(normalized.slice(1), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Calculates relative luminance as defined by WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/**
 * Calculates WCAG contrast ratio between two colors (ranging from 1 to 21)
 */
export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lum1 = getRelativeLuminance(foregroundHex)
  const lum2 = getRelativeLuminance(backgroundHex)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Checks if color pair meets WCAG AA standards
 * Normal text: 4.5:1
 * Large text: 3.0:1
 */
export function isWcagAaCompliant(
  foregroundHex: string,
  backgroundHex: string,
  isLargeText: boolean = false,
): { compliant: boolean; ratio: number; level: 'AAA' | 'AA' | 'Fail' } {
  const ratio = getContrastRatio(foregroundHex, backgroundHex)
  const threshold = isLargeText ? 3.0 : 4.5
  const aaaThreshold = isLargeText ? 4.5 : 7.0

  let level: 'AAA' | 'AA' | 'Fail' = 'Fail'
  if (ratio >= aaaThreshold) level = 'AAA'
  else if (ratio >= threshold) level = 'AA'

  return {
    compliant: ratio >= threshold,
    ratio: Math.round(ratio * 10) / 10,
    level,
  }
}

/**
 * Auto-selects white (#ffffff) or near-black (#0f172a) based on whichever yields higher contrast
 */
export function getAccessibleTextColor(backgroundHex: string): string {
  if (!isValidHex(backgroundHex)) return '#20251f'
  const whiteRatio = getContrastRatio('#ffffff', backgroundHex)
  const blackRatio = getContrastRatio('#0f172a', backgroundHex)
  return whiteRatio >= blackRatio ? '#ffffff' : '#0f172a'
}

/**
 * Applies custom theme CSS variables to :root / document.documentElement.style
 * Mode-aware: respects light vs dark mode so light cards never bleed into dark mode!
 */
export function applyThemeCssVariables(theme: UserTheme | null, currentMode?: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  const rootStyle = document.documentElement.style

  const mode = currentMode || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const isDark = mode === 'dark'

  if (
    !theme ||
    (!theme.mode &&
      !theme.bgColor &&
      !theme.primaryColor &&
      !theme.accentColor &&
      !theme.sidebarColor &&
      !theme.cardColor &&
      !theme.textColor)
  ) {
    // Reset custom properties
    rootStyle.removeProperty('--custom-bg')
    rootStyle.removeProperty('--custom-bg-text')
    rootStyle.removeProperty('--custom-dark-bg')
    rootStyle.removeProperty('--custom-primary')
    rootStyle.removeProperty('--custom-primary-text')
    rootStyle.removeProperty('--custom-accent')
    rootStyle.removeProperty('--custom-sidebar')
    rootStyle.removeProperty('--custom-sidebar-text')
    rootStyle.removeProperty('--custom-card')
    rootStyle.removeProperty('--custom-card-text')
    rootStyle.removeProperty('--custom-dark-card')
    rootStyle.removeProperty('--custom-text')
    rootStyle.removeProperty('--has-custom-theme')

    try {
      localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY)
    } catch {
      // storage unavailable
    }
    return
  }

  // Set active flag
  rootStyle.setProperty('--has-custom-theme', '1')

  // Sidebar (applies in both modes)
  if (theme.sidebarColor && isValidHex(theme.sidebarColor)) {
    rootStyle.setProperty('--custom-sidebar', theme.sidebarColor)
    rootStyle.setProperty('--custom-sidebar-text', getAccessibleTextColor(theme.sidebarColor))
  } else {
    rootStyle.removeProperty('--custom-sidebar')
    rootStyle.removeProperty('--custom-sidebar-text')
  }

  // Accent (applies in both modes)
  if (theme.accentColor && isValidHex(theme.accentColor)) {
    rootStyle.setProperty('--custom-accent', theme.accentColor)
  } else {
    rootStyle.removeProperty('--custom-accent')
  }

  // Mode-aware Primary, Canvas Background & Card Panels
  if (isDark) {
    // In Dark Mode: if primaryColor is the light default (#193c33), let Snowflex lime #d9ed74 take effect
    if (theme.primaryColor && isValidHex(theme.primaryColor) && theme.primaryColor.toLowerCase() !== '#193c33') {
      rootStyle.setProperty('--custom-dark-primary', theme.primaryColor)
      rootStyle.setProperty('--custom-dark-primary-text', getAccessibleTextColor(theme.primaryColor))
    } else {
      rootStyle.removeProperty('--custom-dark-primary')
      rootStyle.removeProperty('--custom-dark-primary-text')
    }
    rootStyle.removeProperty('--custom-primary')
    rootStyle.removeProperty('--custom-primary-text')

    // In Dark Mode: only apply dark custom backgrounds/cards
    if (theme.bgColor && isValidHex(theme.bgColor) && getRelativeLuminance(theme.bgColor) < 0.25) {
      rootStyle.setProperty('--custom-dark-bg', theme.bgColor)
    } else {
      rootStyle.removeProperty('--custom-dark-bg')
    }

    if (theme.cardColor && isValidHex(theme.cardColor) && getRelativeLuminance(theme.cardColor) < 0.25) {
      rootStyle.setProperty('--custom-dark-card', theme.cardColor)
    } else {
      rootStyle.removeProperty('--custom-dark-card')
    }

    // Never let light-mode colors bleed into dark mode
    rootStyle.removeProperty('--custom-bg')
    rootStyle.removeProperty('--custom-bg-text')
    rootStyle.removeProperty('--custom-card')
    rootStyle.removeProperty('--custom-card-text')
    rootStyle.removeProperty('--custom-text')
  } else {
    // In Light Mode: if primaryColor is the dark default (#d9ed74), let Snowflex pine #193c33 take effect
    if (theme.primaryColor && isValidHex(theme.primaryColor) && theme.primaryColor.toLowerCase() !== '#d9ed74') {
      rootStyle.setProperty('--custom-primary', theme.primaryColor)
      rootStyle.setProperty('--custom-primary-text', getAccessibleTextColor(theme.primaryColor))
    } else {
      rootStyle.removeProperty('--custom-primary')
      rootStyle.removeProperty('--custom-primary-text')
    }
    rootStyle.removeProperty('--custom-dark-primary')
    rootStyle.removeProperty('--custom-dark-primary-text')
    // In Light Mode: only apply light custom backgrounds/cards
    if (theme.bgColor && isValidHex(theme.bgColor) && getRelativeLuminance(theme.bgColor) > 0.35) {
      rootStyle.setProperty('--custom-bg', theme.bgColor)
      rootStyle.setProperty('--custom-bg-text', getAccessibleTextColor(theme.bgColor))
    } else {
      rootStyle.removeProperty('--custom-bg')
      rootStyle.removeProperty('--custom-bg-text')
    }

    if (theme.cardColor && isValidHex(theme.cardColor) && getRelativeLuminance(theme.cardColor) > 0.35) {
      rootStyle.setProperty('--custom-card', theme.cardColor)
      rootStyle.setProperty('--custom-card-text', getAccessibleTextColor(theme.cardColor))
    } else {
      rootStyle.removeProperty('--custom-card')
      rootStyle.removeProperty('--custom-card-text')
    }

    if (theme.textColor && isValidHex(theme.textColor) && getRelativeLuminance(theme.textColor) < 0.3) {
      rootStyle.setProperty('--custom-text', theme.textColor)
    } else {
      rootStyle.removeProperty('--custom-text')
    }

    rootStyle.removeProperty('--custom-dark-bg')
    rootStyle.removeProperty('--custom-dark-card')
  }

  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // storage unavailable
  }
}

/**
 * Loads cached theme from localStorage synchronously (for anti-FOUC)
 */
export function getCachedCustomTheme(): UserTheme | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserTheme
  } catch {
    return null
  }
}
