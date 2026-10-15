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
        <div className="auth-form flex flex-col gap-[18px] mt-[30px]">
          <div className="notice success-notice mb-[14px] p-[10px_12px] border border-[#d5e6cb] rounded-[4px] text-[11px] text-[#446a43] bg-[#f4f9ef] dark:border-[#3e6147] dark:text-[#c6e3c0] dark:bg-[#1b3023]" role="status">
            If this email exists, a reset link has been sent.
          </div>
          <p className="form-hint -mt-[9px] mb-[16px] text-[#687368] text-[12px] leading-[1.45]">
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
        <form className="auth-form flex flex-col gap-[18px] mt-[30px]" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="notice error-notice mb-[14px] p-[10px_12px] border border-[#efd1c9] rounded-[4px] text-[11px] text-[#9a483c] bg-[#fff7f4] dark:border-[#5a2e28] dark:text-[#f8b4ab] dark:bg-[#2f1715]" role="alert">{serverError}</div>}
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

      <p className="auth-switch mt-[25px] mb-0 text-[#788176] text-[13px] text-center [&_.text-link]:ml-[4px]">
        Remember your password?<Link className="text-link p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2 ml-[4px]" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
