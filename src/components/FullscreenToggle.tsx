import { useState, useEffect } from 'react'
import { Maximize, Minimize } from 'lucide-react'

interface FullscreenToggleProps {
  className?: string
  iconSize?: number
}

export default function FullscreenToggle({ className = '', iconSize = 16 }: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    // Check fullscreen support
    const supported =
      typeof document !== 'undefined' &&
      Boolean(
        document.fullscreenEnabled ||
          (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
          (document as unknown as { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
          (document as unknown as { msFullscreenEnabled?: boolean }).msFullscreenEnabled
      )
    setIsSupported(supported)

    const handleFullscreenChange = () => {
      const activeElement =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
      setIsFullscreen(Boolean(activeElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  if (!isSupported) {
    return null
  }

  const toggleFullscreen = async () => {
    try {
      const doc = document as unknown as {
        fullscreenElement?: Element
        webkitFullscreenElement?: Element
        exitFullscreen?: () => Promise<void>
        webkitExitFullscreen?: () => Promise<void>
      }

      const docEl = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>
        webkitRequestFullscreen?: () => Promise<void>
      }

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen()
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen()
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={`icon-button grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] dark:border-[#2d3a31] rounded-[5px] text-[#546a5d] dark:text-[#a0b2a5] bg-white dark:bg-[#18231d] hover:bg-[#f3f6ef] dark:hover:bg-[#223128] transition-colors cursor-pointer shrink-0 ${className}`}
      title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
      aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
    >
      {isFullscreen ? (
        <Minimize size={iconSize} className="text-[#10b981]" />
      ) : (
        <Maximize size={iconSize} />
      )}
    </button>
  )
}

