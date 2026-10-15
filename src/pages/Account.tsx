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
        <div className="account-card grid gap-[22px] mt-[30px]">
          <div className="account-avatar grid w-[54px] h-[54px] place-items-center rounded-[8px] bg-[#d5e6b6] text-[#44553a] font-bold text-[22px] font-['Manrope',sans-serif]" aria-hidden="true">{user.fullName.slice(0, 1).toUpperCase()}</div>
          <dl className="account-details grid gap-[16px] m-0 py-[18px] px-0 border-t border-b border-[#e9ece6]">
            <div className="grid gap-[4px]"><dt className="text-[var(--muted,#778077)] text-[12px]">Full name</dt><dd className="m-0 text-[var(--ink,#20251f)] text-[14px] font-semibold [overflow-wrap:anywhere]">{user.fullName}</dd></div>
            <div className="grid gap-[4px]"><dt className="text-[var(--muted,#778077)] text-[12px]">Email</dt><dd className="m-0 text-[var(--ink,#20251f)] text-[14px] font-semibold [overflow-wrap:anywhere]">{user.email}</dd></div>
            <div className="grid gap-[4px]"><dt className="text-[var(--muted,#778077)] text-[12px]">Role</dt><dd className="m-0 text-[var(--ink,#20251f)] text-[14px] font-semibold [overflow-wrap:anywhere]">{user.role}</dd></div>
          </dl>
          <button className="primary-button inline-flex w-full min-h-[49px] items-center justify-center gap-[9px] border border-[var(--accent,#ed6b4f)] rounded-[5px] bg-[var(--accent,#ed6b4f)] text-white text-[14px] font-bold cursor-pointer transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out hover:not-disabled:-translate-y-[1px] hover:not-disabled:border-[var(--accent-dark,#d9543a)] hover:not-disabled:bg-[var(--accent-dark,#d9543a)] hover:not-disabled:shadow-[0_7px_16px_rgba(217,84,58,0.2)] active:not-disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-[0.54] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2" type="button" onClick={handleLogout} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </AuthLayout>
  )
}
