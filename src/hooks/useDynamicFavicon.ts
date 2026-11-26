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

  // 20-frame seamless sinusoidal loop (~1.8s cycle @ 90ms) for silky-smooth Chrome tab motion:
  // gentle antigravity float, smooth right-hand wave, breathing aura, soft hover beam & natural blink
  const totalFrames = 20

  return Array.from({ length: totalFrames }, (_, idx) => {
    const phase = (idx / totalFrames) * Math.PI * 2
    const sin1 = Math.sin(phase)
    const cos1 = Math.cos(phase)
    const sin2 = Math.sin(phase * 2)

    const bobY = sin1 * 2.3
    const gentleSwayDeg = cos1 * 3.2
    const leftArmAngle = -14 + sin1 * 10
    const rightArmAngle = -52 + sin2 * 16
    const leftLegLift = Math.max(0, sin1) * 1.8
    const rightLegLift = Math.max(0, -sin1) * 1.8
    const auraAlpha = 0.16 + ((sin1 + 1) / 2) * 0.14
    const auraRadius = 26 + ((cos1 + 1) / 2) * 3
    const ledGlow = 0.45 + ((sin2 + 1) / 2) * 0.55

    // Smooth 4-frame natural eye blink near the end of the loop (frames 15..18)
    let eyeScaleY = 1
    if (idx === 15 || idx === 18) eyeScaleY = 0.52
    else if (idx === 16 || idx === 17) eyeScaleY = 0.18

    ctx.clearRect(0, 0, size, size)

    // Smooth breathing emerald-cyan aura behind robot
    const auraGrad = ctx.createRadialGradient(32, 32, 6, 32, 32, auraRadius)
    auraGrad.addColorStop(0, `rgba(16, 185, 129, ${(auraAlpha * 1.1).toFixed(3)})`)
    auraGrad.addColorStop(0.65, `rgba(127, 231, 255, ${(auraAlpha * 0.55).toFixed(3)})`)
    auraGrad.addColorStop(1, 'rgba(16, 185, 129, 0)')
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(32, 32, auraRadius, 0, Math.PI * 2)
    ctx.fill()

    // Soft antigravity hover shadow ring under feet (shrinks smoothly as bot floats higher)
    const hoverScale = 1 - (bobY / 2.3) * -0.14
    ctx.fillStyle = `rgba(16, 185, 129, ${(0.28 - (bobY / 2.3) * 0.08).toFixed(3)})`
    ctx.beginPath()
    ctx.ellipse(32, 59, 13 * hoverScale, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(32, 33 + bobY)
    ctx.rotate((gentleSwayDeg * Math.PI) / 180)
    ctx.translate(-32, -33)

    // Antenna stem + smoothly breathing golden LED
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(32, 13)
    ctx.lineTo(32, 6.5)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 210, 63, ${(0.18 + ledGlow * 0.35).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(32, 5.5, 5 + ledGlow * 1.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = ledGlow > 0.72 ? '#ffef8a' : '#ffd23f'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(32, 5.5, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Left Arm (smooth gentle balance swing)
    ctx.save()
    ctx.translate(18.5, 32)
    ctx.rotate((leftArmAngle * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-9, 5)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(-10.2, 5.6, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Right Arm (silky smooth wave)
    ctx.save()
    ctx.translate(45.5, 32)
    ctx.rotate((rightArmAngle * Math.PI) / 180)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 5.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(10.5, 3)
    ctx.stroke()
    ctx.fillStyle = '#d9ed74'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(11.8, 3.4, 3.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Left & Right Legs + Boots (smooth alternating float)
    const drawLeg = (x: number, lift: number) => {
      const legY = 44 - lift
      drawRoundedRect(ctx, x, legY, 6.4, 9.8, 2.5)
      ctx.fillStyle = '#193c33'
      ctx.fill()
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.stroke()

      drawRoundedRect(ctx, x - 1.4, legY + 8.3, 9.2, 4.3, 2.1)
      ctx.fillStyle = '#d9ed74'
      ctx.fill()
      ctx.strokeStyle = '#143229'
      ctx.lineWidth = 1.4
      ctx.stroke()
    }
    drawLeg(21.6, leftLegLift)
    drawLeg(36, rightLegLift)

    // Side Ears
    drawRoundedRect(ctx, 13, 17, 4, 8, 2)
    ctx.fillStyle = '#10b981'
    ctx.fill()
    drawRoundedRect(ctx, 47, 17, 4, 8, 2)
    ctx.fillStyle = '#10b981'
    ctx.fill()

    // Rounded Head + Dark Face Visor
    drawRoundedRect(ctx, 16, 12, 32, 18, 7)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.8
    ctx.stroke()

    drawRoundedRect(ctx, 19.5, 15, 25, 12, 4.5)
    ctx.fillStyle = '#07110d'
    ctx.fill()

    // Smooth Blinking Cyan Eyes
    const eyeH = 5.8 * eyeScaleY
    const eyeY = 20.4 - eyeH / 2
    ctx.fillStyle = '#7fe7ff'
    drawRoundedRect(ctx, 23.4, eyeY, 5.2, eyeH, Math.min(2.4, eyeH / 2))
    ctx.fill()
    drawRoundedRect(ctx, 35.4, eyeY, 5.2, eyeH, Math.min(2.4, eyeH / 2))
    ctx.fill()

    // Friendly Smile
    ctx.strokeStyle = '#7fe7ff'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(27.2, 24.8)
    ctx.quadraticCurveTo(32, 27.3, 36.8, 24.8)
    ctx.stroke()

    // Body Torso + Smoothly Breathing Chest Core
    drawRoundedRect(ctx, 18.5, 30.5, 27, 14.5, 5.5)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.6
    ctx.stroke()

    drawRoundedRect(ctx, 23.5, 33.8, 17, 7.8, 3)
    ctx.fillStyle = '#07110d'
    ctx.fill()

    ctx.fillStyle = `rgba(127, 231, 255, ${(0.55 + ((cos1 + 1) / 2) * 0.45).toFixed(3)})`
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
    }, 90)

    return () => {
      window.clearInterval(interval)
    }
  }, [location.pathname])
}
