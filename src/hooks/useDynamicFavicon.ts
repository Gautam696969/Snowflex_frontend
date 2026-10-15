import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Updates the browser tab icon (favicon) and theme color in the DOM.
 * Removing the prior link and appending a fresh one forces Chrome and other browsers
 * to reliably repaint the tab icon immediately upon navigation.
 */
export function updateFavicon(iconUrl: string) {
  if (typeof document === 'undefined') return

  const head = document.head
  const existingLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']")

  let alreadySet = false
  existingLinks.forEach((link) => {
    if (link.getAttribute('href') === iconUrl) {
      alreadySet = true
    } else {
      link.remove()
    }
  })

  if (!alreadySet) {
    const newLink = document.createElement('link')
    newLink.id = 'app-favicon'
    newLink.rel = 'icon'
    newLink.type = 'image/svg+xml'
    newLink.href = iconUrl
    head.appendChild(newLink)
  }
}

/**
 * Hook to dynamically toggle the Chrome tab favicon:
 * - Landing page ('/'): Blue favicon (/favicon-blue.svg) and blue theme color (#0284c7)
 * - Register, Login, Auth, and Dashboard pages: Green favicon (/favicon-green.svg) and green theme color (#193c33)
 */
export function useDynamicFavicon() {
  const location = useLocation()

  useEffect(() => {
    const isLanding = location.pathname === '/' || location.pathname === ''
    const targetFavicon = isLanding ? '/favicon-blue.svg' : '/favicon-green.svg'
    const targetThemeColor = isLanding ? '#0284c7' : '#193c33'

    updateFavicon(targetFavicon)

    // Update <meta name="theme-color" ... />
    let metaTheme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']")
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.name = 'theme-color'
      document.head.appendChild(metaTheme)
    }
    metaTheme.content = targetThemeColor
  }, [location.pathname])
}
