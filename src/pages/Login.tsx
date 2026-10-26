import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { AlertCircle } from 'lucide-react'
import Input from '../components/Input'
import LoadingButton from '../components/LoadingButton'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../layouts/AuthLayout'
import { getLoginErrors } from '../lib/validation'
import { login, storeToken } from '../lib/auth-api'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState(false)
  const [helpMessage, setHelpMessage] = useState('')
  const [serverError, setServerError] = useState('')
  const [deactivatedNotice, setDeactivatedNotice] = useState('')

  useEffect(() => {
    const noticeFromUrl = searchParams.get('notice')
    const noticeFromStorage = sessionStorage.getItem('deactivated_notice')
    if (noticeFromUrl || noticeFromStorage) {
      const msg = noticeFromUrl || noticeFromStorage || 'Your account has been deactivated. Please contact HR.'
      setDeactivatedNotice(msg)
      sessionStorage.removeItem('deactivated_notice')
    }
  }, [searchParams])

  const errors = getLoginErrors(email, password)
  const isValid = !errors.email && !errors.password

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (!isValid || loading) return

    setHelpMessage('')
    setServerError('')
    setLoading(true)
    const cleanEmail = email.trim()
    console.log(`[DEBUG_AUTH] Login initiated for: "${cleanEmail}"`)
    try {
      const result = await login({ email: cleanEmail, password })
      storeToken(result.token, remember)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.'
      console.warn(`[DEBUG_AUTH] Login failed: "${message}"`)
      setServerError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setServerError('')
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setServerError('')
  }

  return (
    <AuthLayout title="Login Page" description="Sign in to pick up right where you left off.">
      {deactivatedNotice && (
        <div
          className="deactivated-account-banner"
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{deactivatedNotice}</span>
        </div>
      )}
      <form className="auth-form flex flex-col gap-[18px] mt-[30px]" onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          label="Email address"
          type="email"
          value={email}
          placeholder="you@company.com"
          autoComplete="email"
          error={touched.email ? errors.email : ''}
          onChange={handleEmailChange}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        />
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          autoComplete="current-password"
          error={touched.password ? errors.password : ''}
          onChange={handlePasswordChange}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        />

        <div className="form-options flex items-center justify-between gap-[12px] -mt-[2px] max-[380px]:items-start">
          <label className="check-label inline-flex min-h-[24px] items-center gap-[9px] text-[#545e53] text-[13px] leading-[1.45] cursor-pointer" htmlFor="remember">
            <input
              className="check-control w-[16px] h-[16px] shrink-0 m-0 accent-[var(--accent,#ed6b4f)] cursor-pointer focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2"
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <Link className="text-link p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {helpMessage && <p className="form-hint -mt-[9px] mb-0 text-[#687368] text-[12px] leading-[1.45]" role="status">{helpMessage}</p>}
        {serverError && <p className="form-hint -mt-[9px] mb-0 text-[#687368] text-[12px] leading-[1.45]" role="alert">{serverError}</p>}
        <LoadingButton loading={loading} disabled={!isValid}>Log in</LoadingButton>
      </form>

      <p className="auth-switch mt-[25px] mb-0 text-[#788176] text-[13px] text-center [&_.text-link]:ml-[4px]">
        Don&apos;t have an account?<Link className="text-link p-0 border-0 bg-transparent text-[#bc503b] text-[13px] font-semibold no-underline cursor-pointer transition-colors duration-150 ease-out hover:text-[#913b2b] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2 ml-[4px]" to="/register">Create account</Link>
      </p>
    </AuthLayout>
  )
}