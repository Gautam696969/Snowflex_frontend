import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { clearToken, getCurrentUser, logout, readToken } from '../lib/auth-api'
import type { SafeUser } from '../lib/auth-api'
import { SkeletonAccount } from '../components/Skeleton'

export default function Account() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    const token = readToken()
    if (!token) {
      navigate('/login', { replace: true })
      return () => { active = false }
    }

    getCurrentUser(token)
      .then((authenticatedUser) => {
        if (active) setUser(authenticatedUser)
      })
      .catch(() => {
        clearToken()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [navigate])

  async function handleLogout() {
    const token = readToken()
    setSigningOut(true)
    try {
      if (token) await logout(token)
    } catch {
      // Clear the local token even if the API cannot be reached.
    } finally {
      clearToken()
      navigate('/login', { replace: true })
      setSigningOut(false)
    }
  }

  return (
    <AuthLayout title="Your account" description="Your current Snowflex sign-in details.">
      {loading ? (
        <SkeletonAccount />
      ) : user ? (
        <div className="account-card">
          <div className="account-avatar" aria-hidden="true">{user.fullName.slice(0, 1).toUpperCase()}</div>
          <dl className="account-details">
            <div><dt>Full name</dt><dd>{user.fullName}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Role</dt><dd>{user.role}</dd></div>
          </dl>
          <button className="primary-button" type="button" onClick={handleLogout} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </AuthLayout>
  )
}
