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
    <form className="profile-form-card security-card bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#27372e] rounded-[16px] p-[28px] shadow-[0_4px_20px_rgba(20,36,29,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] mb-[24px] max-w-[680px]" onSubmit={handleSubmit} noValidate>
      <div className="profile-form-header flex items-start justify-between gap-[16px] mb-[24px] pb-[18px] border-b border-[#edf1eb] dark:border-[#25352c] flex-wrap">
        <div>
          <span className="dash-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">ACCOUNT SECURITY</span>
          <h2 className="profile-card-title text-[18px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] my-[4px] tracking-[-0.01em]">
            {hasPassword ? 'Change Account Password' : 'Set Account Password'}
          </h2>
          <p className="profile-card-sub text-[13px] text-[#65776d] dark:text-[#8c9d92] m-0">
            {hasPassword
              ? 'Update your password regularly to keep your enterprise workspace secure.'
              : 'Add a secure password to enable direct email and password authentication.'}
          </p>
        </div>
      </div>

      {!hasPassword && (
        <div className="security-notice-box flex items-center gap-[10px] px-[16px] py-[12px] bg-[#eff6ff] dark:bg-[#1e293b] border border-[#bfdbfe] dark:border-[#3b82f6] rounded-[10px] text-[#1e40af] dark:text-[#93c5fd] text-[13px] mb-[20px]">
          <ShieldAlert size={18} />
          <span>
            This account currently signs in via identity token or was registered without a primary password. Set a new password below.
          </span>
        </div>
      )}

      {clientError && (
        <div className="notice error-notice flex items-center gap-[8px] px-[14px] py-[10px] bg-[#fef2f2] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] text-[#dc2626] dark:text-[#f87171] rounded-[8px] text-[12px] mb-[16px]" role="alert">
          <AlertCircle size={15} />
          <span>{clientError}</span>
        </div>
      )}

      <div className="security-fields-col flex flex-col gap-[20px]">
        {/* Current Password (if account already has a password) */}
        {hasPassword && (
          <div className="profile-field-group flex flex-col gap-[6px]">
            <label htmlFor="sec-currentPassword" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
              <span className="inline-flex items-center gap-[6px]"><KeyRound size={14} />Current Password <strong className="required-star text-[#dc2626]">*</strong></span>
            </label>
            <div className="password-input-wrapper relative w-full">
              <input
                id="sec-currentPassword"
                type={showCurrent ? 'text' : 'password'}
                className="profile-field-input w-full px-[14px] py-[10px] pr-[42px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
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
                className="password-toggle-btn absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] flex items-center justify-center transition-colors"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* New Password */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="sec-newPassword" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><KeyRound size={14} />New Password <strong className="required-star text-[#dc2626]">*</strong></span>
          </label>
          <div className="password-input-wrapper relative w-full">
            <input
              id="sec-newPassword"
              type={showNew ? 'text' : 'password'}
              className="profile-field-input w-full px-[14px] py-[10px] pr-[42px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
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
              className="password-toggle-btn absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] flex items-center justify-center transition-colors"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength Meter Bar */}
          {newPassword.length > 0 && (
            <div className="password-meter-wrap mt-[8px]">
              <div className="meter-header flex justify-between text-[11px] font-semibold mb-[4px]">
                <span className="meter-label text-[#65776d] dark:text-[#8c9d92]">Password Strength:</span>
                <span className="meter-val font-bold" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="meter-bar-track w-full h-[5px] bg-[#edf1eb] dark:bg-[#27372e] rounded-full overflow-hidden">
                <div
                  className="meter-bar-fill h-full rounded-full transition-all duration-250 ease-in-out"
                  style={{
                    width: `${(strengthScore / 5) * 100}%`,
                    background: strength.color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Live Security Checklist */}
          <div className="password-rules-checklist grid grid-cols-2 max-[500px]:grid-cols-1 gap-[8px] mt-[10px] px-[14px] py-[12px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px]">
            <div className={`rule-item flex items-center gap-[7px] text-[11px] font-semibold ${rules.minLength ? 'passed text-[#166534] dark:text-[#4ade80]' : 'text-[#7b8f83] dark:text-[#8c9d92]'}`}>
              {rules.minLength ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>At least 8 characters</span>
            </div>
            <div className={`rule-item flex items-center gap-[7px] text-[11px] font-semibold ${rules.hasUpper ? 'passed text-[#166534] dark:text-[#4ade80]' : 'text-[#7b8f83] dark:text-[#8c9d92]'}`}>
              {rules.hasUpper ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Uppercase letter (A–Z)</span>
            </div>
            <div className={`rule-item flex items-center gap-[7px] text-[11px] font-semibold ${rules.hasLower ? 'passed text-[#166534] dark:text-[#4ade80]' : 'text-[#7b8f83] dark:text-[#8c9d92]'}`}>
              {rules.hasLower ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Lowercase letter (a–z)</span>
            </div>
            <div className={`rule-item flex items-center gap-[7px] text-[11px] font-semibold ${rules.hasNumber ? 'passed text-[#166534] dark:text-[#4ade80]' : 'text-[#7b8f83] dark:text-[#8c9d92]'}`}>
              {rules.hasNumber ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>At least one number (0–9)</span>
            </div>
            <div className={`rule-item flex items-center gap-[7px] text-[11px] font-semibold ${rules.hasSymbol ? 'passed text-[#166534] dark:text-[#4ade80]' : 'text-[#7b8f83] dark:text-[#8c9d92]'}`}>
              {rules.hasSymbol ? <Check size={13} strokeWidth={2.5} /> : <X size={13} />}
              <span>Special symbol (!@#$%^&*)</span>
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="sec-confirmPassword" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><KeyRound size={14} />Confirm New Password <strong className="required-star text-[#dc2626]">*</strong></span>
          </label>
          <div className="password-input-wrapper relative w-full">
            <input
              id="sec-confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className={`profile-field-input w-full px-[14px] py-[10px] pr-[42px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)] ${
                confirmPassword.length > 0 && !isMatch ? 'has-error border-[#dc2626] bg-[#fffafa] dark:bg-[#201414]' : ''
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
              className="password-toggle-btn absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] flex items-center justify-center transition-colors"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword.length > 0 && isMatch && (
            <span className="password-match-badge success inline-flex items-center gap-[4px] text-[11px] font-semibold mt-[4px] text-[#166534] dark:text-[#4ade80]">
              <CheckCircle2 size={12} /> Passwords match
            </span>
          )}
          {confirmPassword.length > 0 && !isMatch && (
            <span className="password-match-badge error inline-flex items-center gap-[4px] text-[11px] font-semibold mt-[4px] text-[#dc2626] dark:text-[#f87171]">
              <AlertCircle size={12} /> Passwords do not match
            </span>
          )}
        </div>
      </div>

      <div className="security-form-footer mt-[24px] pt-[18px] border-t border-[#edf1eb] dark:border-[#25352c]">
        <button
          type="submit"
          className="primary-action inline-flex items-center gap-[8px] px-[18px] py-[10px] text-[13px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isPasswordValid || !isMatch || saving || (hasPassword && !currentPassword)}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="spinning animate-spin" />
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
