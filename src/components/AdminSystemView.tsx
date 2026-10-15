import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Server, Snowflake, Mail, Send, Activity, RefreshCw, Database
} from 'lucide-react'
import { sendAdminTestEmail, type AdminSystemInfo } from '../lib/auth-api'
import { SkeletonDiagnosticCards } from './Skeleton'

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

  if (loading && !systemInfo) {
    return (
      <div className="admin-system-view flex flex-col gap-[20px]">
        <div className="admin-system-header flex flex-col sm:flex-row sm:items-start justify-between gap-[16px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[22px_24px]">
          <div>
            <span className="dash-kicker text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#517154] dark:text-[#7f9f82]">INFRASTRUCTURE HEALTH</span>
            <h2 className="m-0 mt-[4px] text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] text-[19px] font-bold">Platform Health & Engine Diagnostics</h2>
            <p className="m-0 mt-[4px] text-[#68796e] dark:text-[#8c9e93] text-[13px]">Real-time telemetry for Snowflake data warehouse, SMTP mail delivery, and runtime services.</p>
          </div>
        </div>
        <SkeletonDiagnosticCards />
      </div>
    )
  }

  const db = systemInfo?.database
  const email = systemInfo?.email
  const server = systemInfo?.server
  const counts = systemInfo?.counts

  return (
    <div className="admin-system-view flex flex-col gap-[20px]">
      {/* Top Bar: Status Banner & Refresh */}
      <div className="admin-system-header flex flex-col sm:flex-row sm:items-start justify-between gap-[16px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[22px_24px]">
        <div>
          <span className="dash-kicker text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#517154] dark:text-[#7f9f82]">INFRASTRUCTURE HEALTH</span>
          <h2 className="m-0 mt-[4px] text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] text-[19px] font-bold">Platform Health & Engine Diagnostics</h2>
          <p className="m-0 mt-[4px] text-[#68796e] dark:text-[#8c9e93] text-[13px]">Real-time telemetry for Snowflake data warehouse, SMTP mail delivery, and runtime services.</p>
        </div>
        <button
          className="admin-action-button inline-flex items-center gap-[8px] px-[12px] py-[6px] border border-[#c9d8c6] dark:border-[#2b3e33] rounded-[6px] bg-white dark:bg-[#192720] text-[#193c33] dark:text-[#dbe7df] text-[11px] font-semibold cursor-pointer hover:bg-[#193c33] hover:text-[#d9ed74] hover:border-[#193c33] dark:hover:bg-[#193c33] dark:hover:text-[#d9ed74] transition-all duration-150 disabled:opacity-50"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Main Diagnostic Cards Grid */}
      <div className="admin-diag-grid grid grid-cols-1 min-[1101px]:grid-cols-2 gap-[18px]">
        {/* Card 1: Snowflake Cloud Data Warehouse */}
        <article className="overview-card admin-diag-card bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[24px] shadow-[0_2px_8px_rgba(25,60,51,0.02)]">
          <div className="overview-card-header flex items-start justify-between gap-[12px] mb-[16px]">
            <div className="admin-card-icon-title flex items-center gap-[12px]">
              <div className="admin-card-badge snowflake w-[40px] h-[40px] rounded-[10px] grid place-items-center bg-[#edf6ec] text-[#1f503e] shrink-0">
                <Snowflake size={20} />
              </div>
              <div>
                <h2 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif]">Snowflake Data Warehouse</h2>
                <p className="m-0 text-[12px] text-[#68796e] dark:text-[#8c9e93]">Enterprise data cloud connection</p>
              </div>
            </div>
            <div className="dash-snowflake-pill inline-flex items-center gap-[6px] px-[8px] py-[3px] rounded-full bg-[#edf6ec] dark:bg-[#1a2c22] text-[#1f503e] dark:text-[#7fcf99] text-[11px] font-bold uppercase tracking-[0.03em]">
              <span className="dash-pulse-dot w-[6px] h-[6px] rounded-full bg-[#10b981] animate-ping" />
              <span>{db?.status || 'CONNECTED'}</span>
            </div>
          </div>

          <div className="admin-diag-content flex flex-col gap-[10px] mt-[10px]">
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Database</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{db?.database || 'AUTH_PROJECT'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Schema</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{db?.schema || 'PUBLIC'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Compute Warehouse</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{db?.warehouse || 'SNOWFLAKE_LEARNING_WH'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Snowflake Account</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{db?.account || 'KKTYMTL-MH92776'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Query Security</span>
              <span className="admin-param-val highlight text-[#276749] dark:text-[#7fcf99] font-bold font-mono">Binds & Prepared Statements</span>
            </div>
          </div>
        </article>

        {/* Card 2: Gmail SMTP / Mail Engine */}
        <article className="overview-card admin-diag-card bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[24px] shadow-[0_2px_8px_rgba(25,60,51,0.02)]">
          <div className="overview-card-header flex items-start justify-between gap-[12px] mb-[16px]">
            <div className="admin-card-icon-title flex items-center gap-[12px]">
              <div className="admin-card-badge mail w-[40px] h-[40px] rounded-[10px] grid place-items-center bg-[#fef3c7] text-[#b45309] shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif]">Mail Delivery Engine</h2>
                <p className="m-0 text-[12px] text-[#68796e] dark:text-[#8c9e93]">Dynamic password reset & system alerts</p>
              </div>
            </div>
            <span className={`status-pill ${email?.configured ? 'status-active' : 'status-pending'}`}>
              <span className="status-pill-dot" />
              {email?.configured ? 'SMTP READY' : 'DEV MODE'}
            </span>
          </div>

          <div className="admin-diag-content flex flex-col gap-[10px] mt-[10px]">
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">SMTP Host</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{email?.host || 'smtp.gmail.com'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Port / Protocol</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{email?.port || 465} (SSL / TLS Secure)</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Sender Identity</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{email?.from || 'Snowflex <noreply@snowflex.com>'}</span>
            </div>

            {/* Interactive Mail Dispatch Test */}
            <form onSubmit={handleSendTestEmail} className="admin-test-email-box mt-[14px] p-[14px] bg-[#f7faf5] dark:bg-[#17241d] border border-[#dce7d9] dark:border-[#24352b] rounded-[8px]">
              <label className="admin-test-email-label block text-[11px] font-bold text-[#2b4539] dark:text-[#c9d8cc] mb-[8px]">
                Test Live Email Delivery
              </label>
              <div className="admin-test-email-input-group flex gap-[8px]">
                <input
                  type="email"
                  className="admin-test-input flex-1 h-[36px] px-[10px] py-0 border border-[#c9d8c6] dark:border-[#2b3e33] rounded-[6px] text-[12px] text-[#193c33] dark:text-[#dbe7df] bg-white dark:bg-[#192720] focus:outline-none focus:border-[#315943]"
                  placeholder="name@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="primary-button inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-[6px] bg-[#193c33] text-[#d9ed74] text-[12px] font-semibold cursor-pointer hover:bg-[#142e27] transition-colors border-0 disabled:opacity-50"
                  disabled={sendingTest}
                >
                  <Send size={13} />
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              <small className="admin-test-hint block text-[10px] text-[#7b8e82] dark:text-[#8c9e93] mt-[6px] leading-[1.3]">
                Dispatches a branded Snowflex password reset test email directly through the active SMTP transport.
              </small>
            </form>
          </div>
        </article>

        {/* Card 3: Server Runtime & Security */}
        <article className="overview-card admin-diag-card bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[24px] shadow-[0_2px_8px_rgba(25,60,51,0.02)]">
          <div className="overview-card-header flex items-start justify-between gap-[12px] mb-[16px]">
            <div className="admin-card-icon-title flex items-center gap-[12px]">
              <div className="admin-card-badge server w-[40px] h-[40px] rounded-[10px] grid place-items-center bg-[#ede9fe] text-[#6d28d9] shrink-0">
                <Server size={20} />
              </div>
              <div>
                <h2 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif]">Node.js Service Runtime</h2>
                <p className="m-0 text-[12px] text-[#68796e] dark:text-[#8c9e93]">Process health & network configuration</p>
              </div>
            </div>
            <span className="status-pill status-active">
              <span className="status-pill-dot" />
              LIVE
            </span>
          </div>

          <div className="admin-diag-content flex flex-col gap-[10px] mt-[10px]">
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Server Uptime</span>
              <span className="admin-param-val highlight text-[#276749] dark:text-[#7fcf99] font-bold font-mono">
                {server ? formatUptime(server.uptimeSeconds) : '—'}
              </span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Node Runtime</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{server?.nodeVersion || 'v20.x'}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Environment</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono uppercase">
                {server?.environment || 'development'}
              </span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">HTTP Port</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">:{server?.port || 5000}</span>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Frontend Origin</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">{server?.frontendUrl || 'http://localhost:5173'}</span>
            </div>
          </div>
        </article>

        {/* Card 4: Organization Data Scope */}
        <article className="overview-card admin-diag-card bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[24px] shadow-[0_2px_8px_rgba(25,60,51,0.02)]">
          <div className="overview-card-header flex items-start justify-between gap-[12px] mb-[16px]">
            <div className="admin-card-icon-title flex items-center gap-[12px]">
              <div className="admin-card-badge database w-[40px] h-[40px] rounded-[10px] grid place-items-center bg-[#e0f2fe] text-[#0284c7] shrink-0">
                <Database size={20} />
              </div>
              <div>
                <h2 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif]">Entity Distribution</h2>
                <p className="m-0 text-[12px] text-[#68796e] dark:text-[#8c9e93]">Records stored in Snowflake tables</p>
              </div>
            </div>
            <div className="dash-snowflake-pill inline-flex items-center gap-[6px] px-[8px] py-[3px] rounded-full bg-[#edf6ec] dark:bg-[#1a2c22] text-[#1f503e] dark:text-[#7fcf99] text-[11px] font-bold uppercase tracking-[0.03em]">
              <Activity size={12} />
              <span>SYNCED</span>
            </div>
          </div>

          <div className="admin-diag-content flex flex-col gap-[10px] mt-[10px]">
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Total Registered Accounts</span>
              <strong className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-bold font-mono">{counts?.users ?? '—'}</strong>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Active Employee Profiles</span>
              <strong className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-bold font-mono">{counts?.employeeProfiles ?? '—'}</strong>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Departments Setup</span>
              <strong className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-bold font-mono">{counts?.departments ?? '—'}</strong>
            </div>
            <div className="admin-param-row flex items-center justify-between py-[8px] border-b border-dashed border-[#e8efe6] dark:border-[#223329] text-[12px]">
              <span className="admin-param-key text-[#6a7c70] dark:text-[#8c9e93]">Role Breakdown</span>
              <span className="admin-param-val text-[#193c33] dark:text-[#e2ede5] font-semibold font-mono">
                {counts?.admins ?? 0} Admins · {counts?.hr ?? 0} HR · {counts?.managers ?? 0} Mgrs · {counts?.employees ?? 0} Emps
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
