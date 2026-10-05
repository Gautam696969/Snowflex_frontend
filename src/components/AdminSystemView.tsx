import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Server, Snowflake, Mail, Send, Activity, RefreshCw, Database
} from 'lucide-react'
import { sendAdminTestEmail, type AdminSystemInfo } from '../lib/auth-api'

interface AdminSystemViewProps {
  systemInfo: AdminSystemInfo | null
  token: string
  adminEmail: string
  onRefresh: () => void
  loading: boolean
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

export default function AdminSystemView({
  systemInfo,
  token,
  adminEmail,
  onRefresh,
  loading,
}: AdminSystemViewProps) {
  const [testEmail, setTestEmail] = useState(adminEmail)
  const [sendingTest, setSendingTest] = useState(false)

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!testEmail.trim()) {
      toast.error('Please enter a destination email address')
      return
    }

    setSendingTest(true)
    try {
      await sendAdminTestEmail(token, testEmail.trim())
      toast.success(`Test email dispatched to ${testEmail}! Check your inbox.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const db = systemInfo?.database
  const email = systemInfo?.email
  const server = systemInfo?.server
  const counts = systemInfo?.counts

  return (
    <div className="admin-system-view">
      {/* Top Bar: Status Banner & Refresh */}
      <div className="admin-system-header">
        <div>
          <span className="dash-kicker">INFRASTRUCTURE HEALTH</span>
          <h2>Platform Health & Engine Diagnostics</h2>
          <p>Real-time telemetry for Snowflake data warehouse, SMTP mail delivery, and runtime services.</p>
        </div>
        <button
          className="admin-action-button"
          onClick={onRefresh}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Main Diagnostic Cards Grid */}
      <div className="admin-diag-grid">
        {/* Card 1: Snowflake Cloud Data Warehouse */}
        <article className="overview-card admin-diag-card">
          <div className="overview-card-header">
            <div className="admin-card-icon-title">
              <div className="admin-card-badge snowflake">
                <Snowflake size={20} />
              </div>
              <div>
                <h2>Snowflake Data Warehouse</h2>
                <p>Enterprise data cloud connection</p>
              </div>
            </div>
            <div className="dash-snowflake-pill">
              <span className="dash-pulse-dot" />
              <span>{db?.status || 'CONNECTED'}</span>
            </div>
          </div>

          <div className="admin-diag-content">
            <div className="admin-param-row">
              <span className="admin-param-key">Database</span>
              <span className="admin-param-val">{db?.database || 'AUTH_PROJECT'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Schema</span>
              <span className="admin-param-val">{db?.schema || 'PUBLIC'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Compute Warehouse</span>
              <span className="admin-param-val">{db?.warehouse || 'SNOWFLAKE_LEARNING_WH'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Snowflake Account</span>
              <span className="admin-param-val">{db?.account || 'KKTYMTL-MH92776'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Query Security</span>
              <span className="admin-param-val highlight">Binds & Prepared Statements</span>
            </div>
          </div>
        </article>

        {/* Card 2: Gmail SMTP / Mail Engine */}
        <article className="overview-card admin-diag-card">
          <div className="overview-card-header">
            <div className="admin-card-icon-title">
              <div className="admin-card-badge mail">
                <Mail size={20} />
              </div>
              <div>
                <h2>Mail Delivery Engine</h2>
                <p>Dynamic password reset & system alerts</p>
              </div>
            </div>
            <span className={`status-pill ${email?.configured ? 'status-active' : 'status-pending'}`}>
              <span className="status-pill-dot" />
              {email?.configured ? 'SMTP READY' : 'DEV MODE'}
            </span>
          </div>

          <div className="admin-diag-content">
            <div className="admin-param-row">
              <span className="admin-param-key">SMTP Host</span>
              <span className="admin-param-val">{email?.host || 'smtp.gmail.com'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Port / Protocol</span>
              <span className="admin-param-val">{email?.port || 465} (SSL / TLS Secure)</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Sender Identity</span>
              <span className="admin-param-val">{email?.from || 'Snowflex <noreply@snowflex.com>'}</span>
            </div>

            {/* Interactive Mail Dispatch Test */}
            <form onSubmit={handleSendTestEmail} className="admin-test-email-box">
              <label className="admin-test-email-label">
                Test Live Email Delivery
              </label>
              <div className="admin-test-email-input-group">
                <input
                  type="email"
                  className="admin-test-input"
                  placeholder="name@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="primary-button"
                  disabled={sendingTest}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={13} />
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              <small className="admin-test-hint">
                Dispatches a branded Snowflex password reset test email directly through the active SMTP transport.
              </small>
            </form>
          </div>
        </article>

        {/* Card 3: Server Runtime & Security */}
        <article className="overview-card admin-diag-card">
          <div className="overview-card-header">
            <div className="admin-card-icon-title">
              <div className="admin-card-badge server">
                <Server size={20} />
              </div>
              <div>
                <h2>Node.js Service Runtime</h2>
                <p>Process health & network configuration</p>
              </div>
            </div>
            <span className="status-pill status-active">
              <span className="status-pill-dot" />
              LIVE
            </span>
          </div>

          <div className="admin-diag-content">
            <div className="admin-param-row">
              <span className="admin-param-key">Server Uptime</span>
              <span className="admin-param-val highlight">
                {server ? formatUptime(server.uptimeSeconds) : '—'}
              </span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Node Runtime</span>
              <span className="admin-param-val">{server?.nodeVersion || 'v20.x'}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Environment</span>
              <span className="admin-param-val" style={{ textTransform: 'uppercase' }}>
                {server?.environment || 'development'}
              </span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">HTTP Port</span>
              <span className="admin-param-val">:{server?.port || 5000}</span>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Frontend Origin</span>
              <span className="admin-param-val">{server?.frontendUrl || 'http://localhost:5173'}</span>
            </div>
          </div>
        </article>

        {/* Card 4: Organization Data Scope */}
        <article className="overview-card admin-diag-card">
          <div className="overview-card-header">
            <div className="admin-card-icon-title">
              <div className="admin-card-badge database">
                <Database size={20} />
              </div>
              <div>
                <h2>Entity Distribution</h2>
                <p>Records stored in Snowflake tables</p>
              </div>
            </div>
            <div className="dash-snowflake-pill">
              <Activity size={12} />
              <span>SYNCED</span>
            </div>
          </div>

          <div className="admin-diag-content">
            <div className="admin-param-row">
              <span className="admin-param-key">Total Registered Accounts</span>
              <strong className="admin-param-val">{counts?.users ?? '—'}</strong>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Active Employee Profiles</span>
              <strong className="admin-param-val">{counts?.employeeProfiles ?? '—'}</strong>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Departments Setup</span>
              <strong className="admin-param-val">{counts?.departments ?? '—'}</strong>
            </div>
            <div className="admin-param-row">
              <span className="admin-param-key">Role Breakdown</span>
              <span className="admin-param-val">
                {counts?.admins ?? 0} Admins · {counts?.hr ?? 0} HR · {counts?.managers ?? 0} Mgrs · {counts?.employees ?? 0} Emps
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
