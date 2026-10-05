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
        <div className="auth-form">
          <div className="notice error-notice" role="alert">
            Invalid or missing reset token. Please request a new password reset link.
          </div>
          <Link to="/forgot-password" className="text-link" style={{ display: 'inline-block', marginTop: '12px' }}>
            Request new reset link
          </Link>
        </div>
      ) : success ? (
        <div className="auth-form">
          <div className="notice success-notice" role="status">
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
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="notice error-notice" role="alert">{serverError}</div>}

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

      <p className="auth-switch">
        Remember your password?<Link className="text-link" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
