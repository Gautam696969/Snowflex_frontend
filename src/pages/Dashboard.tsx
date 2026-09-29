import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Activity, Building2, CalendarDays, CheckSquare2, ChevronRight, CircleHelp,
  Clock3, LayoutDashboard, LogOut, Menu, PanelLeftOpen, Plus, RefreshCw, Snowflake, Users, X,
} from 'lucide-react'
import { apiRequest, clearToken, getCurrentUser, getDashboard, getDepartments, getEmployees, logout, readToken } from '../lib/auth-api'
import type { DashboardData, SafeUser } from '../lib/auth-api'

type View = 'overview' | 'employees' | 'departments' | 'attendance' | 'leaves' | 'tasks'
type Row = Record<string, unknown>

const navGroups: { label: string; items: { id: View; label: string; icon: typeof LayoutDashboard }[] }[] = [
  { label: 'OVERVIEW', items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
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
  const [stats, setStats] = useState<DashboardData>({})
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  async function loadData(currentToken: string, currentUser: SafeUser, currentView: View) {
    setLoading(true)
    setError('')
    try {
      if (currentView === 'overview') {
        setStats(await getDashboard(currentToken, currentUser.role))
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
    if (token && user) await loadData(token, user, view)
  }

  async function perform(path: string, method: string, payload?: unknown) {
    if (!token) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(path, token, method, payload)
      setNotice('Changes saved.')
      setShowCreate(false)
      setForm({ name: '', userId: '', employeeCode: '', departmentId: '', title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: '' })
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save changes.')
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

  const role = user?.role === 'USER' ? 'EMPLOYEE' : user?.role
  const canManage = role === 'ADMIN' || role === 'HR'
  const activeItem = viewItems.find((item) => item.id === view)
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

  if (!user) return <main className="dashboard-loading">Loading your workspace…</main>

  return (
    <main className={sidebarCollapsed ? 'workbench is-sidebar-collapsed' : 'workbench'}>
      <aside className="workbench-sidebar">
        <div className="sidebar-brand-row">
          <a className="workbench-brand" href="/dashboard" title="Snowflex People Operations"><Snowflake className="workbench-mark" size={20} strokeWidth={2.5} /><span className="sidebar-brand-copy">snowflex<span className="brand-caption">PEOPLE OPERATIONS</span></span></a>
          <button className="sidebar-toggle" type="button" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <Menu size={19} />}
          </button>
        </div>
        <nav className="workbench-nav" aria-label="Workspace navigation">
          {navGroups.map(({ label: groupLabel, items }, groupIndex) => (
            <div className="nav-group" key={groupLabel}>
              <div className="workspace-label">{groupLabel}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button key={id} className={view === id ? 'nav-item selected' : 'nav-item'} title={sidebarCollapsed ? label : undefined} aria-label={label} onClick={() => setView(id)} type="button">
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

      <section className="workbench-main">
        <header className="workbench-topbar">
          <div><span className="breadcrumb">Workspace</span><span className="breadcrumb-divider">/</span><strong>{activeItem?.label}</strong></div>
          <div className="topbar-actions"><span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="icon-button" type="button" title="Refresh" onClick={() => void refresh()}><RefreshCw size={17} /></button></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><span className="section-kicker">PEOPLE OPERATIONS</span><h1>{view === 'overview' ? `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.fullName.split(' ')[0]}` : activeItem?.label}</h1><p>{view === 'overview' ? 'Here is what is happening across your workspace today.' : `Manage ${activeItem?.label.toLowerCase()} in one place.`}</p></div>
            <div className="heading-actions">
              {view === 'attendance' && role === 'EMPLOYEE' && <><button className="secondary-action" type="button" onClick={() => void perform('/attendance/check-in', 'POST')}>Check in</button><button className="primary-action" type="button" onClick={() => void perform('/attendance/check-out', 'POST')}>Check out</button></>}
              {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE') || (view === 'leaves' && role === 'EMPLOYEE')) && <button className="primary-action" type="button" onClick={() => setShowCreate((open) => !open)}><Plus size={16} />{view === 'leaves' ? 'Request leave' : `Add ${view === 'employees' ? 'employee' : view === 'departments' ? 'department' : 'task'}`}</button>}
            </div>
          </div>

          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {notice && <div className="notice success-notice" role="status">{notice}</div>}

          {showCreate && <form className="create-panel" onSubmit={(event) => { event.preventDefault(); if (view === 'departments') void perform('/departments','POST',{name:form.name}); else if (view === 'employees') void perform('/employees','POST',{userId:Number(form.userId),employeeCode:form.employeeCode}); else if (view === 'tasks') void perform('/tasks','POST',{title:form.title,assignedTo:Number(form.assignedTo)}); else void perform('/leaves','POST',{leaveTypeId:Number(form.leaveTypeId),startDate:form.startDate,endDate:form.endDate,reason:form.reason}) }}>
            {view === 'departments' && <label>Department name<input required value={form.name} onChange={(event) => setForm({...form,name:event.target.value})} /></label>}
            {view === 'employees' && <><label>Existing user ID<input required min="1" type="number" value={form.userId} onChange={(event) => setForm({...form,userId:event.target.value})} /></label><label>Employee code<input required value={form.employeeCode} onChange={(event) => setForm({...form,employeeCode:event.target.value})} /></label></>}
            {view === 'tasks' && <><label>Task title<input required value={form.title} onChange={(event) => setForm({...form,title:event.target.value})} /></label><label>Employee record ID<input required min="1" type="number" value={form.assignedTo} onChange={(event) => setForm({...form,assignedTo:event.target.value})} /></label></>}
            {view === 'leaves' && <><label>Leave type ID<input required min="1" type="number" value={form.leaveTypeId} onChange={(event) => setForm({...form,leaveTypeId:event.target.value})} /></label><label>Start date<input required type="date" value={form.startDate} onChange={(event) => setForm({...form,startDate:event.target.value})} /></label><label>End date<input required type="date" value={form.endDate} onChange={(event) => setForm({...form,endDate:event.target.value})} /></label><label>Reason<input required value={form.reason} onChange={(event) => setForm({...form,reason:event.target.value})} /></label></>}
            <button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>
          </form>}

          {view === 'overview' ? (
            <>
              <div className="metric-grid">{metrics.map(([label,value,detail,Icon]) => <article className="metric-panel" key={label}><div className="metric-topline"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{detail}</small></article>)}</div>
              <section className="overview-lower"><div className="panel-section"><div className="panel-title"><div><span className="section-kicker">DIRECTORY</span><h2>People at a glance</h2></div><button className="text-action" type="button" onClick={() => setView('employees')}>View directory <ChevronRight size={15} /></button></div><p className="empty-copy">Your live employee directory is ready. Choose Employees to browse profiles and teams.</p></div><div className="panel-section pulse-panel"><div className="panel-title"><div><span className="section-kicker">YOUR ACCESS</span><h2>{role}</h2></div><Activity size={19} /></div><p className="empty-copy">Workspace data is loaded directly from Snowflake.</p></div></section>
            </>
          ) : (
            <section className="table-panel"><div className="table-toolbar"><div><span className="section-kicker">LIVE FROM SNOWFLAKE</span><h2>{activeItem?.label}</h2></div><span className="record-count">{rows.length} records</span></div>
              {loading ? <div className="table-empty">Loading records…</div> : rows.length === 0 ? <div className="table-empty">No records to show yet.</div> : <div className="table-scroll"><table><thead><tr>{Object.keys(rows[0]).filter((key) => !['description'].includes(key)).slice(0,7).map((key)=><th key={key}>{key.replace(/[A-Z]/g,letter=>` ${letter}`).toUpperCase()}</th>)}{view==='tasks'&&<th>UPDATE</th>}{view==='leaves'&&['ADMIN','HR','MANAGER'].includes(role??'')&&<th>REVIEW</th>}</tr></thead><tbody>{rows.map((row,index)=><tr key={String(row.id??index)}>{Object.entries(row).filter(([key])=>!['description'].includes(key)).slice(0,7).map(([key,value])=><td key={key}>{key.toLowerCase().includes('date')?formatDate(value):String(value??'—')}</td>)}{view==='tasks'&&<td><select aria-label="Task status" defaultValue={String(row.status??'TODO')} onChange={(event)=>void perform(`/tasks/${row.id}/status`,'PATCH',{status:event.target.value})}><option>TODO</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>CANCELLED</option></select></td>}{view==='leaves'&&['ADMIN','HR','MANAGER'].includes(role??'')&&<td className="review-actions"><button type="button" onClick={()=>void perform(`/leaves/${row.id}/approve`,'PATCH')}>Approve</button><button type="button" onClick={()=>void perform(`/leaves/${row.id}/reject`,'PATCH',{reason:'Not approved'})}>Reject</button></td>}</tr>)}</tbody></table></div>}
            </section>
          )}
          <footer className="content-foot"><span>Snowflex People Operations</span><span>Connected workspace <span className="connection-dot" /></span></footer>
        </div>
      </section>
    </main>
  )
}