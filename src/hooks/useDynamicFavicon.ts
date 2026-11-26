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

  type EyeMode = 'open' | 'happy' | 'blink' | 'spark'
  interface FrameCfg {
    bobY: number
    tiltDeg: number
    leftArmAngle: number
    rightArmAngle: number
    leftLegKick: number
    rightLegKick: number
    jetFlame: boolean
    eyeMode: EyeMode
    ringColor: string
    ringRadius: number
    sparkle: boolean
  }

  // 8-frame choreographed dance: jump + tilt + double-arm wave + leg kicks + jetpack flames + sparkles
  // Note: left arm mirrors right arm across X, so positive leftArmAngle raises it up and negative lowers it.
  const configs: FrameCfg[] = [
    { bobY: 1, tiltDeg: -7, leftArmAngle: 50, rightArmAngle: 20, leftLegKick: 4, rightLegKick: 0, jetFlame: false, eyeMode: 'open', ringColor: 'rgba(16, 185, 129, 0.24)', ringRadius: 27, sparkle: false },
    { bobY: -3.5, tiltDeg: 0, leftArmAngle: 65, rightArmAngle: -65, leftLegKick: 2, rightLegKick: 2, jetFlame: true, eyeMode: 'happy', ringColor: 'rgba(127, 231, 255, 0.34)', ringRadius: 30, sparkle: true },
    { bobY: 1, tiltDeg: 7, leftArmAngle: -20, rightArmAngle: -55, leftLegKick: 0, rightLegKick: 4, jetFlame: false, eyeMode: 'open', ringColor: 'rgba(16, 185, 129, 0.24)', ringRadius: 27, sparkle: false },
    { bobY: -3, tiltDeg: 4, leftArmAngle: 25, rightArmAngle: -75, leftLegKick: 3, rightLegKick: 0, jetFlame: true, eyeMode: 'spark', ringColor: 'rgba(255, 210, 63, 0.32)', ringRadius: 30, sparkle: true },
    { bobY: 1.5, tiltDeg: 0, leftArmAngle: -15, rightArmAngle: 15, leftLegKick: 0, rightLegKick: 0, jetFlame: false, eyeMode: 'blink', ringColor: 'rgba(16, 185, 129, 0.2)', ringRadius: 26, sparkle: false },
    { bobY: -4, tiltDeg: -6, leftArmAngle: 75, rightArmAngle: -25, leftLegKick: 0, rightLegKick: 3, jetFlame: true, eyeMode: 'happy', ringColor: 'rgba(127, 231, 255, 0.34)', ringRadius: 30, sparkle: true },
    { bobY: 0.5, tiltDeg: 5, leftArmAngle: 40, rightArmAngle: -60, leftLegKick: 4, rightLegKick: 0, jetFlame: false, eyeMode: 'open', ringColor: 'rgba(16, 185, 129, 0.28)', ringRadius: 28, sparkle: false },
    { bobY: -2, tiltDeg: -3, leftArmAngle: 60, rightArmAngle: -60, leftLegKick: 1, rightLegKick: 1, jetFlame: true, eyeMode: 'spark', ringColor: 'rgba(217, 237, 116, 0.34)', ringRadius: 29, sparkle: true },
  ]

  return configs.map((cfg, idx) => {
    ctx.clearRect(0, 0, size, size)

    // Subtle pulsing neon halo behind the robot so tab motion pops even at 16x16
    ctx.fillStyle = cfg.ringColor
    ctx.beginPath()
    ctx.arc(32, 32, cfg.ringRadius, 0, Math.PI * 2)
    ctx.fill()

    // Sparkle bursts on celebration frames
    if (cfg.sparkle) {
      const drawStar = (sx: number, sy: number, r: number, color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(sx, sy - r)
        ctx.lineTo(sx + r * 0.32, sy - r * 0.32)
        ctx.lineTo(sx + r, sy)
        ctx.lineTo(sx + r * 0.32, sy + r * 0.32)
        ctx.lineTo(sx, sy + r)
        ctx.lineTo(sx - r * 0.32, sy + r * 0.32)
        ctx.lineTo(sx - r, sy)
        ctx.lineTo(sx - r * 0.32, sy - r * 0.32)
        ctx.closePath()
        ctx.fill()
      }
      drawStar(9, 12, 4.5, '#ffd23f')
      drawStar(55, 13, 4.2, '#7fe7ff')
    }

    ctx.save()
    ctx.translate(32, 34 + cfg.bobY)
    ctx.rotate((cfg.tiltDeg * Math.PI) / 180)
    ctx.translate(-32, -34)

    // Antenna stem + pulsing LED
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(32, 13)
    ctx.lineTo(32, 6.5)
    ctx.stroke()

    if (cfg.sparkle) {
      ctx.fillStyle = 'rgba(255, 210, 63, 0.45)'
      ctx.beginPath()
      ctx.arc(32, 5.5, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = cfg.sparkle ? '#fff07c' : '#ffd23f'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(32, 5.5, 3.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Left Arm (animated cheer/wave)
    ctx.save()
    ctx.translate(18.5, 32)
    ctx.rotate((cfg.leftArmAngle * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-10, 4)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(-11.5, 4.5, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Right Arm (animated cheer/wave)
    ctx.save()
    ctx.translate(45.5, 32)
    ctx.rotate((cfg.rightArmAngle * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10, 4)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(11.5, 4.5, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Left & Right Legs + Boots + Optional Rocket Jetpack Thrusters
    const drawLeg = (x: number, kick: number) => {
      const legY = 44 - kick
      if (cfg.jetFlame) {
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.moveTo(x + 0.5, legY + 13)
        ctx.lineTo(x + 6, legY + 13)
        ctx.lineTo(x + 3.2, legY + 20)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#fde047'
        ctx.beginPath()
        ctx.moveTo(x + 1.5, legY + 13)
        ctx.lineTo(x + 5, legY + 13)
        ctx.lineTo(x + 3.2, legY + 17.5)
        ctx.closePath()
        ctx.fill()
      }

      drawRoundedRect(ctx, x, legY, 6.5, 10, 2.5)
      ctx.fillStyle = '#193c33'
      ctx.fill()
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.stroke()

      drawRoundedRect(ctx, x - 1.5, legY + 8.5, 9.5, 4.5, 2.2)
      ctx.fillStyle = '#d9ed74'
      ctx.fill()
      ctx.strokeStyle = '#143229'
      ctx.lineWidth = 1.4
      ctx.stroke()
    }
    drawLeg(21.5, cfg.leftLegKick)
    drawLeg(36, cfg.rightLegKick)

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

    // Expressive Eyes
    ctx.fillStyle = '#7fe7ff'
    ctx.strokeStyle = '#7fe7ff'
    ctx.lineCap = 'round'
    if (cfg.eyeMode === 'blink') {
      drawRoundedRect(ctx, 23, 19.5, 6, 2.2, 1.1)
      ctx.fill()
      drawRoundedRect(ctx, 35, 19.5, 6, 2.2, 1.1)
      ctx.fill()
    } else if (cfg.eyeMode === 'happy') {
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.arc(26, 21.5, 3, Math.PI, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(38, 21.5, 3, Math.PI, 0)
      ctx.stroke()
    } else if (cfg.eyeMode === 'spark') {
      ctx.fillStyle = '#ffd23f'
      drawRoundedRect(ctx, 23.2, 17.2, 5.4, 6, 2.5)
      ctx.fill()
      drawRoundedRect(ctx, 35.4, 17.2, 5.4, 6, 2.5)
      ctx.fill()
    } else {
      drawRoundedRect(ctx, 23.5, 17.5, 5, 5.8, 2.4)
      ctx.fill()
      drawRoundedRect(ctx, 35.5, 17.5, 5, 5.8, 2.4)
      ctx.fill()
    }

    // Smile
    ctx.strokeStyle = '#7fe7ff'
    ctx.lineWidth = 1.9
    ctx.beginPath()
    ctx.moveTo(27, 24.8)
    ctx.quadraticCurveTo(32, 27.6, 37, 24.8)
    ctx.stroke()

    // Body Torso + Chest Panel
    drawRoundedRect(ctx, 18.5, 30.5, 27, 14.5, 5.5)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.6
    ctx.stroke()

    drawRoundedRect(ctx, 23.5, 33.8, 17, 7.8, 3)
    ctx.fillStyle = '#07110d'
    ctx.fill()

    ctx.fillStyle = idx % 2 === 0 ? '#7fe7ff' : '#ffd23f'
    ctx.beginPath()
    ctx.arc(28.5, 37.7, 2.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#10b981'
    drawRoundedRect(ctx, 33, 36.4, 5, 2.6, 1.3)
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
    }, 280)

    return () => {
      window.clearInterval(interval)
    }
  }, [location.pathname])
}
