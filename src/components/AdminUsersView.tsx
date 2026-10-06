import { useState, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
  Shield, Users, Briefcase, User, Search, RefreshCw,
  CheckCircle2, X, ShieldAlert
} from 'lucide-react'
import { updateUserRole, type SafeUser } from '../lib/auth-api'
import UserAvatar from './UserAvatar'

interface AdminUsersViewProps {
  users: SafeUser[]
  token: string
  currentUserId: number
  onRefresh: () => void
}

const roleDescriptions: Record<string, { desc: string; badgeClass: string }> = {
  ADMIN: { desc: 'Full authority: manage users, system settings, database diagnostics & mail engine.', badgeClass: 'role-admin' },
  HR: { desc: 'Workforce operations: employee directory, department administration & leave reviews.', badgeClass: 'role-hr' },
  MANAGER: { desc: 'Team management: supervise direct reports, task assignments & team leaves.', badgeClass: 'role-manager' },
  EMPLOYEE: { desc: 'Standard staff: self-service attendance, leave requests & assigned tasks.', badgeClass: 'role-employee' },
}

export default function AdminUsersView({ users, token, currentUserId, onRefresh }: AdminUsersViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('EMPLOYEE')
  const [saving, setSaving] = useState(false)

  // Calculations for role metrics
  const counts = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === 'ADMIN').length
    const hr = users.filter((u) => u.role === 'HR').length
    const managers = users.filter((u) => u.role === 'MANAGER').length
    const employees = users.filter((u) => u.role === 'EMPLOYEE' || u.role === 'USER').length
    return { total, admins, hr, managers, employees }
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
    if (editingUser.id === currentUserId && selectedRole !== 'ADMIN') {
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

  return (
    <div className="admin-users-view">
      {/* KPI Overview Chips */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card" onClick={() => setRoleFilter('ALL')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon total"><Users size={18} /></div>
          <div>
            <div className="admin-kpi-num">{counts.total}</div>
            <div className="admin-kpi-label">Total Accounts</div>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => setRoleFilter('ADMIN')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon admin"><Shield size={18} /></div>
          <div>
            <div className="admin-kpi-num">{counts.admins}</div>
            <div className="admin-kpi-label">Administrators</div>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => setRoleFilter('HR')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon hr"><Users size={18} /></div>
          <div>
            <div className="admin-kpi-num">{counts.hr}</div>
            <div className="admin-kpi-label">HR Managers</div>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => setRoleFilter('MANAGER')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon manager"><Briefcase size={18} /></div>
          <div>
            <div className="admin-kpi-num">{counts.managers}</div>
            <div className="admin-kpi-label">Team Managers</div>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => setRoleFilter('EMPLOYEE')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon employee"><User size={18} /></div>
          <div>
            <div className="admin-kpi-num">{counts.employees}</div>
            <div className="admin-kpi-label">Employees</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Refresh */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, email or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="admin-clear-search" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-filters">
          {['ALL', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].map((r) => (
            <button
              key={r}
              type="button"
              className={`admin-filter-pill ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </button>
          ))}
          <button className="icon-button" onClick={onRefresh} title="Refresh users list">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>EMAIL ADDRESS</th>
              <th>ACCESS LEVEL / ROLE</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No accounts matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const normalizedRole = u.role === 'USER' ? 'EMPLOYEE' : u.role
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id} className={isSelf ? 'admin-row-self' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <UserAvatar name={u.fullName} avatarUrl={u.avatarUrl} size={36} className="admin-user-avatar" />
                        <div>
                          <strong className="admin-user-name">
                            {u.fullName} {isSelf && <span className="admin-self-tag">(You)</span>}
                          </strong>
                          <div className="admin-user-id">UID #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-email-text">{u.email}</span>
                    </td>
                    <td>
                      <span className={`dash-role-badge ${roleDescriptions[normalizedRole]?.badgeClass || 'role-employee'}`}>
                        {normalizedRole === 'ADMIN' ? <Shield size={11} /> : normalizedRole === 'HR' ? <Users size={11} /> : normalizedRole === 'MANAGER' ? <Briefcase size={11} /> : <User size={11} />}
                        {normalizedRole}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill status-active">
                        <span className="status-pill-dot" />
                        ACTIVE
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-button"
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
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <UserAvatar name={editingUser.fullName} avatarUrl={editingUser.avatarUrl} size={36} className="admin-user-avatar" />
                <h3>Update User Role</h3>
                <p>Modify permissions and platform access for <strong>{editingUser.fullName}</strong> ({editingUser.email})</p>
              </div>
              <button className="icon-button" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <label className="admin-modal-label">Select System Role</label>
              <div className="admin-role-options">
                {(['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as const).map((r) => (
                  <div
                    key={r}
                    className={`admin-role-option-card ${selectedRole === r ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(r)}
                  >
                    <div className="admin-role-option-head">
                      <span className={`dash-role-badge ${roleDescriptions[r].badgeClass}`}>
                        {r === 'ADMIN' ? <Shield size={12} /> : r === 'HR' ? <Users size={12} /> : r === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                        {r}
                      </span>
                      {selectedRole === r && <CheckCircle2 size={16} className="admin-role-checked" />}
                    </div>
                    <p className="admin-role-option-desc">{roleDescriptions[r].desc}</p>
                  </div>
                ))}
              </div>

              {editingUser.id === currentUserId && selectedRole !== 'ADMIN' && (
                <div className="admin-warning-alert">
                  <ShieldAlert size={16} />
                  <span>Caution: Demoting your own account will remove your administrator access immediately.</span>
                </div>
              )}
            </div>

            <div className="admin-modal-foot">
              <button
                type="button"
                className="admin-cancel-btn"
                onClick={() => setEditingUser(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
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
