import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Updates the browser tab icon (favicon) in the DOM.
 * Ensures a single <link id="app-favicon" rel="icon"> exists so Chrome does not
 * fall back to static PNG icon tags (e.g., 192x192 PWA icon) while animating.
 */
export function updateFavicon(iconUrl: string, mimeType = 'image/svg+xml') {
  if (typeof document === 'undefined') return

  const head = document.head
  const existingLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']")
  )
  const primary = document.getElementById('app-favicon') as HTMLLinkElement | null

  existingLinks.forEach((link) => {
    if (link !== primary) {
      link.remove()
    }
  })

  if (primary) {
    if (primary.type !== mimeType) primary.type = mimeType
    if (primary.getAttribute('href') !== iconUrl) {
      primary.setAttribute('href', iconUrl)
    }
    return
  }

  const newLink = document.createElement('link')
  newLink.id = 'app-favicon'
  newLink.rel = 'icon'
  newLink.type = mimeType
  newLink.href = iconUrl
  head.appendChild(newLink)
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function buildFullBodyRobotFrames(): string[] {
  if (typeof document === 'undefined') return ['/favicon-blue.svg']

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ['/favicon-blue.svg']

  // 4 lively frames: bounce + arm wave + eye blink + leg step
  const configs = [
    { bobY: 0, waveDeg: -38, leftArmDeg: 14, leftLegLift: 0, rightLegLift: 0, blink: false, glow: false },
    { bobY: -2, waveDeg: -62, leftArmDeg: 22, leftLegLift: 3, rightLegLift: 0, blink: false, glow: true },
    { bobY: 0, waveDeg: -32, leftArmDeg: 10, leftLegLift: 0, rightLegLift: 0, blink: true, glow: false },
    { bobY: -1.5, waveDeg: -56, leftArmDeg: 20, leftLegLift: 0, rightLegLift: 3, blink: false, glow: true },
  ]

  return configs.map((cfg, idx) => {
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.translate(0, cfg.bobY)

    // Antenna stem + pulsing LED
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(32, 13)
    ctx.lineTo(32, 6.5)
    ctx.stroke()

    if (cfg.glow) {
      ctx.fillStyle = 'rgba(255, 210, 63, 0.38)'
      ctx.beginPath()
      ctx.arc(32, 5.5, 6.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = cfg.glow ? '#fff07c' : '#ffd23f'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(32, 5.5, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Left Arm (pivots from shoulder)
    ctx.save()
    ctx.translate(18.5, 32)
    ctx.rotate((cfg.leftArmDeg * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-5, 11)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(-5.5, 12.5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Right Arm (waves up high!)
    ctx.save()
    ctx.translate(45.5, 32)
    ctx.rotate((cfg.waveDeg * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10, -5)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(11.5, -6, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Left & Right Legs + Boots
    const drawLeg = (x: number, lift: number) => {
      const legY = 44 - lift
      drawRoundedRect(ctx, x, legY, 6.5, 10.5, 2.5)
      ctx.fillStyle = '#193c33'
      ctx.fill()
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.stroke()

      drawRoundedRect(ctx, x - 1.5, legY + 9, 9.5, 4.5, 2.2)
      ctx.fillStyle = '#d9ed74'
      ctx.fill()
      ctx.strokeStyle = '#143229'
      ctx.lineWidth = 1.4
      ctx.stroke()
    }
    drawLeg(21.5, cfg.leftLegLift)
    drawLeg(36, cfg.rightLegLift)

    // Ears
    drawRoundedRect(ctx, 13, 17, 4, 8, 2)
    ctx.fillStyle = '#10b981'
    ctx.fill()
    drawRoundedRect(ctx, 47, 17, 4, 8, 2)
    ctx.fillStyle = '#10b981'
    ctx.fill()

    // Head + Dark Visor
    drawRoundedRect(ctx, 16, 12, 32, 18, 7)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.8
    ctx.stroke()

    drawRoundedRect(ctx, 19.5, 15, 25, 12, 4.5)
    ctx.fillStyle = '#07110d'
    ctx.fill()

    // Cyan Eyes (open or blink)
    ctx.fillStyle = '#7fe7ff'
    if (cfg.blink) {
      drawRoundedRect(ctx, 23, 19.5, 6, 2.2, 1.1)
      ctx.fill()
      drawRoundedRect(ctx, 35, 19.5, 6, 2.2, 1.1)
      ctx.fill()
    } else {
      drawRoundedRect(ctx, 23.5, 17.5, 5, 5.8, 2.4)
      ctx.fill()
      drawRoundedRect(ctx, 35.5, 17.5, 5, 5.8, 2.4)
      ctx.fill()
    }

    // Smile
    ctx.strokeStyle = '#7fe7ff'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(27, 24.8)
    ctx.quadraticCurveTo(32, 27.5, 37, 24.8)
    ctx.stroke()

    // Body Torso + Chest Panel
    drawRoundedRect(ctx, 18.5, 30.5, 27, 15, 5.5)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.6
    ctx.stroke()

    drawRoundedRect(ctx, 23.5, 34, 17, 8, 3)
    ctx.fillStyle = '#07110d'
    ctx.fill()

    ctx.fillStyle = idx % 2 === 0 ? '#7fe7ff' : '#ffd23f'
    ctx.beginPath()
    ctx.arc(28.5, 38, 2.1, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#10b981'
    drawRoundedRect(ctx, 33, 36.7, 5, 2.6, 1.3)
    ctx.fill()

    ctx.restore()
    return canvas.toDataURL('image/png')
  })
}

/**
 * Hook to dynamically toggle the Chrome tab favicon:
 * - Landing page ('/'): Animated full-body Snowflex Robot bot
 * - Register, Login, Auth, and Dashboard pages: Green favicon (/favicon-green.svg) and green theme color (#193c33)
 */
export function useDynamicFavicon() {
  const location = useLocation()

  useEffect(() => {
    const isLanding = location.pathname === '/' || location.pathname === ''
    const targetThemeColor = isLanding ? '#10b981' : '#193c33'

    // Update <meta name="theme-color" ... />
    let metaTheme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']")
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.name = 'theme-color'
      document.head.appendChild(metaTheme)
    }
    metaTheme.content = targetThemeColor

    if (!isLanding) {
      updateFavicon('/favicon-green.svg', 'image/svg+xml')
      return
    }

    const frames = buildFullBodyRobotFrames()
    let frameIndex = 0
    updateFavicon(frames[0], 'image/png')

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced || frames.length <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length
      updateFavicon(frames[frameIndex], 'image/png')
    }, 450)

    return () => {
      window.clearInterval(interval)
    }
  }, [location.pathname])
}
