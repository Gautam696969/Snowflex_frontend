import { useState } from 'react'
import { Download, X, Smartphone, Share2, PlusSquare } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

interface PwaInstallBannerProps {
  variant?: 'banner' | 'card' | 'inline'
  className?: string
}

export default function PwaInstallBanner({ variant = 'banner', className = '' }: PwaInstallBannerProps) {
  const { canInstall, isInstalled, isIOS, installApp } = usePWAInstall()
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('snowflex.pwa_dismissed') === 'true'
  })
  const [installing, setInstalling] = useState(false)

  // Don't render if already installed, dismissed, or unsupported
  if (isInstalled || dismissed || (!canInstall && !isIOS)) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('snowflex.pwa_dismissed', 'true')
  }

  const handleInstallClick = async () => {
    setInstalling(true)
    try {
      await installApp()
    } finally {
      setInstalling(false)
    }
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#193c33] hover:bg-[#255246] text-white text-[12px] font-bold shadow-sm transition-all cursor-pointer ${className}`}
        title="Install Snowflex App on your device"
      >
        <Smartphone size={15} />
        <span>Install App</span>
      </button>
    )
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#193c33_0%,#0f2821_100%)] text-white p-3.5 sm:p-4 shadow-lg border border-[#2d4d42] animate-fade-in ${className}`}
      role="banner"
      aria-label="Install Snowflex Progressive Web App"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Icon & Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-[#10b981]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#10b981]/30 text-[#a7f3d0]">
                Android & Mobile PWA
              </span>
            </div>
            <strong className="text-[13.5px] sm:text-[14.5px] font-bold text-white truncate leading-tight mt-0.5">
              Install Snowflex App
            </strong>
            <p className="m-0 text-[11px] sm:text-[12px] text-[#9cb2a3] leading-tight truncate mt-0.5">
              Instant camera check-in & quick shift logging from home screen
            </p>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {canInstall && (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-bold shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Download size={14} />
              <span>{installing ? 'Installing…' : 'Install'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#7e9988] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss install banner"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* iOS Instructions fallback */}
      {isIOS && !canInstall && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-[#a7f3d0] leading-tight">
          <Share2 size={13} className="shrink-0" />
          <span>
            To install on iPhone: Tap <strong>Share</strong>, then select <strong>Add to Home Screen</strong>{' '}
            <PlusSquare size={12} className="inline ml-0.5" />.
          </span>
        </div>
      )}
    </div>
  )
}

