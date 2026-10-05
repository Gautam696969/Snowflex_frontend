import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Input from '../components/Input'
import LoadingButton from '../components/LoadingButton'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../layouts/AuthLayout'
import { getLoginErrors } from '../lib/validation'
import { login, storeToken } from '../lib/auth-api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState(false)
  const [helpMessage, setHelpMessage] = useState('')
  const [serverError, setServerError] = useState('')

  const errors = getLoginErrors(email, password)
  const isValid = !errors.email && !errors.password

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (!isValid || loading) return

    setHelpMessage('')
    setServerError('')
    setLoading(true)
    try {
      const result = await login({ email, password })
      storeToken(result.token, remember)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.'
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
    <AuthLayout title="Welcome back" description="Sign in to pick up right where you left off.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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

        <div className="form-options">
          <label className="check-label" htmlFor="remember">
            <input
              className="check-control"
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <Link className="text-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {helpMessage && <p className="form-hint" role="status">{helpMessage}</p>}
        {serverError && <p className="form-hint" role="alert">{serverError}</p>}
        <LoadingButton loading={loading} disabled={!isValid}>Log in</LoadingButton>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account?<Link className="text-link" to="/register">Create account</Link>
      </p>
    </AuthLayout>
  )
}