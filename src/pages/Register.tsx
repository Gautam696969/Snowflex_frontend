import { useState, type ChangeEvent, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import FormError from '../components/FormError'
import Input from '../components/Input'
import LoadingButton from '../components/LoadingButton'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../layouts/AuthLayout'
import { getRegistrationErrors } from '../lib/validation'
import { register } from '../lib/auth-api'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmation: false,
    acceptedTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [serverError, setServerError] = useState('')

  const errors = getRegistrationErrors(fullName, email, password, confirmation, acceptedTerms)
  const isValid = Object.values(errors).every((error) => !error)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmation: true,
      acceptedTerms: true,
    })
    if (!isValid || loading) return

    setNotice('')
    setServerError('')
    setLoading(true)
    try {
      const result = await register({ fullName: fullName.trim(), email: email.trim(), password })
      setNotice(result.message || 'User registered successfully. You can now sign in.')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  function updateValue(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value)
      setNotice('')
      setServerError('')
    }
  }

  return (
    <AuthLayout title="Create your account" description="A little more clarity for your next big thing.">
      <form className="auth-form register-form flex flex-col gap-[14px] mt-[30px]" onSubmit={handleSubmit} noValidate>
        <Input
          id="fullName"
          label="Full name"
          value={fullName}
          placeholder="Jamie Morgan"
          autoComplete="name"
          error={touched.fullName ? errors.fullName : ''}
          onChange={updateValue(setFullName)}
          onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
        />
        <Input
          id="email"
          label="Email address"
          type="email"
          value={email}
          placeholder="you@company.com"
          autoComplete="email"
          error={touched.email ? errors.email : ''}
          onChange={updateValue(setEmail)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        />
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={touched.password ? errors.password : ''}
          onChange={updateValue(setPassword)}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        />
        <PasswordInput
          id="confirmation"
          label="Confirm password"
          value={confirmation}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={touched.confirmation ? errors.confirmation : ''}
          onChange={updateValue(setConfirmation)}
          onBlur={() => setTouched((current) => ({ ...current, confirmation: true }))}
        />

        <div className="terms-field flex flex-col gap-[5px] [&_.form-error]:ml-[25px]">
          <label className="check-label inline-flex min-h-[24px] items-center gap-[9px] text-[#545e53] text-[13px] leading-[1.45] cursor-pointer" htmlFor="terms">
            <input
              className="check-control w-[16px] h-[16px] shrink-0 m-0 accent-[var(--accent,#ed6b4f)] cursor-pointer focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2"
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              aria-invalid={Boolean(touched.acceptedTerms && errors.acceptedTerms)}
              aria-describedby={touched.acceptedTerms && errors.acceptedTerms ? 'terms-error' : undefined}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked)
                setTouched((current) => ({ ...current, acceptedTerms: true }))
              }}
            />
            <span>I agree to the Terms &amp; Conditions</span>
          </label>
          <FormError id="terms-error">{touched.acceptedTerms ? errors.acceptedTerms : ''}</FormError>
        </div>

        <LoadingButton loading={loading} disabled={!isValid}>Create account</LoadingButton>
        {notice && (
          <div className="form-notice flex items-start gap-[10px] p-[12px_13px] border border-[#d5e8cb] rounded-[5px] bg-[#f2f8ee] text-[#38613d] text-[13px] leading-[1.5] [&>svg]:shrink-0 [&>svg]:mt-[1px]" role="status">
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}
        {serverError && (
          <div className="form-error -mt-[2px] mb-0 text-[#b83d32] text-[12px] leading-[1.4]" role="alert">
            <span>{serverError}</span>
          </div>
        )}
      </form>

      <p className="auth-switch mt-[25px] mb-0 text-[#788176] text-[13px] text-center [&_.text-link]:ml-[4px]">
        Already have an account?<Link className="text-link p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2 ml-[4px]" to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}