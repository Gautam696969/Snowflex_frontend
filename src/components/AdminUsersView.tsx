import { useState, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
  Shield, ShieldCheck, Users, Briefcase, User, Search, RefreshCw,
  CheckCircle2, X, ShieldAlert
} from 'lucide-react'
import { updateUserRole, type SafeUser } from '../lib/auth-api'
import UserAvatar from './UserAvatar'
import { SkeletonKpiGrid, SkeletonTable } from './Skeleton'

interface AdminUsersViewProps {
  users: SafeUser[]
  token: string
  currentUserId: number
  onRefresh: () => void
  loading?: boolean
}

const roleDescriptions: Record<string, { desc: string; badgeClass: string }> = {
  SUPER_ADMIN: { desc: 'Top-level authority: govern admin access and decide Admin and Super Admin leave requests.', badgeClass: 'role-super-admin' },
  ADMIN: { desc: 'Full authority: manage users, system settings, database diagnostics & mail engine.', badgeClass: 'role-admin' },
  HR: { desc: 'Workforce operations: employee directory, department administration & leave reviews.', badgeClass: 'role-hr' },
  MANAGER: { desc: 'Team management: supervise direct reports, task assignments & team leaves.', badgeClass: 'role-manager' },
  EMPLOYEE: { desc: 'Standard staff: self-service attendance, leave requests & assigned tasks.', badgeClass: 'role-employee' },
}

export default function AdminUsersView({ users, token, currentUserId, onRefresh, loading = false }: AdminUsersViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('EMPLOYEE')
  const [saving, setSaving] = useState(false)

  // Calculations for role metrics
  const counts = useMemo(() => {
    const total = users.length
    const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length
    const admins = users.filter((u) => u.role === 'ADMIN').length
    const hr = users.filter((u) => u.role === 'HR').length
    const managers = users.filter((u) => u.role === 'MANAGER').length
    const employees = users.filter((u) => u.role === 'EMPLOYEE' || u.role === 'USER').length
    return { total, superAdmins, admins, hr, managers, employees }
  }, [users])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const normalizedRole = u.role === 'USER' ? 'EMPLOYEE' : u.role
      const matchesRole = roleFilter === 'ALL' || normalizedRole === roleFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || String(u.id).includes(q)
      return matchesRole && matchesSearch
    })
  }, [users, roleFilter, searchQuery])

  function openRoleModal(user: SafeUser) {
    const current = user.role === 'USER' ? 'EMPLOYEE' : user.role
    setEditingUser(user)
    setSelectedRole(current)
  }

  async function handleSaveRole() {
    if (!editingUser) return
    const currentRole = editingUser.role === 'USER' ? 'EMPLOYEE' : editingUser.role
    if (editingUser.id === currentUserId && currentRole === 'ADMIN' && selectedRole !== 'ADMIN') {
      toast.error('You cannot demote yourself from the Administrator role.')
      return
    }

    setSaving(true)
    try {
      await updateUserRole(token, editingUser.id, selectedRole)
      toast.success(`Updated ${editingUser.fullName}'s role to ${selectedRole}`)
      setEditingUser(null)
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user role')
    } finally {
      setSaving(false)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="admin-users-view flex flex-col gap-[20px]">
        <SkeletonKpiGrid count={4} />
        <div style={{ marginTop: '24px' }}>
          <SkeletonTable columns={5} rows={6} hasAvatar={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-users-view flex flex-col gap-[20px]">
      {/* KPI Overview Chips */}
      <div className="admin-kpi-grid grid grid-cols-2 min-[641px]:grid-cols-3 min-[1101px]:grid-cols-6 gap-[14px]">
        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('ALL')}>
          <div className="admin-kpi-icon total w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#edf6ec] text-[#22543d]"><Users size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.total}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">Total Accounts</div>
          </div>
        </div>

        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('ADMIN')}>
          <div className="admin-kpi-icon admin w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#fef3c7] text-[#92400e]"><Shield size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.admins}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">Administrators</div>
          </div>
        </div>

        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('SUPER_ADMIN')}>
          <div className="admin-kpi-icon admin w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#fef3c7] text-[#92400e]"><ShieldCheck size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.superAdmins}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">Super Admins</div>
          </div>
        </div>

        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('HR')}>
          <div className="admin-kpi-icon hr w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#e0f2fe] text-[#0369a1]"><Users size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.hr}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">HR Managers</div>
          </div>
        </div>

        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('MANAGER')}>
          <div className="admin-kpi-icon manager w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#f3e8ff] text-[#6b21a8]"><Briefcase size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.managers}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">Team Managers</div>
          </div>
        </div>

        <div className="admin-kpi-card flex items-center gap-[14px] p-[16px_18px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[10px] transition-all duration-200 cursor-pointer hover:border-[#bcdbb7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(25,60,51,0.05)]" onClick={() => setRoleFilter('EMPLOYEE')}>
          <div className="admin-kpi-icon employee w-[38px] h-[38px] rounded-[8px] grid place-items-center bg-[#ede9fe] text-[#5b21b6]"><User size={18} /></div>
          <div>
            <div className="admin-kpi-num text-[20px] font-extrabold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] leading-[1.1]">{counts.employees}</div>
            <div className="admin-kpi-label text-[11px] text-[#728377] font-semibold mt-[2px]">Employees</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Refresh */}
      <div className="admin-toolbar flex items-center justify-between gap-[14px] flex-wrap">
        <div className="admin-search-wrap relative flex-1 min-w-[260px] max-w-[420px]">
          <Search size={16} className="admin-search-icon absolute left-[12px] top-1/2 -translate-y-1/2 text-[#8c9d92] pointer-events-none" />
          <input
            type="text"
            className="admin-search-input w-full h-[38px] pl-[36px] pr-[34px] py-0 bg-white dark:bg-[#192720] border border-[#dbe2d8] dark:border-[#2b3e33] rounded-[6px] text-[13px] text-[#1d3329] dark:text-[#dbe7df] focus:outline-none focus:border-[#315943] focus:ring-2 focus:ring-[#315943]/15 transition-all"
            placeholder="Search by name, email or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="admin-clear-search absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#8c9d92] cursor-pointer p-[2px]" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-filters flex items-center gap-[8px] flex-wrap">
          {['ALL', 'SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].map((r) => (
            <button
              key={r}
              type="button"
              className={`admin-filter-pill px-[12px] py-[6px] rounded-[20px] text-[11px] font-semibold cursor-pointer transition-all duration-150 ${
                roleFilter === r
                  ? 'active bg-[#193c33] text-[#d9ed74] border border-[#193c33]'
                  : 'bg-white dark:bg-[#192720] text-[#4b5e52] dark:text-[#c0cfc5] border border-[#dce5d9] dark:border-[#2b3e33] hover:bg-[#f1f6ed] dark:hover:bg-[#23352c]'
              }`}
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </button>
          ))}
          <button className="icon-button w-8 h-8 rounded-lg flex items-center justify-center text-[#517154] dark:text-[#a4b2a8] hover:bg-[#f0f4ee] dark:hover:bg-[#233129] transition-colors border-0 bg-transparent cursor-pointer" onClick={onRefresh} title="Refresh users list">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] overflow-x-auto">
        <table className="admin-table w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="p-[13px_18px] bg-[#f7faf5] dark:bg-[#17241d] text-[#68796e] dark:text-[#8c9e93] text-[10px] font-bold uppercase tracking-[0.05em] text-left border-b border-[#e2e8df] dark:border-[#223329]">USER</th>
              <th className="p-[13px_18px] bg-[#f7faf5] dark:bg-[#17241d] text-[#68796e] dark:text-[#8c9e93] text-[10px] font-bold uppercase tracking-[0.05em] text-left border-b border-[#e2e8df] dark:border-[#223329]">EMAIL ADDRESS</th>
              <th className="p-[13px_18px] bg-[#f7faf5] dark:bg-[#17241d] text-[#68796e] dark:text-[#8c9e93] text-[10px] font-bold uppercase tracking-[0.05em] text-left border-b border-[#e2e8df] dark:border-[#223329]">ACCESS LEVEL / ROLE</th>
              <th className="p-[13px_18px] bg-[#f7faf5] dark:bg-[#17241d] text-[#68796e] dark:text-[#8c9e93] text-[10px] font-bold uppercase tracking-[0.05em] text-left border-b border-[#e2e8df] dark:border-[#223329]">STATUS</th>
              <th className="p-[13px_18px] bg-[#f7faf5] dark:bg-[#17241d] text-[#68796e] dark:text-[#8c9e93] text-[10px] font-bold uppercase tracking-[0.05em] text-right border-b border-[#e2e8df] dark:border-[#223329]" style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty text-center p-[40px] text-[#8b9c91] text-[13px]">
                  No accounts matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const normalizedRole = u.role === 'USER' ? 'EMPLOYEE' : u.role
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id} className={`${isSelf ? 'admin-row-self bg-[#f8faf6]/50 dark:bg-[#1a2820]/40' : ''} hover:bg-[#fbfdfa] dark:hover:bg-[#182820] transition-colors [&:last-child>td]:border-b-0`}>
                    <td className="p-[14px_18px] border-b border-[#edf2ea] dark:border-[#1d2c23] text-[#273b30] dark:text-[#d5e2d9]">
                      <div className="admin-user-cell flex items-center gap-[12px]">
                        <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} size={36} className="admin-user-avatar" />
                        <div>
                          <strong className="admin-user-name text-[#193c33] dark:text-[#e5efe8] text-[13px] block">
                            {u.fullName} {isSelf && <span className="admin-self-tag text-[#4b7454] font-medium text-[11px] ml-1">(You)</span>}
                          </strong>
                          <div className="admin-user-id text-[10px] text-[#8c9d92] font-mono">UID #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-[14px_18px] border-b border-[#edf2ea] dark:border-[#1d2c23] text-[#273b30] dark:text-[#d5e2d9]">
                      <span className="admin-email-text text-[#55675c] dark:text-[#a0b3a7] font-mono text-[12px]">{u.email}</span>
                    </td>
                    <td className="p-[14px_18px] border-b border-[#edf2ea] dark:border-[#1d2c23] text-[#273b30] dark:text-[#d5e2d9]">
                      <span className={`dash-role-badge ${roleDescriptions[normalizedRole]?.badgeClass || 'role-employee'}`}>
                        {normalizedRole === 'SUPER_ADMIN' ? <ShieldCheck size={11} /> : normalizedRole === 'ADMIN' ? <Shield size={11} /> : normalizedRole === 'HR' ? <Users size={11} /> : normalizedRole === 'MANAGER' ? <Briefcase size={11} /> : <User size={11} />}
                        {normalizedRole}
                      </span>
                    </td>
                    <td className="p-[14px_18px] border-b border-[#edf2ea] dark:border-[#1d2c23] text-[#273b30] dark:text-[#d5e2d9]">
                      <span className="status-pill status-active">
                        <span className="status-pill-dot" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-[14px_18px] border-b border-[#edf2ea] dark:border-[#1d2c23] text-[#273b30] dark:text-[#d5e2d9]" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-button px-[12px] py-[6px] border border-[#c9d8c6] dark:border-[#2b3e33] rounded-[6px] bg-white dark:bg-[#192720] text-[#193c33] dark:text-[#dbe7df] text-[11px] font-semibold cursor-pointer hover:bg-[#193c33] hover:text-[#d9ed74] hover:border-[#193c33] dark:hover:bg-[#193c33] dark:hover:text-[#d9ed74] transition-all duration-150"
                        onClick={() => openRoleModal(u)}
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Role Management Modal */}
      {editingUser && (
        <div className="admin-modal-backdrop fixed inset-0 bg-[#0e1b15]/60 backdrop-blur-[4px] z-[999] grid place-items-center p-[16px] animate-[fadeIn_0.15s_ease]" onClick={() => setEditingUser(null)}>
          <div className="admin-modal w-full max-w-[520px] bg-white dark:bg-[#14211a] border border-transparent dark:border-[#223329] rounded-[14px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] overflow-hidden animate-[fadeInModal_0.2s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head flex items-start justify-between p-[22px_24px_18px] border-b border-[#edf2ea] dark:border-[#223329]">
              <div>
                <UserAvatar name={editingUser.fullName} avatarUrl={editingUser.avatarUrl} size={36} className="admin-user-avatar" />
                <h3 className="m-0 text-[17px] font-bold text-[#193c33] dark:text-[#e5efe8] font-['Manrope',sans-serif] mt-2">Update User Role</h3>
                <p className="mt-[4px] mb-0 text-[12px] text-[#6d8073] dark:text-[#8c9e93]">Modify permissions and platform access for <strong>{editingUser.fullName}</strong> ({editingUser.email})</p>
              </div>
              <button className="icon-button w-8 h-8 rounded-lg flex items-center justify-center text-[#517154] dark:text-[#a4b2a8] hover:bg-[#f0f4ee] dark:hover:bg-[#233129] transition-colors border-0 bg-transparent cursor-pointer" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body p-[22px_24px] flex flex-col gap-[14px]">
              <label className="admin-modal-label text-[12px] font-bold text-[#384c40] dark:text-[#8c9e93] uppercase tracking-[0.04em]">Select System Role</label>
              <div className="admin-role-options flex flex-col gap-[10px]">
                {(['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as const).map((r) => (
                  <div
                    key={r}
                    className={`admin-role-option-card p-[12px_16px] rounded-[8px] cursor-pointer transition-all duration-150 ${
                      selectedRole === r
                        ? 'selected border border-[#193c33] dark:border-[#d9ed74] bg-[#f4f8f3] dark:bg-[#1c2e24] shadow-[0_0_0_1px_#193c33] dark:shadow-[0_0_0_1px_#d9ed74]'
                        : 'border border-[#dfe6dc] dark:border-[#24352b] bg-transparent hover:border-[#b7cbbe] hover:bg-[#fbfdfa] dark:hover:bg-[#1a2b21]'
                    }`}
                    onClick={() => setSelectedRole(r)}
                  >
                    <div className="admin-role-option-head flex items-center justify-between">
                      <span className={`dash-role-badge ${roleDescriptions[r].badgeClass}`}>
                        {r === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : r === 'ADMIN' ? <Shield size={12} /> : r === 'HR' ? <Users size={12} /> : r === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                        {r}
                      </span>
                      {selectedRole === r && <CheckCircle2 size={16} className="admin-role-checked text-[#193c33] dark:text-[#d9ed74]" />}
                    </div>
                    <p className="admin-role-option-desc mt-[6px] mb-0 text-[11px] text-[#6b7e72] dark:text-[#8c9e93] leading-[1.4]">{roleDescriptions[r].desc}</p>
                  </div>
                ))}
              </div>

              {editingUser.id === currentUserId && editingUser.role === 'ADMIN' && selectedRole !== 'ADMIN' && (
                <div className="admin-warning-alert flex items-center gap-[10px] p-[10px_14px] rounded-[6px] bg-[#fffbeb] dark:bg-[#2a2215] border border-[#fde68a] dark:border-[#5c4118] text-[#92400e] dark:text-[#fde68a] text-[11px]">
                  <ShieldAlert size={16} />
                  <span>Caution: Demoting your own account will remove your administrator access immediately.</span>
                </div>
              )}
            </div>

            <div className="admin-modal-foot flex items-center justify-end gap-[12px] p-[16px_24px] bg-[#f7faf5] dark:bg-[#111c16] border-t border-[#edf2ea] dark:border-[#223329]">
              <button
                type="button"
                className="admin-cancel-btn px-[16px] py-[8px] border border-[#dce5d9] dark:border-[#2b3e33] rounded-[6px] bg-white dark:bg-[#192720] text-[#4b5e52] dark:text-[#dbe7df] text-[12px] cursor-pointer hover:bg-[#eef4eb] dark:hover:bg-[#24352b] transition-colors"
                onClick={() => setEditingUser(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button px-[16px] py-[8px] rounded-[6px] bg-[#193c33] text-[#d9ed74] text-[12px] font-semibold cursor-pointer hover:bg-[#142e27] transition-colors border-0 disabled:opacity-50"
                onClick={handleSaveRole}
                disabled={saving}
              >
                {saving ? 'Updating...' : `Confirm & Set as ${selectedRole}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
