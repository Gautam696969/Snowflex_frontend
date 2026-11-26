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

function buildRobotFaceFrames(): string[] {
  if (typeof document === 'undefined') return ['/favicon-blue.svg']

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ['/favicon-blue.svg']

  // 24-frame silky sinusoidal loop (~2.1s cycle @ 90ms):
  // bold, readable AI robot face with smooth levitation, subtle tilt, glowing aura,
  // breathing antenna LED, playful eye glance, and soft natural blink
  const totalFrames = 24

  return Array.from({ length: totalFrames }, (_, idx) => {
    const phase = (idx / totalFrames) * Math.PI * 2
    const sin1 = Math.sin(phase)
    const cos1 = Math.cos(phase)
    const sin2 = Math.sin(phase * 2)

    const bobY = sin1 * 2.2
    const tiltDeg = cos1 * 2.6
    const eyeShiftX = sin1 * 1.8
    const ledGlow = 0.45 + ((sin2 + 1) / 2) * 0.55
    const auraAlpha = 0.16 + ((sin1 + 1) / 2) * 0.14

    // Soft 4-frame blink near end of loop (frames 18..21)
    let eyeScaleY = 1
    if (idx === 18 || idx === 21) eyeScaleY = 0.5
    else if (idx === 19 || idx === 20) eyeScaleY = 0.14

    ctx.clearRect(0, 0, size, size)

    // Soft breathing emerald-cyan halo behind the face
    const aura = ctx.createRadialGradient(32, 34, 8, 32, 34, 30)
    aura.addColorStop(0, `rgba(16, 185, 129, ${(auraAlpha * 1.15).toFixed(3)})`)
    aura.addColorStop(0.65, `rgba(127, 231, 255, ${(auraAlpha * 0.55).toFixed(3)})`)
    aura.addColorStop(1, 'rgba(16, 185, 129, 0)')
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(32, 34, 30, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(32, 35 + bobY)
    ctx.rotate((tiltDeg * Math.PI) / 180)
    ctx.translate(-32, -35)

    // Antenna stem + breathing golden LED
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 4.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(32, 17)
    ctx.lineTo(32, 8.5)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 210, 63, ${(0.22 + ledGlow * 0.4).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(32, 7.5, 6 + ledGlow * 2.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = ledGlow > 0.72 ? '#ffef8a' : '#ffd23f'
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(32, 7.5, 4.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Side Ears
    drawRoundedRect(ctx, 4.5, 27, 6.5, 16, 3.2)
    ctx.fillStyle = '#10b981'
    ctx.fill()
    ctx.strokeStyle = '#143229'
    ctx.lineWidth = 1.6
    ctx.stroke()

    drawRoundedRect(ctx, 53, 27, 6.5, 16, 3.2)
    ctx.fillStyle = '#10b981'
    ctx.fill()
    ctx.stroke()

    // Big Bold Rounded Head
    drawRoundedRect(ctx, 9.5, 16.5, 45, 37, 13)
    ctx.fillStyle = '#193c33'
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3.6
    ctx.stroke()

    // Dark Face Visor Screen
    drawRoundedRect(ctx, 15, 22, 34, 25, 8.5)
    ctx.fillStyle = '#07110d'
    ctx.fill()
    ctx.strokeStyle = '#255243'
    ctx.lineWidth = 1.4
    ctx.stroke()

    // Glowing Cyan Eyes (smooth glance + soft blink)
    const eyeH = 10.5 * eyeScaleY
    const eyeY = 32 - eyeH / 2
    ctx.fillStyle = '#7fe7ff'
    drawRoundedRect(ctx, 21 + eyeShiftX, eyeY, 7.5, eyeH, Math.min(3.6, eyeH / 2))
    ctx.fill()
    drawRoundedRect(ctx, 35.5 + eyeShiftX, eyeY, 7.5, eyeH, Math.min(3.6, eyeH / 2))
    ctx.fill()

    // Eye catchlight shine when open
    if (eyeScaleY > 0.7) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.beginPath()
      ctx.arc(23.5 + eyeShiftX, eyeY + 2.6, 1.4, 0, Math.PI * 2)
      ctx.arc(38 + eyeShiftX, eyeY + 2.6, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Smooth Friendly Smile
    ctx.strokeStyle = '#7fe7ff'
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(25 + eyeShiftX * 0.45, 40.2)
    ctx.quadraticCurveTo(32 + eyeShiftX * 0.45, 44.8, 39 + eyeShiftX * 0.45, 40.2)
    ctx.stroke()

    ctx.restore()
    return canvas.toDataURL('image/png')
  })
}

/**
 * Hook to dynamically toggle the Chrome tab favicon:
 * - Landing page ('/'): Smoothly animated Snowflex AI Robot face
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

    const frames = buildRobotFaceFrames()
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
