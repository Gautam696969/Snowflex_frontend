import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, AlertCircle, X, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { clearToken, logout, readToken } from '../lib/auth-api'

interface LogoutButtonProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  onLogoutSuccess?: () => void
}

export default function LogoutButton({
  className = '',
  variant = 'danger',
  onLogoutSuccess,
}: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleConfirmLogout = async () => {
    setLoading(true)
    const token = readToken()
    try {
      if (token) {
        await logout(token).catch(() => {})
      }
    } finally {
      clearToken()
      sessionStorage.clear()
      if (onLogoutSuccess) onLogoutSuccess()
      toast.success('Signed out successfully.')
      navigate('/login', { replace: true })
    }
  }

  const buttonStyleClass =
    variant === 'danger'
      ? 'logout-btn danger inline-flex items-center gap-[8px] px-[16px] py-[8px] text-[12px] font-bold rounded-[8px] cursor-pointer transition-all duration-150 ease-out bg-[#fff5f5] border border-[#fecaca] text-[#dc2626] hover:bg-[#dc2626] hover:text-white hover:border-[#dc2626] dark:bg-[rgba(220,38,38,0.12)] dark:border-[rgba(220,38,38,0.35)] dark:hover:bg-[#dc2626] dark:hover:text-white'
      : variant === 'ghost'
        ? 'logout-btn ghost inline-flex items-center gap-[8px] px-[16px] py-[8px] text-[12px] font-bold rounded-[8px] cursor-pointer transition-all duration-150 ease-out bg-transparent border-0 text-[#7b8f83] hover:text-[#dc2626]'
        : 'logout-btn inline-flex items-center gap-[8px] px-[16px] py-[8px] text-[12px] font-bold rounded-[8px] cursor-pointer transition-all duration-150 ease-out'

  return (
    <>
      <button
        type="button"
        className={`${buttonStyleClass} ${className}`.trim()}
        onClick={() => setShowConfirm(true)}
        title="Sign out of your account"
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>

      {showConfirm && (
        <div
          className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease] dark:bg-[rgba(0,0,0,0.68)]"
          onClick={() => setShowConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="modal w-[min(100%,360px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease] dark:border-[#303b34] dark:bg-[#1a231e]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb] dark:border-[#303b34]">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#dc2626" />
                <h3 id="logout-confirm-title" style={{ margin: 0, fontSize: '16px' }}>
                  Sign Out Confirmation
                </h3>
              </div>
              <button
                className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33] dark:hover:bg-[#25322a] dark:hover:text-[#edf2ec]"
                type="button"
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body m-0 p-[20px] text-[#546a5d] text-[14px] leading-[1.5] dark:text-[#a4b2a8]" style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, color: 'var(--text-sub, #4b5563)', fontSize: '14px', lineHeight: 1.5 }}>
                Are you sure you want to sign out of Snowflex People Operations? You will need to enter your credentials to access your workspace again.
              </p>
            </div>

            <div className="modal-footer flex justify-end gap-[10px] p-[16px_24px] border-t border-[#edf0eb] dark:border-[#303b34]">
              <button
                type="button"
                className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] py-0 border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] dark:border-[#303b34] dark:bg-[#1a231e] dark:text-[#c9d6cc] dark:hover:bg-[#25322a]"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Stay Signed In
              </button>
              <button
                type="button"
                className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] py-0 border rounded-[4px] font-semibold text-[11px] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                onClick={handleConfirmLogout}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="spinning animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    Sign Out Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
