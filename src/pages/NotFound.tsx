import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Compass, Home, LayoutDashboard, LogIn, Sparkles, UserPlus } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { readToken } from '../lib/auth-api'

export default function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = Boolean(readToken())

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/login')
    }
  }

  return (
    <main className="not-found-shell">
      <header className="not-found-topbar">
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="brand-lockup" aria-label="Home">
          <span className="brand-mark">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <span>northstar</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="not-found-container" aria-labelledby="not-found-title">
        <div className="not-found-card">
          <div className="not-found-badge">
            <Compass size={18} className="spin-slow" aria-hidden="true" />
            <span>Error 404 • Lost in Transit</span>
          </div>

          <h1 className="not-found-digits" aria-hidden="true">
            404
          </h1>

          <h2 id="not-found-title" className="not-found-heading">
            Page not found
          </h2>

          <p className="not-found-message">
            We couldn't find the page at{' '}
            <code className="not-found-path">{location.pathname}</code>.
            It may have been moved, deleted, or the address might be mistyped.
          </p>

          <div className="not-found-actions">
            <button
              type="button"
              onClick={handleGoBack}
              className="not-found-secondary-btn"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Go back</span>
            </button>

            {isAuthenticated ? (
              <Link to="/dashboard" className="not-found-primary-btn">
                <LayoutDashboard size={16} aria-hidden="true" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <Link to="/login" className="not-found-primary-btn">
                <LogIn size={16} aria-hidden="true" />
                <span>Sign in</span>
              </Link>
            )}
          </div>

          <div className="not-found-divider" />

          <div className="not-found-helpful">
            <span className="not-found-helpful-label">Quick destinations:</span>
            <div className="not-found-helpful-links">
              <Link to="/dashboard" className="not-found-pill-link">
                <Home size={13} aria-hidden="true" />
                <span>Dashboard</span>
              </Link>
              <Link to="/login" className="not-found-pill-link">
                <LogIn size={13} aria-hidden="true" />
                <span>Login</span>
              </Link>
              <Link to="/register" className="not-found-pill-link">
                <UserPlus size={13} aria-hidden="true" />
                <span>Register</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="not-found-footer">
        <span className="brand-footnote">
          <Sparkles size={13} aria-hidden="true" />
          Snowflex People Operations & Workspace
        </span>
      </footer>
    </main>
  )
}
