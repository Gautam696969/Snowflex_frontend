import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Activity, Building2, CalendarDays, Check, CheckSquare2, ChevronRight, CircleHelp,
  Clock3, LayoutDashboard, LogOut, Menu, PanelLeftOpen, Plus, RefreshCw, Snowflake, Sparkles, Users, X,
  Edit, Trash2, Eye, Search, X as XIcon,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  TableSortLabel, Paper, InputBase, IconButton, MenuItem,
  FormControl, Select as MuiSelect,
} from '@mui/material'
import { apiRequest, clearToken, getCurrentUser, getDashboard, getDepartments, getEmployees, logout, readToken } from '../lib/auth-api'
import type { DashboardData, SafeUser } from '../lib/auth-api'
import AiAssistant from '../components/AiAssistant'
import ThemeToggle from '../components/ThemeToggle'

type View = 'overview' | 'assistant' | 'employees' | 'departments' | 'attendance' | 'leaves' | 'tasks'
type Row = Record<string, unknown>

const navGroups: { label: string; items: { id: View; label: string; icon: typeof LayoutDashboard }[] }[] = [
  { label: 'OVERVIEW', items: [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'AI Employee', icon: Sparkles },
  ] },
  { label: 'MANAGEMENT', items: [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
  ] },
  { label: 'TIME & WORK', items: [
    { id: 'attendance', label: 'Attendance', icon: Clock3 },
    { id: 'leaves', label: 'Leave requests', icon: CalendarDays },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare2 },
  ] },
]
const viewItems = navGroups.flatMap((group) => group.items)

const formatDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString() : '—'

export default function Dashboard() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<SafeUser | null>(null)
  const [view, setView] = useState<View>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DashboardData>({})
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [editingRow, setEditingRow] = useState<Row | null>(null)
  const [viewingRow, setViewingRow] = useState<Row | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [decidedRows, setDecidedRows] = useState<Set<string | number>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  async function loadData(currentToken: string, currentUser: SafeUser, currentView: View) {
    setLoading(true)
    setError('')
    try {
      if (currentView === 'overview') {
        setStats(await getDashboard(currentToken, currentUser.role))
        setRows([])
      } else if (currentView === 'assistant') {
        setRows([])
      } else if (currentView === 'employees') {
        setRows(await getEmployees(currentToken))
      } else if (currentView === 'departments') {
        setRows(await getDepartments(currentToken))
      } else {
        const path = currentView === 'attendance'
          ? currentUser.role === 'EMPLOYEE' ? '/attendance/me' : '/attendance'
          : currentView === 'leaves'
            ? currentUser.role === 'EMPLOYEE' ? '/leaves/me' : '/leaves'
            : '/tasks'
        const result = await apiRequest<Row[]>(path, currentToken)
        setRows(result)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load this view.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const currentToken = readToken()
    if (!currentToken) {
      navigate('/login', { replace: true })
      return () => { active = false }
    }
    setToken(currentToken)
    getCurrentUser(currentToken)
      .then(async (authenticatedUser) => {
        if (!active) return
        setUser(authenticatedUser)
        await loadData(currentToken, authenticatedUser, view)
      })
      .catch((error) => {
        clearToken()
        toast.error(error instanceof Error ? error.message : 'Session expired. Please sign in again.')
        navigate('/login', { replace: true })
      })
    return () => { active = false }
  }, [navigate])

  useEffect(() => {
    if (token && user) void loadData(token, user, view)
  }, [view])

  async function refresh() {
    if (token && user) {
      setRefreshing(true)
      try {
        await loadData(token, user, view)
      } finally {
        setRefreshing(false)
      }
    }
  }

  async function perform(path: string, method: string, payload?: unknown) {
    if (!token) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(path, token, method, payload)

      // Determine a friendly success message
      let successMsg = 'Saved successfully'
      if (method === 'POST') {
        if (view === 'employees') successMsg = 'Employee created successfully'
        else if (view === 'departments') successMsg = 'Department created successfully'
        else if (view === 'tasks') successMsg = 'Task created successfully'
        else if (view === 'leaves') successMsg = 'Leave request created successfully'
      } else if (method === 'PATCH') {
        if (path.includes('/approve')) successMsg = 'Leave approved successfully'
        else if (path.includes('/reject')) successMsg = 'Leave rejected successfully'
        else if (path.includes('/status')) successMsg = 'Task status updated successfully'
        else successMsg = 'Updated successfully'
      }
      toast.success(successMsg)

      // Optimistically add/update the item in the list immediately
      if (method === 'POST' && result && typeof result === 'object' && 'id' in result) {
        setRows((prev) => [result as Row, ...prev])
      } else if (method === 'POST' && payload && typeof payload === 'object') {
        // Backend may return null data; create a temporary row from the payload
        const tempRow: Row = { id: -Date.now(), ...(payload as Row) }
        if (view === 'employees' && form.userId) {
          tempRow.userId = Number(form.userId)
          tempRow.employeeCode = form.employeeCode
          tempRow.departmentId = Number(form.departmentId) || null
        }
        setRows((prev) => [tempRow, ...prev])
      } else if (method === 'PATCH' && result && typeof result === 'object' && 'id' in result) {
        setRows((prev) => prev.map((row) => (row.id === (result as Row).id ? { ...row, ...result } : row)))
      } else if (method === 'PATCH' && path.includes('/status') && payload && typeof payload === 'object' && 'status' in payload) {
        // Handle task status update
        const id = path.split('/')[2]
        setRows((prev) => prev.map((row) => (row.id === Number(id) ? { ...row, status: (payload as { status: string }).status } : row)))
      } else if (method === 'PATCH' && (path.includes('/approve') || path.includes('/reject'))) {
        // Handle leave approve/reject
        const id = path.split('/')[2]
        const newStatus = path.includes('/approve') ? 'APPROVED' : 'REJECTED'
        setRows((prev) => prev.map((row) => (row.id === Number(id) ? { ...row, status: newStatus } : row)))
        setDecidedRows((prev) => new Set(prev).add(Number(id)))
      }

      setShowCreate(false)
      setEditingRow(null)
      setForm({ name: '', userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
      resetPagination()
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save changes.')
      toast.error(requestError instanceof Error ? requestError.message : 'Could not save changes.')
      await refresh() // Refresh to restore correct state on error
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    setShowLogoutConfirm(true)
  }

  async function confirmLogout() {
    setShowLogoutConfirm(false)
    const currentToken = readToken()
    try {
      if (currentToken) await logout(currentToken)
      toast.success('Signed out successfully')
    } catch {
      toast.error('Error during sign out')
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  function handleEdit(row: Row) {
    setEditingRow(row)
    if (view === 'employees') {
      setForm({ name: '', userId: String(row.userId ?? ''), employeeCode: String(row.employeeCode ?? ''), departmentId: String(row.departmentId ?? ''), title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
    } else if (view === 'departments') {
      setForm({ name: String(row.name ?? ''), userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
    } else if (view === 'tasks') {
      setForm({ name: '', userId: '', employeeCode: '', departmentId: '', title: String(row.title ?? ''), assignedTo: String(row.assignedTo ?? ''), leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
    }
    setShowCreate(true)
  }

  function handleView(row: Row) {
    setViewingRow(row)
  }

  async function handleDelete(row: Row) {
    setDeleteTarget(row)
  }

  async function confirmDelete() {
    const row = deleteTarget
    setDeleteTarget(null)
    if (!row || !token) return
    try {
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      await apiRequest(`/${view}/${row.id}`, token, 'DELETE')
      toast.success('Deleted successfully')
      resetPagination()
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
      await refresh()
    }
  }

  function handleSort(key: string) {
    setSortConfig((current) => {
      if (current?.key === key && current.direction === 'asc') return { key, direction: 'desc' }
      return { key, direction: 'asc' }
    })
  }

  const filteredRows = useMemo(() => {
    let result = [...rows]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) => Object.values(row).some((val) => String(val).toLowerCase().includes(query)))
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.key] ?? '')
        const bVal = String(b[sortConfig.key] ?? '')
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return result
  }, [rows, searchQuery, sortConfig])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  function resetPagination() {
    setCurrentPage(1)
  }

  const role = user?.role === 'USER' ? 'EMPLOYEE' : user?.role
  const canManage = role === 'ADMIN' || role === 'HR'
  const activeItem = viewItems.find((item) => item.id === view)
  const isManagementView = view === 'employees' || view === 'departments'
  const showActions = canManage && isManagementView
  const metrics = role === 'EMPLOYEE'
    ? [
      ['Attendance this month', stats.attendanceThisMonth ?? 0, 'Recorded days', CalendarDays],
      ['Open tasks', stats.assignedTasks ?? 0, 'Assigned to you', CheckSquare2],
      ['Completed tasks', stats.completedTasks ?? 0, 'All done', Activity],
      ['Pending leave', stats.pendingLeaves ?? 0, 'Awaiting review', Clock3],
    ] as const
    : role === 'MANAGER'
      ? [
        ['Team members', stats.teamSize ?? 0, 'Direct reports', Users],
        ['Present today', stats.teamPresentToday ?? 0, 'Team attendance', Clock3],
        ['Leave requests', stats.pendingLeaveRequests ?? 0, 'Awaiting review', CalendarDays],
        ['Open tasks', stats.pendingTasks ?? 0, 'Across your team', CheckSquare2],
      ] as const
      : [
        ['Total employees', stats.totalEmployees ?? 0, `${stats.activeEmployees ?? 0} active`, Users],
        ['Present today', stats.presentToday ?? 0, `${stats.lateToday ?? 0} arrived late`, Clock3],
        ['Absent today', stats.absentToday ?? 0, 'Active workforce', CalendarDays],
        ['Pending leaves', stats.pendingLeaves ?? 0, `${stats.pendingTasks ?? 0} open tasks`, CheckSquare2],
      ] as const

  if (!user) return (
    <main className="dashboard-loading">
      <div className="live-loader" role="status" aria-live="polite">
        <span className="live-loader-ring"><i /><i /><i /><i /></span>
        <strong>Loading your workspace…</strong>
        <small>Authenticating and fetching your Snowflake data</small>
      </div>
    </main>
  )

  return (
    <main className={`workbench${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${mobileSidebarOpen ? ' is-mobile-sidebar-open' : ''}`}>
      <aside className="workbench-sidebar" aria-label="Workspace sidebar">
        <div className="sidebar-brand-row">
          <a className="workbench-brand" href="/dashboard" title="Snowflex People Operations"><Snowflake className="workbench-mark" size={20} strokeWidth={2.5} /><span className="sidebar-brand-copy">snowflex<span className="brand-caption">PEOPLE OPERATIONS</span></span></a>
          <button className="sidebar-toggle" type="button" title={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={mobileSidebarOpen || !sidebarCollapsed} onClick={() => {
            if (window.matchMedia('(max-width: 680px)').matches) setMobileSidebarOpen(false)
            else setSidebarCollapsed((collapsed) => !collapsed)
          }}>
            {mobileSidebarOpen ? <X size={19} /> : sidebarCollapsed ? <PanelLeftOpen size={17} /> : <Menu size={19} />}
          </button>
        </div>
        <nav className="workbench-nav" aria-label="Workspace navigation">
          {navGroups.map(({ label: groupLabel, items }, groupIndex) => (
            <div className="nav-group" key={groupLabel}>
              <div className="workspace-label">{groupLabel}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button key={id} className={view === id ? 'nav-item selected' : 'nav-item'} title={sidebarCollapsed ? label : undefined} aria-label={label} onClick={() => { setView(id); setMobileSidebarOpen(false) }} type="button">
                  <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{view === id && <ChevronRight className="nav-chevron" size={15} />}
                </button>
              ))}
              {groupIndex < navGroups.length - 1 && <div className="nav-separator" />}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-row" title="Help & Support"><CircleHelp size={16} /><span>People operations</span></div>
          <button className="profile-chip" type="button" onClick={handleLogout} title="Sign out">
            <span className="profile-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy"><strong>{user.fullName}</strong><small>{role}</small></span>
            <LogOut size={16} aria-label="Sign out" />
          </button>
        </div>
      </aside>
      {mobileSidebarOpen && <button className="mobile-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)} />}

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="logout-modal-title">Sign out</h3>
              <button className="modal-close" type="button" onClick={() => setShowLogoutConfirm(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-body">Are you sure you want to sign out?</p>
            <div className="modal-footer">
              <button className="secondary-action" type="button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="primary-action" type="button" onClick={confirmLogout}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="delete-modal-title">Delete record</h3>
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-body">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="modal-footer">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-action" type="button" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {viewingRow && (
        <div className="modal-overlay" onClick={() => setViewingRow(null)} role="dialog" aria-modal="true" aria-labelledby="view-modal-title">
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="view-modal-title">{view === 'employees' ? 'Employee Details' : view === 'departments' ? 'Department Details' : 'Details'}</h3>
              <button className="modal-close" type="button" onClick={() => setViewingRow(null)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
              <dl className="detail-grid">
                {Object.entries(viewingRow).filter(([key]) => !['description', 'createdAt', 'updatedAt'].includes(key)).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <dt>{key.replace(/[A-Z]/g, letter => ` ${letter}`).replace(/Id$/, ' ID').toUpperCase()}</dt>
                    <dd>{key.toLowerCase().includes('date') ? formatDate(value) : String(value ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="modal-footer">
              <button className="primary-action" type="button" onClick={() => setViewingRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <section className="workbench-main">
        <header className="workbench-topbar">
          <div className="topbar-location"><button className="mobile-sidebar-open-button" type="button" aria-label="Open navigation" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)}><Menu size={19} /></button><span className="breadcrumb">Workspace</span><span className="breadcrumb-divider">/</span><strong>{activeItem?.label}</strong></div>
          <div className="topbar-actions"><span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><ThemeToggle className="topbar-theme-toggle" /><button className="icon-button" type="button" title="Refresh" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={17} className={refreshing ? 'spin-icon' : ''} /></button></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><span className="section-kicker">{view === 'assistant' ? 'SNOWFLEX AI' : 'PEOPLE OPERATIONS'}</span><h1>{view === 'overview' ? `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.fullName.split(' ')[0]}` : activeItem?.label}</h1><p>{view === 'overview' ? 'Here is what is happening across your workspace today.' : view === 'assistant' ? 'Ask about leave, attendance, teams and tasks across your workspace.' : `Manage ${activeItem?.label.toLowerCase()} in one place.`}</p></div>
            <div className="heading-actions">
              {view === 'attendance' && role === 'EMPLOYEE' && <><button className="secondary-action" type="button" onClick={() => void perform('/attendance/check-in', 'POST')}>Check in</button><button className="primary-action" type="button" onClick={() => void perform('/attendance/check-out', 'POST')}>Check out</button></>}
              {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE') || (view === 'leaves' && role === 'EMPLOYEE')) && <button className="primary-action" type="button" onClick={() => { setEditingRow(null); setForm({ name: '', userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' }); setShowCreate((open) => !open) }}><Plus size={16} />{editingRow ? 'Cancel Edit' : view === 'leaves' ? 'Request leave' : `Add ${view === 'employees' ? 'employee' : view === 'departments' ? 'department' : 'task'}`}</button>}
            </div>
          </div>

          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {notice && <div className="notice success-notice" role="status">{notice}</div>}

          {showCreate && (
          <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditingRow(null); }} role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 id="create-modal-title">{editingRow ? 'Edit' : 'Add'} {view === 'employees' ? 'Employee' : view === 'departments' ? 'Department' : view === 'tasks' ? 'Task' : 'Leave Request'}</h3>
                <button className="modal-close" type="button" onClick={() => { setShowCreate(false); setEditingRow(null); }} aria-label="Close"><XIcon size={18} /></button>
              </div>
              <form className="create-panel" onSubmit={(event) => { event.preventDefault(); const path = editingRow ? `/${view}/${editingRow.id}` : `/${view}`; const method = editingRow ? 'PATCH' : 'POST'; let payload: Record<string, unknown> = {}; if (view === 'departments') payload = { name: form.name }; else if (view === 'employees') payload = { userId: Number(form.userId), employeeCode: form.employeeCode, departmentId: Number(form.departmentId) || null }; else if (view === 'tasks') payload = { title: form.title, assignedTo: Number(form.assignedTo) }; else payload = { leaveTypeId: Number(form.leaveTypeId), startDate: form.startDate, endDate: form.endDate, reason: form.reason }; void perform(path, method, payload) }}>
                {view === 'departments' && (
                  <>
                    <label>Department Name<input required value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} placeholder="Enter department name" /></label>
                  </>
                )}
                {view === 'employees' && (
                  <>
                    <label>User ID<input required min="1" type="number" value={form.userId} onChange={(event) => setForm({...form, userId: event.target.value})} placeholder="Existing user ID" /></label>
                    <label>Employee Code<input required value={form.employeeCode} onChange={(event) => setForm({...form, employeeCode: event.target.value})} placeholder="e.g., EMP001" /></label>
                    <label>Department ID<input type="number" min="1" value={form.departmentId} onChange={(event) => setForm({...form, departmentId: event.target.value})} placeholder="Department ID (optional)" /></label>
                  </>
                )}
                {view === 'tasks' && (
                  <>
                    <label>Task Title<input required value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="Enter task title" /></label>
                    <label>Assigned To (Employee ID)<input required min="1" type="number" value={form.assignedTo} onChange={(event) => setForm({...form, assignedTo: event.target.value})} placeholder="Employee ID" /></label>
                  </>
                )}
                {view === 'leaves' && (
                  <>
                    <label>Leave Type ID<input required min="1" type="number" value={form.leaveTypeId} onChange={(event) => setForm({...form, leaveTypeId: event.target.value})} placeholder="Leave type ID" /></label>
                    <label>Start Date<input required type="date" value={form.startDate} onChange={(event) => setForm({...form, startDate: event.target.value})} /></label>
                    <label>End Date<input required type="date" value={form.endDate} onChange={(event) => setForm({...form, endDate: event.target.value})} /></label>
                    <label>Reason<textarea required value={form.reason} onChange={(event) => setForm({...form, reason: event.target.value})} placeholder="Reason for leave" rows={3} /></label>
                  </>
                )}
                <div className="modal-footer">
                  <button type="button" className="secondary-action" onClick={() => { setShowCreate(false); setEditingRow(null); }}>Cancel</button>
                  <button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : editingRow ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

          {view === 'assistant' ? (
            token && <AiAssistant token={token} onError={setError} />
          ) : view === 'overview' ? (
            <>
              <div className="metric-grid">{metrics.map(([label,value,detail,Icon]) => <article className="metric-panel" key={label}><div className="metric-topline"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{detail}</small></article>)}</div>
              <section className="overview-lower"><div className="panel-section"><div className="panel-title"><div><span className="section-kicker">DIRECTORY</span><h2>People at a glance</h2></div><button className="text-action" type="button" onClick={() => setView('employees')}>View directory <ChevronRight size={15} /></button></div><p className="empty-copy">Your live employee directory is ready. Choose Employees to browse profiles and teams.</p></div><div className="panel-section pulse-panel"><div className="panel-title"><div><span className="section-kicker">YOUR ACCESS</span><h2>{role}</h2></div><Activity size={19} /></div><p className="empty-copy">Workspace data is loaded directly from Snowflake.</p></div></section>
            </>
          ) : (
            <section className="table-panel">
              <div className="table-toolbar">
                <div><span className="section-kicker">LIVE FROM SNOWFLAKE</span><h2>{activeItem?.label}</h2></div>
                <div className="toolbar-right">
                  {isManagementView && (
                    <InputBase
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); resetPagination() }}
                      startAdornment={<Search size={18} color="#8a978e" />}
                      sx={{ width: 280, '& .MuiInputBase-input': { padding: '8px 12px', fontSize: 13, color: '#293f34' }, '& .MuiInputBase-root': { background: 'white', border: '1px solid #dfe5dc', borderRadius: 5 } }}
                    />
                  )}
                  <span className="record-count">{filteredRows.length} records</span>
                </div>
              </div>
              {loading ? (
                <Paper sx={{ p: 4, textAlign: 'center', color: '#89958c' }}>Loading records…</Paper>
              ) : filteredRows.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', color: '#89958c' }}>No records to show yet.</Paper>
              ) : (
                <>
                  <TableContainer sx={{ border: '1px solid #e2e8df', borderRadius: 6, overflow: 'hidden', width: '100%' }}>
                    <Table stickyHeader aria-label={activeItem?.label} sx={{ width: '100%', tableLayout: 'auto' }}>
                      <TableHead>
                        <TableRow>
                          {Object.keys(rows[0] || {}).filter((key) => !['description'].includes(key)).slice(0, 7).map((key) => (
                            <TableCell key={key} sortDirection={sortConfig?.key === key ? sortConfig.direction : false} sx={{ minWidth: 150 }}>
                              <TableSortLabel
                                active={sortConfig?.key === key}
                                direction={sortConfig?.key === key ? sortConfig.direction : 'asc'}
                                onClick={() => handleSort(key)}
                              >
                                {key.replace(/[A-Z]/g, letter => ` ${letter}`).toUpperCase()}
                              </TableSortLabel>
                            </TableCell>
                          ))}
                          {view === 'tasks' && <TableCell sx={{ minWidth: 160 }}>UPDATE</TableCell>}
                          {view === 'leaves' && ['ADMIN','HR','MANAGER'].includes(role ?? '') && <TableCell sx={{ minWidth: 180 }}>REVIEW</TableCell>}
                          {showActions && <TableCell align="right" sx={{ minWidth: 100 }}>ACTIONS</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedRows.map((row, index) => (
                          <TableRow key={String(row.id ?? index)} hover>
                            {Object.entries(row).filter(([key]) => !['description'].includes(key)).slice(0, 7).map(([key, value]) => (
                              <TableCell key={key}>{key.toLowerCase().includes('date') ? formatDate(value) : String(value ?? '—')}</TableCell>
                            ))}
                            {view === 'tasks' && (
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                  <MuiSelect
                                    defaultValue={String(row.status ?? 'TODO')}
                                    onChange={(event) => void perform(`/tasks/${row.id}/status`, 'PATCH', { status: event.target.value })}
                                    label="Status"
                                  >
                                    <MenuItem value="TODO">TODO</MenuItem>
                                    <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                                    <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                                    <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                                  </MuiSelect>
                                </FormControl>
                              </TableCell>
                            )}
                            {view === 'leaves' && ['ADMIN','HR','MANAGER'].includes(role ?? '') && (
                              <TableCell>
                                {decidedRows.has(Number(row.id)) || row.status === 'APPROVED' || row.status === 'REJECTED' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2e7d4d', fontSize: 12, fontWeight: 600, padding: '6px 10px' }}>
                                    <Check size={14} /> {row.status === 'APPROVED' ? 'Approved' : row.status === 'REJECTED' ? 'Rejected' : 'Decided'}
                                  </span>
                                ) : (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="primary-action" style={{ padding: '6px 10px', fontSize: 11, minHeight: 'auto' }} onClick={() => void perform(`/leaves/${row.id}/approve`, 'PATCH')}>Approve</button>
                                    <button className="secondary-action" style={{ padding: '6px 10px', fontSize: 11, minHeight: 'auto' }} onClick={() => void perform(`/leaves/${row.id}/reject`, 'PATCH', { reason: 'Not approved' })}>Reject</button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {showActions && (
                              <TableCell align="right">
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <IconButton size="small" aria-label="View" title="View" onClick={() => handleView(row)}><Eye size={16} /></IconButton>
                                  <IconButton size="small" aria-label="Edit" title="Edit" onClick={() => handleEdit(row)}><Edit size={16} /></IconButton>
                                  <IconButton size="small" aria-label="Delete" title="Delete" onClick={() => void handleDelete(row)}><Trash2 size={16} /></IconButton>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={filteredRows.length}
                    rowsPerPage={pageSize}
                    page={currentPage - 1}
                    onPageChange={(_, page) => setCurrentPage(page + 1)}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Rows per page"
                    labelDisplayedRows={({ from, to, count }) => `${from + 1}–${to} of ${count}`}
                    sx={{ '& .MuiTablePagination-toolbar': { padding: '16px 20px', borderTop: '1px solid #edf0eb' }, '& .MuiTablePagination-select': { color: '#243a33' }, '& .MuiTablePagination-selectIcon': { color: '#8a978e' } }}
                  />
                </>
              )}
            </section>
          )}
          <footer className="content-foot"><span>Snowflex People Operations</span><span>Connected workspace <span className="connection-dot" /></span></footer>
        </div>
      </section>
    </main>
  )
}