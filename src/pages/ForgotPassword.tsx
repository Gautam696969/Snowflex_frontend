import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Input from '../components/Input'
import Button from '../components/Button'
import LoadingButton from '../components/LoadingButton'
import AuthLayout from '../layouts/AuthLayout'
import { isValidEmail } from '../lib/validation'
import { forgotPassword } from '../lib/auth-api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const emailError = !email.trim()
    ? 'Email is required.'
    : !isValidEmail(email)
      ? 'Enter a valid email address.'
      : ''
  const isValid = !emailError

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (!isValid || loading) return

    setServerError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
      toast.success('Reset link requested.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to request password reset.'
      setServerError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setServerError('')
    if (submitted) setSubmitted(false)
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email address and we'll send you instructions to reset your password."
    >
      {submitted ? (
        <div className="auth-form">
          <div className="notice success-notice" role="status">
            If this email exists, a reset link has been sent.
          </div>
          <p className="form-hint" style={{ marginBottom: '16px' }}>
            Please check your email inbox (or backend logs in development) for your 15-minute reset link.
          </p>
          <Button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setEmail('')
              setTouched(false)
            }}
          >
            Send another link
          </Button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="notice error-notice" role="alert">{serverError}</div>}
          <Input
            id="forgot-email"
            label="Email address"
            type="email"
            value={email}
            placeholder="you@company.com"
            autoComplete="email"
            error={touched ? emailError : ''}
            onChange={handleEmailChange}
            onBlur={() => setTouched(true)}
          />

          <LoadingButton loading={loading} disabled={!isValid}>
            Send reset link
          </LoadingButton>
        </form>
      )}

      <p className="auth-switch">
        Remember your password?<Link className="text-link" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
