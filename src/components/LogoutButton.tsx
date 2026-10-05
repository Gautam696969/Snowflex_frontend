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
      ? 'logout-btn danger'
      : variant === 'ghost'
        ? 'logout-btn ghost'
        : 'logout-btn'

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
          className="modal-overlay"
          onClick={() => setShowConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#dc2626" />
                <h3 id="logout-confirm-title" style={{ margin: 0, fontSize: '16px' }}>
                  Sign Out Confirmation
                </h3>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, color: 'var(--text-sub, #4b5563)', fontSize: '14px', lineHeight: 1.5 }}>
                Are you sure you want to sign out of Snowflex People Operations? You will need to enter your credentials to access your workspace again.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px' }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Stay Signed In
              </button>
              <button
                type="button"
                className="primary-action"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                onClick={handleConfirmLogout}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="spinning" />
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
