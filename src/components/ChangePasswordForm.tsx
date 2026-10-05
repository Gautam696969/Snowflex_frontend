import { useState, useMemo, type FormEvent } from 'react'
import {
  KeyRound, Eye, EyeOff, Check, X, ShieldAlert,
  Loader2, AlertCircle, CheckCircle2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { changePassword } from '../lib/profile-api'

interface ChangePasswordFormProps {
  token: string
  hasPassword?: boolean
  onPasswordChanged?: () => void
}

export default function ChangePasswordForm({
  token,
  hasPassword = true,
  onPasswordChanged,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [clientError, setClientError] = useState('')

  // Password rules evaluation
  const rules = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSymbol: /[^A-Za-z0-9]/.test(newPassword),
    }
  }, [newPassword])

  const strengthScore = useMemo(() => {
    let score = 0
    if (rules.minLength) score++
    if (rules.hasUpper) score++
    if (rules.hasLower) score++
    if (rules.hasNumber) score++
    if (rules.hasSymbol) score++
    return score
  }, [rules])

  const isPasswordValid = strengthScore === 5
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setClientError('')

    if (hasPassword && !currentPassword) {
      setClientError('Current password is required')
      return
    }

    if (!isPasswordValid) {
      setClientError('New password must satisfy all 5 security requirements')
      return
    }

    if (!isMatch) {
      setClientError('Confirmation password does not match new password')
      return
    }

    if (hasPassword && currentPassword === newPassword) {
      setClientError('New password cannot be identical to your current password')
      return
    }

    setSaving(true)
    try {
      await changePassword(token, {
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      })
      toast.success(
        hasPassword ? 'Password updated successfully!' : 'Password created successfully!'
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setClientError('')
      if (onPasswordChanged) onPasswordChanged()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.'
      setClientError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const getStrengthLabel = () => {
    if (strengthScore <= 1) return { label: 'Weak', color: '#ef4444' }
    if (strengthScore <= 3) return { label: 'Moderate', color: '#f59e0b' }
    if (strengthScore === 4) return { label: 'Good', color: '#84cc16' }
    return { label: 'Strong', color: '#10b981' }
  }

  const strength = getStrengthLabel()

  return (
    <form className="profile-form-card security-card" onSubmit={handleSubmit} noValidate>
      <div className="profile-form-header">
        <div>
          <span className="dash-kicker">ACCOUNT SECURITY</span>
          <h2 className="profile-card-title">
            {hasPassword ? 'Change Account Password' : 'Set Account Password'}
          </h2>
          <p className="profile-card-sub">
            {hasPassword
              ? 'Update your password regularly to keep your enterprise workspace secure.'
              : 'Add a secure password to enable direct email and password authentication.'}
          </p>
        </div>
      </div>

      {!hasPassword && (
        <div className="security-notice-box">
          <ShieldAlert size={18} />
          <span>
            This account currently signs in via identity token or was registered without a primary password. Set a new password below.
          </span>
        </div>
      )}

      {clientError && (
        <div className="notice error-notice" role="alert" style={{ marginBottom: '16px' }}>
          <AlertCircle size={15} />
          <span>{clientError}</span>
        </div>
      )}

      <div className="security-fields-col">
        {/* Current Password (if account already has a password) */}
        {hasPassword && (
          <div className="profile-field-group">
            <label htmlFor="sec-currentPassword" className="profile-field-label">
              <KeyRound size={14} />
              <span>Current Password <strong className="required-star">*</strong></span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="sec-currentPassword"
                type={showCurrent ? 'text' : 'password'}
                className="profile-field-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  if (clientError) setClientError('')
                }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* New Password */}
        <div className="profile-field-group">
          <label htmlFor="sec-newPassword" className="profile-field-label">
            <KeyRound size={14} />
            <span>New Password <strong className="required-star">*</strong></span>
          </label>
          <div className="password-input-wrapper">
            <input
              id="sec-newPassword"
              type={showNew ? 'text' : 'password'}
              className="profile-field-input"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (clientError) setClientError('')
              }}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength Meter Bar */}
          {newPassword.length > 0 && (
            <div className="password-meter-wrap">
              <div className="meter-header">
                <span className="meter-label">Password Strength:</span>
                <span className="meter-val" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="meter-bar-track">
                <div
                  className="meter-bar-fill"
                  style={{
                    width: `${(strengthScore / 5) * 100}%`,
                    background: strength.color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Live Security Checklist */}
          <div className="password-rules-checklist">
            <div className={`rule-item ${rules.minLength ? 'passed' : ''}`}>
              {rules.minLength ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>At least 8 characters</span>
            </div>
            <div className={`rule-item ${rules.hasUpper ? 'passed' : ''}`}>
              {rules.hasUpper ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Uppercase letter (A–Z)</span>
            </div>
            <div className={`rule-item ${rules.hasLower ? 'passed' : ''}`}>
              {rules.hasLower ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Lowercase letter (a–z)</span>
            </div>
            <div className={`rule-item ${rules.hasNumber ? 'passed' : ''}`}>
              {rules.hasNumber ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>At least one number (0–9)</span>
            </div>
            <div className={`rule-item ${rules.hasSymbol ? 'passed' : ''}`}>
              {rules.hasSymbol ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Special symbol (!@#$%^&*)</span>
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="profile-field-group">
          <label htmlFor="sec-confirmPassword" className="profile-field-label">
            <KeyRound size={14} />
            <span>Confirm New Password <strong className="required-star">*</strong></span>
          </label>
          <div className="password-input-wrapper">
            <input
              id="sec-confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className={`profile-field-input ${
                confirmPassword.length > 0 && !isMatch ? 'has-error' : ''
              }`}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (clientError) setClientError('')
              }}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword.length > 0 && isMatch && (
            <span className="password-match-badge success">
              <CheckCircle2 size={12} /> Passwords match
            </span>
          )}
          {confirmPassword.length > 0 && !isMatch && (
            <span className="password-match-badge error">
              <AlertCircle size={12} /> Passwords do not match
            </span>
          )}
        </div>
      </div>

      <div className="security-form-footer">
        <button
          type="submit"
          className="primary-action"
          disabled={!isPasswordValid || !isMatch || saving || (hasPassword && !currentPassword)}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="spinning" />
              <span>Updating Password…</span>
            </>
          ) : (
            <>
              <KeyRound size={14} />
              <span>{hasPassword ? 'Update Password' : 'Save Password'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
