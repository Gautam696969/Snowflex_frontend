import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Button from '../components/Button'
import LoadingButton from '../components/LoadingButton'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../layouts/AuthLayout'
import { resetPassword } from '../lib/auth-api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState({ password: false, confirmPassword: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const passwordError = !password
    ? 'Password is required.'
    : password.length < 8
      ? 'Use at least 8 characters.'
      : ''

  const confirmError = !confirmPassword
    ? 'Please confirm your password.'
    : confirmPassword !== password
      ? 'Passwords do not match.'
      : ''

  const isValid = !passwordError && !confirmError && Boolean(token)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ password: true, confirmPassword: true })
    if (!isValid || loading) return

    setServerError('')
    setLoading(true)
    try {
      await resetPassword({ token, password })
      setSuccess(true)
      toast.success('Password reset successful!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset password.'
      setServerError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setServerError('')
  }

  function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(event.target.value)
    setServerError('')
  }

  return (
    <AuthLayout
      title="Create new password"
      description="Choose a secure new password for your Northstar account."
    >
      {!token ? (
        <div className="auth-form flex flex-col gap-[18px] mt-[30px]">
          <div className="notice error-notice mb-[14px] p-[10px_12px] border border-[#efd1c9] rounded-[4px] text-[11px] text-[#9a483c] bg-[#fff7f4] dark:border-[#5a2e28] dark:text-[#f8b4ab] dark:bg-[#2f1715]" role="alert">
            Invalid or missing reset token. Please request a new password reset link.
          </div>
          <Link to="/forgot-password" className="text-link inline-block mt-[12px] p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2">
            Request new reset link
          </Link>
        </div>
      ) : success ? (
        <div className="auth-form flex flex-col gap-[18px] mt-[30px]">
          <div className="notice success-notice mb-[14px] p-[10px_12px] border border-[#d5e6cb] rounded-[4px] text-[11px] text-[#446a43] bg-[#f4f9ef] dark:border-[#3e6147] dark:text-[#c6e3c0] dark:bg-[#1b3023]" role="status">
            Password reset successful! Redirecting to sign in...
          </div>
          <Button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
          >
            Go to sign in now
          </Button>
        </div>
      ) : (
        <form className="auth-form flex flex-col gap-[18px] mt-[30px]" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="notice error-notice mb-[14px] p-[10px_12px] border border-[#efd1c9] rounded-[4px] text-[11px] text-[#9a483c] bg-[#fff7f4] dark:border-[#5a2e28] dark:text-[#f8b4ab] dark:bg-[#2f1715]" role="alert">{serverError}</div>}

          <PasswordInput
            id="new-password"
            label="New password"
            placeholder="At least 8 characters"
            value={password}
            autoComplete="new-password"
            error={touched.password ? passwordError : ''}
            onChange={handlePasswordChange}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm new password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            autoComplete="new-password"
            error={touched.confirmPassword ? confirmError : ''}
            onChange={handleConfirmPasswordChange}
            onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
          />

          <LoadingButton loading={loading} disabled={!isValid}>
            Reset password
          </LoadingButton>
        </form>
      )}

      <p className="auth-switch mt-[25px] mb-0 text-[#788176] text-[13px] text-center [&_.text-link]:ml-[4px]">
        Remember your password?<Link className="text-link p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2 ml-[4px]" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
