import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Activity, ArrowUpRight, Building2, Calendar, CalendarDays, Check, CheckSquare2,
  ChevronRight, CircleHelp, Clock3, LayoutDashboard, LogOut, Menu,
  PanelLeftOpen, Plus, RefreshCw, Snowflake, Sparkles, Users, X,
  Edit, Trash2, Eye, Search, X as XIcon, UserCheck, UserX, RotateCcw, AlertTriangle,
  Briefcase, Shield, User, LayoutGrid, List, CheckCircle2, ArrowUpDown,
  Server, ShieldCheck, UserCircle2, MessageSquare
} from 'lucide-react'
import {
  apiRequest, clearToken, getCurrentUser, getDashboard,
  getDepartments, getEmployees, getUsers, logout, readToken,
  getAdminSystemInfo, getEmployeeStats, terminateEmployee, reactivateEmployee,
  type AdminSystemInfo, type EmployeeStats
} from '../lib/auth-api'
import type { DashboardData, SafeUser } from '../lib/auth-api'
import { AVATAR_UPDATED_EVENT } from '../lib/avatar'
import AiAssistant from '../components/AiAssistant'
import AiChatWidget from '../components/AiChatWidget'
import ThemeToggle from '../components/ThemeToggle'
import AdminUsersView from '../components/AdminUsersView'
import AdminSystemView from '../components/AdminSystemView'
import TopProfileDropdown from '../components/TopProfileDropdown'
import NotificationBell from '../components/NotificationBell'
import UserAvatar from '../components/UserAvatar'
import UnreadBadge from '../components/UnreadBadge'
import LeaveManagementView from '../components/LeaveManagementView'
import LeaveTypeBadge from '../components/LeaveTypeBadge'
import HolidaysView from '../components/HolidaysView'
import UpcomingHolidaysWidget from '../components/UpcomingHolidaysWidget'
import { fetchLeaveActionCount } from '../lib/leave-api'
import { useNotifications } from '../hooks/useNotifications'
import { SkeletonOverview, SkeletonTable, SkeletonCards } from '../components/Skeleton'
import LiveChatView from '../components/chat/LiveChatView'
import { useChat } from '../context/ChatContext'

type View = 'overview' | 'assistant' | 'chat' | 'employees' | 'departments' | 'attendance' | 'leaves' | 'holidays' | 'tasks' | 'users' | 'system' | 'profile'
type Row = Record<string, unknown>
type ViewMode = 'table' | 'cards'

const formatDate = (value: unknown) => {
  if (!value) return '—'
  const date = new Date(String(value))
  return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatDateTime = (value: unknown) => {
  if (!value) return '—'
  const date = new Date(String(value))
  return isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialView = (searchParams.get('view') as View) || 'overview'
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<SafeUser | null>(null)
  const [view, setView] = useState<View>(initialView)

  useEffect(() => {
    const qView = searchParams.get('view') as View | null
    if (qView && qView !== view) {
      setView(qView)
    }
  }, [searchParams])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DashboardData>({})
  const [rows, setRows] = useState<Row[]>([])
  const [recentLeaves, setRecentLeaves] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<SafeUser[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<Row[]>([])
  const [adminUsers, setAdminUsers] = useState<SafeUser[]>([])
  const [adminSystemInfo, setAdminSystemInfo] = useState<AdminSystemInfo | null>(null)
  const [form, setForm] = useState({
    name: '', userId: '', employeeCode: '', departmentId: '',
    phone: '', designation: '', joiningDate: '', fullName: '', email: '',
    title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: ''
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [editingRow, setEditingRow] = useState<Row | null>(null)
  const [viewingRow, setViewingRow] = useState<Row | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [employeeStatusTab, setEmployeeStatusTab] = useState<'ACTIVE' | 'TERMINATED' | 'ALL'>('ACTIVE')
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null)
  const [terminateTarget, setTerminateTarget] = useState<Row | null>(null)
  const [terminateReason, setTerminateReason] = useState('')
  const [terminating, setTerminating] = useState(false)
  const [terminateError, setTerminateError] = useState('')
  const [reactivateTarget, setReactivateTarget] = useState<Row | null>(null)
  const [reactivating, setReactivating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [leaveActionCount, setLeaveActionCount] = useState(0)
  const { markByTypeAsRead, clear: clearNotifications } = useNotifications()
  const { totalUnreadCount: chatUnreadCount } = useChat()

  // Mark leave and holiday notifications as read when opening their respective views
  useEffect(() => {
    if (view === 'leaves') {
      void markByTypeAsRead('LEAVE')
    } else if (view === 'holidays') {
      void markByTypeAsRead('HOLIDAY')
    }
  }, [view, markByTypeAsRead])

  useEffect(() => {
    if (!token || !user) return
    let active = true
    let loadingCount = false
    const updateCount = async () => {
      if (loadingCount) return
      loadingCount = true
      try {
        const count = await fetchLeaveActionCount()
        if (active) setLeaveActionCount(count)
      } catch {
        // Keep the last known count if the badge endpoint is temporarily unavailable.
      } finally {
        loadingCount = false
      }
    }
    void updateCount()
    const interval = window.setInterval(() => { void updateCount() }, 20000)
    window.addEventListener('focus', updateCount)
    window.addEventListener('leaves-updated', updateCount)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', updateCount)
      window.removeEventListener('leaves-updated', updateCount)
    }
  }, [token, user?.id, user?.role])

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
        const [dashboardStats, statsData] = await Promise.all([
          getDashboard(currentToken, currentUser.role),
          getEmployeeStats(currentToken).catch(() => null),
        ])
        setStats(dashboardStats)
        if (statsData) setEmployeeStats(statsData)
        setRows([])
        // Concurrently fetch recent leaves for overview intelligence feed
        try {
          const leavesPath = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) ? '/leaves' : '/leaves/me'
          const leavesData = await apiRequest<Row[]>(leavesPath, currentToken)
          setRecentLeaves(leavesData.slice(0, 4))
        } catch {
          // Non-critical if recent leaves fail to load
        }
      } else if (currentView === 'assistant' || currentView === 'chat' || currentView === 'holidays') {
        setRows([])
      } else if (currentView === 'employees') {
        const [empData, deptData, statsData] = await Promise.all([
          getEmployees(currentToken, employeeStatusTab),
          getDepartments(currentToken).catch(() => []),
          getEmployeeStats(currentToken).catch(() => null),
        ])
        setRows(empData)
        setAvailableDepartments(deptData)
        if (statsData) setEmployeeStats(statsData)
        if (['ADMIN', 'SUPER_ADMIN', 'HR'].includes(currentUser.role)) {
          getUsers(currentToken).then(setAvailableUsers).catch(() => {})
        }
      } else if (currentView === 'departments') {
        const deptData = await getDepartments(currentToken)
        setRows(deptData)
        setAvailableDepartments(deptData)
      } else if (currentView === 'users') {
        const users = await getUsers(currentToken)
        setAdminUsers(users)
        setRows(users as unknown as Row[])
      } else if (currentView === 'system') {
        const sys = await getAdminSystemInfo(currentToken)
        setAdminSystemInfo(sys)
        setRows([])
      } else {
        const path = currentView === 'attendance'
          ? currentUser.role === 'EMPLOYEE' ? '/attendance/me' : '/attendance'
          : currentView === 'leaves'
            ? ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) ? '/leaves' : '/leaves/me'
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
    if (token && user) {
      void loadData(token, user, view)
      setSearchQuery('')
      setStatusFilter('ALL')
      setCurrentPage(1)
    }
  }, [view])

  useEffect(() => {
    if (!token || !user) return
    let syncing = false
    const syncCurrentView = async () => {
      if (syncing || document.visibilityState !== 'visible') return
      syncing = true
      try {
        const latestUser = await getCurrentUser(token)
        setUser(latestUser)
        await loadData(token, latestUser, view)
      } catch {
        // Keep the current view usable when a background refresh fails.
      } finally {
        syncing = false
      }
    }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void syncCurrentView() }
    window.addEventListener('focus', syncCurrentView)
    window.addEventListener(AVATAR_UPDATED_EVENT, syncCurrentView)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', syncCurrentView)
      window.removeEventListener(AVATAR_UPDATED_EVENT, syncCurrentView)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [token, user?.id, view])

  async function refresh() {
    if (token && user) {
      setRefreshing(true)
      try {
        await loadData(token, user, view)
        toast.success('Workspace updated from Snowflake')
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

      if (method === 'POST' && view === 'employees') {
        if (!result || typeof result !== 'object' || !('id' in result)) {
          throw new Error('Employee creation failed: No valid record returned from server.')
        }
      }

      let successMsg = 'Saved successfully'
      if (method === 'POST') {
        if (path.includes('check-in')) successMsg = 'Checked in successfully! Have a great day.'
        else if (path.includes('check-out')) successMsg = 'Checked out successfully! See you tomorrow.'
        else if (view === 'employees') successMsg = 'Employee profile created successfully'
        else if (view === 'departments') successMsg = 'Department created successfully'
        else if (view === 'tasks') successMsg = 'Task assigned successfully'
        else if (view === 'leaves') successMsg = 'Leave request submitted successfully'
      } else if (method === 'PATCH' || method === 'PUT') {
        if (path.includes('/approve')) successMsg = 'Leave request approved'
        else if (path.includes('/reject')) successMsg = 'Leave request rejected'
        else if (path.includes('/status')) successMsg = 'Task status updated'
        else successMsg = 'Record updated successfully'
      }
      toast.success(successMsg)

      if (method === 'POST' && result && typeof result === 'object' && 'id' in result) {
        setRows((prev) => [result as Row, ...prev.filter((r) => r.id !== (result as Row).id)])
      } else if (method === 'POST' && payload && typeof payload === 'object') {
        const tempRow: Row = { id: -Date.now(), ...(payload as Row) }
        setRows((prev) => [tempRow, ...prev])
      } else if ((method === 'PATCH' || method === 'PUT') && result && typeof result === 'object' && 'id' in result) {
        setRows((prev) => prev.map((row) => (row.id === (result as Row).id ? { ...row, ...result } : row)))
      } else if (method === 'PATCH' && path.includes('/status') && payload && typeof payload === 'object' && 'status' in payload) {
        const id = path.split('/')[2]
        setRows((prev) => prev.map((row) => (row.id === Number(id) ? { ...row, status: (payload as { status: string }).status } : row)))
      } else if (method === 'PATCH' && (path.includes('/approve') || path.includes('/reject'))) {
        const id = path.split('/')[2]
        const newStatus = path.includes('/approve') ? 'APPROVED' : 'REJECTED'
        setRows((prev) => prev.map((row) => (row.id === Number(id) ? { ...row, status: newStatus } : row)))
      }

      setShowCreate(false)
      setEditingRow(null)
      setForm({
        name: '', userId: '', employeeCode: '', departmentId: '',
        phone: '', designation: '', joiningDate: '', fullName: '', email: '',
        title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: ''
      })
      setSearchQuery('')
      setStatusFilter('ALL')
      setCurrentPage(1)
      setSortConfig(null)

      if (token && user) {
        void loadData(token, user, view)
      }
    } catch (requestError) {
      const errMsg = requestError instanceof Error ? requestError.message : 'Could not save changes.'
      setError(errMsg)
      toast.error(errMsg)
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
      clearNotifications()
      navigate('/login', { replace: true })
    }
  }

  function handleEdit(row: Row) {
    setEditingRow(row)
    if (view === 'employees') {
      setForm({
        name: '',
        userId: String(row.userId ?? ''),
        employeeCode: String(row.employeeCode ?? ''),
        departmentId: String(row.departmentId ?? ''),
        phone: String(row.phone ?? ''),
        designation: String(row.designation ?? ''),
        joiningDate: String(row.joiningDate ?? '').slice(0, 10),
        fullName: String(row.fullName ?? ''),
        email: String(row.email ?? ''),
        title: '',
        assignedTo: '',
        leaveTypeId: '1',
        startDate: '',
        endDate: '',
        reason: '',
      })
    } else if (view === 'departments') {
      setForm({
        name: String(row.name ?? ''),
        userId: '',
        employeeCode: '',
        departmentId: '',
        phone: '',
        designation: '',
        joiningDate: '',
        fullName: '',
        email: '',
        title: '',
        assignedTo: '',
        leaveTypeId: '1',
        startDate: '',
        endDate: '',
        reason: '',
      })
    } else if (view === 'tasks') {
      setForm({
        name: '',
        userId: '',
        employeeCode: '',
        departmentId: '',
        phone: '',
        designation: '',
        joiningDate: '',
        fullName: '',
        email: '',
        title: String(row.title ?? ''),
        assignedTo: String(row.assignedTo ?? ''),
        leaveTypeId: '1',
        startDate: '',
        endDate: '',
        reason: '',
      })
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
      toast.success('Record deleted successfully')
      setCurrentPage(1)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete record')
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

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((row) => String(row.status || '').toUpperCase() === statusFilter)
    }

    // Query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(query))
      )
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.key] ?? '')
        const bVal = String(b[sortConfig.key] ?? '')
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return result
  }, [rows, searchQuery, statusFilter, sortConfig])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const role = user?.role === 'USER' ? 'EMPLOYEE' : user?.role
  const canManage = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'HR'
  const roleLabel = role
  const roleClass = String(role || 'employee').toLowerCase().replace('_', '-')

  const navGroups = useMemo(() => {
    const groups: { label: string; items: { id: View; label: string; icon: typeof LayoutDashboard }[] }[] = [
      { label: 'OVERVIEW', items: [
        { id: 'overview' as View, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'chat' as View, label: 'Chat', icon: MessageSquare as unknown as typeof LayoutDashboard },
        { id: 'assistant' as View, label: 'AI Employee', icon: Sparkles },
      ] },
      { label: 'MANAGEMENT', items: [
        { id: 'employees' as View, label: 'Employees', icon: Users },
        { id: 'departments' as View, label: 'Departments', icon: Building2 },
      ] },
      { label: 'TIME & WORK', items: [
        { id: 'attendance' as View, label: 'Attendance', icon: Clock3 },
        { id: 'leaves' as View, label: 'Leave requests', icon: CalendarDays },
        { id: 'holidays' as View, label: 'Holidays', icon: Calendar },
        { id: 'tasks' as View, label: 'Tasks', icon: CheckSquare2 },
      ] },
    ]

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      groups.push({
        label: 'ADMINISTRATION',
        items: [
          { id: 'users' as View, label: 'Users & Roles', icon: ShieldCheck as unknown as typeof LayoutDashboard },
          { id: 'system' as View, label: 'System Diagnostics', icon: Server as unknown as typeof LayoutDashboard },
        ],
      })
    }

    groups.push({
      label: 'ACCOUNT',
      items: [
        { id: 'profile' as View, label: 'My Profile', icon: UserCircle2 as unknown as typeof LayoutDashboard },
      ],
    })

    return groups
  }, [role])

  const viewItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups])
  const activeItem = viewItems.find((item) => item.id === view)
  const isManagementView = view === 'employees' || view === 'departments'
  const showActions = canManage && isManagementView
  const isEmployee = role === 'EMPLOYEE'
  const isAdminWorkspace = role === 'ADMIN' || role === 'SUPER_ADMIN'

  // Workforce Pulse Calculations
  const attendanceTotal = role === 'MANAGER'
    ? (stats.teamSize ?? 0)
    : (stats.activeEmployees ?? stats.totalEmployees ?? 0)
  const attendancePresent = role === 'MANAGER'
    ? (stats.teamPresentToday ?? 0)
    : (stats.presentToday ?? 0)
  const attendanceAbsent = role === 'MANAGER'
    ? (stats.teamAbsentToday ?? 0)
    : (stats.absentToday ?? 0)
  const attendanceLate = role === 'MANAGER' ? 0 : (stats.lateToday ?? 0)
  const attendanceOnTime = Math.max(0, attendancePresent - attendanceLate)
  const attendanceRate = attendanceTotal > 0
    ? Math.min(100, Math.round((attendancePresent / attendanceTotal) * 100))
    : 0

  const onTimePercent = attendanceTotal > 0 ? (attendanceOnTime / attendanceTotal) * 100 : 0
  const latePercent = attendanceTotal > 0 ? (attendanceLate / attendanceTotal) * 100 : 0
  const absentPercent = attendanceTotal > 0 ? (attendanceAbsent / attendanceTotal) * 100 : 0

  // Metrics configurations
  const metrics = role === 'EMPLOYEE'
    ? [
      { label: 'Attendance', value: stats.attendanceThisMonth ?? 0, detail: 'Recorded days this month', icon: CalendarDays, iconClass: 'kpi-icon-emerald', trend: 'Monthly Log', trendClass: 'kpi-trend-emerald' },
      { label: 'Open Tasks', value: stats.assignedTasks ?? 0, detail: 'Active deliverables', icon: CheckSquare2, iconClass: 'kpi-icon-amber', trend: 'Assigned', trendClass: 'kpi-trend-amber' },
      { label: 'Leave Balance', value: `${stats.leaveBalance ?? 0} d`, detail: 'Days remaining in quota', icon: Clock3, iconClass: 'kpi-icon-cyan', trend: 'Quota', trendClass: 'kpi-trend-cyan' },
      { label: 'Completed', value: stats.completedTasks ?? 0, detail: 'Tasks finished', icon: Activity, iconClass: 'kpi-icon-purple', trend: 'All Done', trendClass: 'kpi-trend-emerald' },
    ]
    : role === 'MANAGER'
      ? [
        { label: 'Team Size', value: stats.teamSize ?? 0, detail: 'Direct reporting members', icon: Users, iconClass: 'kpi-icon-emerald', trend: 'Team Staff', trendClass: 'kpi-trend-emerald' },
        { label: 'Present Today', value: stats.teamPresentToday ?? 0, detail: 'Team active today', icon: Clock3, iconClass: 'kpi-icon-cyan', trend: `${attendanceRate}% Turnout`, trendClass: 'kpi-trend-cyan' },
        { label: 'Leave Petitions', value: stats.pendingLeaveRequests ?? 0, detail: 'Awaiting manager review', icon: CalendarDays, iconClass: 'kpi-icon-amber', trend: 'Pending', trendClass: 'kpi-trend-amber' },
        { label: 'Open Tasks', value: stats.pendingTasks ?? 0, detail: 'Across entire team', icon: CheckSquare2, iconClass: 'kpi-icon-purple', trend: 'In Progress', trendClass: 'kpi-trend-amber' },
      ]
      : [
        { label: 'Total Workforce', value: stats.totalEmployees ?? 0, detail: `${stats.activeEmployees ?? 0} active in directory`, icon: Users, iconClass: 'kpi-icon-emerald', trend: 'Enterprise Staff', trendClass: 'kpi-trend-emerald' },
        { label: 'Present Today', value: stats.presentToday ?? 0, detail: `${stats.lateToday ?? 0} arrived after 09:00`, icon: Clock3, iconClass: 'kpi-icon-cyan', trend: `${attendanceRate}% Turnout`, trendClass: 'kpi-trend-cyan' },
        { label: 'Absent Today', value: stats.absentToday ?? 0, detail: 'Capacity unavailable', icon: UserCheck, iconClass: 'kpi-icon-rose', trend: stats.absentToday ? 'Requires Attention' : 'Full Team', trendClass: stats.absentToday ? 'kpi-trend-rose' : 'kpi-trend-emerald' },
        { label: 'Pending Leaves', value: stats.pendingLeaves ?? 0, detail: 'Time-off requests to review', icon: CalendarDays, iconClass: 'kpi-icon-amber', trend: 'Action Needed', trendClass: 'kpi-trend-amber' },
      ]

  const actionItems = [
    { label: 'Leave requests to review', count: stats.pendingLeaves ?? stats.pendingLeaveRequests ?? 0, view: 'leaves' as View, icon: CalendarDays },
    { label: 'Active tasks in progress', count: isEmployee ? stats.assignedTasks ?? 0 : stats.pendingTasks ?? 0, view: 'tasks' as View, icon: CheckSquare2 },
  ]

  const shortcuts = [
    { label: 'Attendance Tracking', desc: 'Manage check-ins & shifts', view: 'attendance' as View, icon: Clock3 },
    { label: isEmployee ? 'Request Leave' : 'Leave Administration', desc: 'Petitions & annual balance', view: 'leaves' as View, icon: CalendarDays },
    { label: 'Holidays & Observances', desc: 'Calendar schedule & breaks', view: 'holidays' as View, icon: Calendar },
    { label: 'Task Assignments', desc: 'Priorities & deliverables', view: 'tasks' as View, icon: CheckSquare2 },
    ...(canManage ? [
      { label: 'Employee Directory', desc: 'Profiles, codes & status', view: 'employees' as View, icon: Users },
      { label: 'Departments', desc: 'Organizational teams', view: 'departments' as View, icon: Building2 },
    ] : []),
    ...(isAdminWorkspace ? [
      { label: 'User Roles & Governance', desc: 'Access level governance', view: 'users' as View, icon: ShieldCheck },
      { label: 'System Diagnostics', desc: 'Snowflake & SMTP health', view: 'system' as View, icon: Server },
    ] : []),
    { label: 'AI Workspace Agent', desc: 'Ask natural questions', view: 'assistant' as View, icon: Sparkles },
    { label: 'My Profile & Security', desc: 'Account credentials & avatar', view: 'profile' as View, icon: UserCircle2 },
  ]

  function renderStatusPill(statusValue: unknown) {
    const raw = String(statusValue || '').toUpperCase()
    if (raw === 'ACTIVE' || raw === 'APPROVED' || raw === 'COMPLETED') {
      return (
        <span className="status-pill status-active">
          <span className="status-pill-dot" />
          {raw === 'APPROVED' ? <Check size={12} strokeWidth={2.5} /> : null}
          {raw}
        </span>
      )
    }
    if (raw === 'PENDING' || raw === 'HALF_DAY' || raw === 'LATE') {
      return (
        <span className="status-pill status-pending">
          <span className="status-pill-dot" />
          <Clock3 size={12} />
          {raw}
        </span>
      )
    }
    if (raw === 'TERMINATED') {
      return (
        <span className="status-pill status-terminated" title="Deactivated / Terminated Employee">
          <span className="status-pill-dot" />
          <UserX size={12} />
          TERMINATED
        </span>
      )
    }
    if (raw === 'REJECTED' || raw === 'ABSENT' || raw === 'CANCELLED') {
      return (
        <span className="status-pill status-rejected">
          <span className="status-pill-dot" />
          <X size={12} />
          {raw}
        </span>
      )
    }
    if (raw === 'IN_PROGRESS' || raw === 'TODO' || raw === 'PRESENT') {
      return (
        <span className="status-pill status-todo">
          <span className="status-pill-dot" />
          {raw}
        </span>
      )
    }
    return <span className="status-pill">{raw || '—'}</span>
  }

  function canTerminateRow(targetRow: Row): boolean {
    if (!user) return false
    const currentRole = (user.role || '').toUpperCase()
    if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(currentRole)) return false

    // Cannot terminate self
    const targetUserId = Number(targetRow.userId || targetRow.id)
    if (targetUserId === user.id) return false

    const targetStatus = String(targetRow.status || 'ACTIVE').toUpperCase()
    if (targetStatus === 'TERMINATED') return false

    const targetRole = String(targetRow.role || 'EMPLOYEE').toUpperCase()
    if (currentRole === 'HR') {
      if (['ADMIN', 'SUPER_ADMIN', 'HR'].includes(targetRole)) return false
    }
    if (currentRole === 'ADMIN') {
      if (targetRole === 'SUPER_ADMIN') return false
    }
    return true
  }

  function canReactivateRow(targetRow: Row): boolean {
    if (!user) return false
    const currentRole = (user.role || '').toUpperCase()
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) return false

    const targetStatus = String(targetRow.status || 'ACTIVE').toUpperCase()
    if (targetStatus !== 'TERMINATED') return false

    const targetRole = String(targetRow.role || 'EMPLOYEE').toUpperCase()
    if (currentRole === 'ADMIN' && targetRole === 'SUPER_ADMIN') return false

    return true
  }

  async function handleEmployeeStatusTabChange(newTab: 'ACTIVE' | 'TERMINATED' | 'ALL') {
    setEmployeeStatusTab(newTab)
    setCurrentPage(1)
    if (token) {
      try {
        setLoading(true)
        const [empData, statsData] = await Promise.all([
          getEmployees(token, newTab),
          getEmployeeStats(token).catch(() => null),
        ])
        setRows(empData)
        if (statsData) setEmployeeStats(statsData)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to filter employees')
      } finally {
        setLoading(false)
      }
    }
  }

  function handleOpenTerminate(target: Row) {
    setTerminateTarget(target)
    setTerminateReason('')
    setTerminateError('')
  }

  function handleOpenReactivate(target: Row) {
    setReactivateTarget(target)
  }

  async function handleConfirmTerminate() {
    if (!token || !terminateTarget || terminating) return
    const reason = terminateReason.trim()
    if (reason.length < 5) {
      setTerminateError('Reason must be at least 5 characters.')
      return
    }

    setTerminating(true)
    setTerminateError('')
    try {
      await terminateEmployee(token, Number(terminateTarget.id), reason)
      toast.success('Employee terminated successfully')
      setTerminateTarget(null)
      setTerminateReason('')
      // Refresh list & stats without page reload
      const [empData, statsData] = await Promise.all([
        getEmployees(token, employeeStatusTab),
        getEmployeeStats(token).catch(() => null),
      ])
      setRows(empData)
      if (statsData) setEmployeeStats(statsData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to terminate employee'
      setTerminateError(msg)
      toast.error(msg)
      if (msg.toLowerCase().includes('already terminated')) {
        setTerminateTarget(null)
        setTerminateReason('')
        const [empData, statsData] = await Promise.all([
          getEmployees(token, employeeStatusTab),
          getEmployeeStats(token).catch(() => null),
        ]).catch(() => [null, null])
        if (empData) setRows(empData)
        if (statsData) setEmployeeStats(statsData)
      }
    } finally {
      setTerminating(false)
    }
  }

  async function handleConfirmReactivate() {
    if (!token || !reactivateTarget || reactivating) return

    setReactivating(true)
    try {
      await reactivateEmployee(token, Number(reactivateTarget.id))
      toast.success('Employee reactivated successfully')
      setReactivateTarget(null)
      // Refresh list & stats without page reload
      const [empData, statsData] = await Promise.all([
        getEmployees(token, employeeStatusTab),
        getEmployeeStats(token).catch(() => null),
      ])
      setRows(empData)
      if (statsData) setEmployeeStats(statsData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reactivate employee'
      toast.error(msg)
      if (msg.toLowerCase().includes('already active')) {
        setReactivateTarget(null)
        const [empData, statsData] = await Promise.all([
          getEmployees(token, employeeStatusTab),
          getEmployeeStats(token).catch(() => null),
        ]).catch(() => [null, null])
        if (empData) setRows(empData)
        if (statsData) setEmployeeStats(statsData)
      }
    } finally {
      setReactivating(false)
    }
  }

  if (!user) return (
    <main className="dashboard-loading">
      <div className="live-loader" role="status" aria-live="polite">
        <span className="live-loader-ring"><i /><i /><i /><i /></span>
        <strong>Loading your workspace…</strong>
        <small>Connecting to Snowflake People Operations Data Warehouse</small>
      </div>
    </main>
  )

  const currentHour = new Date().getHours()
  const greetingTime = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'

  return (
    <main className={`workbench${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${mobileSidebarOpen ? ' is-mobile-sidebar-open' : ''}${view === 'assistant' ? ' is-ai-page' : ''}${view === 'chat' ? ' is-chat-page' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="workbench-sidebar" aria-label="Workspace sidebar">
        <div className="sidebar-brand-row">
          <a className="workbench-brand" href="/dashboard" title="Snowflex People Operations">
            <Snowflake className="workbench-mark" size={20} strokeWidth={2.5} />
            <span className="sidebar-brand-copy">
              snowflex
              <span className="brand-caption">PEOPLE OPERATIONS</span>
            </span>
          </a>
          <button
            className="sidebar-toggle"
            type="button"
            title={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={mobileSidebarOpen ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={mobileSidebarOpen || !sidebarCollapsed}
            onClick={() => {
              if (window.matchMedia('(max-width: 680px)').matches) setMobileSidebarOpen(false)
              else setSidebarCollapsed((collapsed) => !collapsed)
            }}
          >
            {mobileSidebarOpen ? <X size={19} /> : sidebarCollapsed ? <PanelLeftOpen size={17} /> : <Menu size={19} />}
          </button>
        </div>

        <nav className="workbench-nav" aria-label="Workspace navigation">
          {navGroups.map(({ label: groupLabel, items }, groupIndex) => (
            <div className="nav-group" key={groupLabel}>
              <div className="workspace-label">{groupLabel}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={view === id ? 'nav-item selected' : 'nav-item'}
                  title={sidebarCollapsed ? label : undefined}
                  aria-label={label}
                  onClick={() => {
                    if (id === 'profile') {
                      navigate('/profile')
                    } else {
                      setView(id)
                    }
                    setMobileSidebarOpen(false)
                  }}
                  type="button"
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  {id === 'leaves' && <UnreadBadge count={leaveActionCount} className="sidebar-leave-badge" />}
                  {id === 'chat' && <UnreadBadge count={chatUnreadCount} className="sidebar-chat-badge" />}
                  {view === id && <ChevronRight className="nav-chevron" size={15} />}
                </button>
              ))}
              {groupIndex < navGroups.length - 1 && <div className="nav-separator" />}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-row" title="Snowflake Connected Workspace">
            <CircleHelp size={16} />
            <span>Snowflake DB v2.4</span>
          </div>
          <div
            className="profile-chip"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
            title="My Profile & Security"
          >
            <UserAvatar name={user.fullName} avatarUrl={user.avatarUrl} size={34} className="profile-avatar" />
            <span className="profile-copy">
              <strong>{user.fullName}</strong>
              <small>{roleLabel}</small>
            </span>
            <button
              type="button"
              className="sidebar-logout-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleLogout()
              }}
              title="Sign out"
            >
              <LogOut size={16} aria-label="Sign out" />
            </button>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <button
          className="mobile-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)} role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="logout-modal-title">Sign Out</h3>
              <button className="modal-close" type="button" onClick={() => setShowLogoutConfirm(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-body">Are you sure you want to end your Snowflex session?</p>
            <div className="modal-footer">
              <button className="secondary-action" type="button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="primary-action" type="button" onClick={confirmLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="delete-modal-title">Delete Record</h3>
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-body">Are you sure you want to delete this record from Snowflake? This action is permanent and cannot be undone.</p>
            <div className="modal-footer">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-action" style={{ background: '#dc2626', borderColor: '#dc2626' }} type="button" onClick={confirmDelete}>Delete Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Employee Confirmation Modal */}
      {terminateTarget && (
        <div
          className="modal-overlay"
          onClick={() => { if (!terminating) setTerminateTarget(null) }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="terminate-modal-title"
        >
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="terminate-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <UserX size={18} /> Terminate Employee
              </h3>
              <button
                className="modal-close"
                type="button"
                disabled={terminating}
                onClick={() => setTerminateTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Danger Warning Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  marginBottom: '16px',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>This employee will lose access immediately.</strong>
                  <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                    Active sessions and sockets will be disconnected immediately. The employee will not be able to log in or access any workspace feature.
                  </p>
                </div>
              </div>

              {/* Target info badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle, #f3f6f1)',
                  marginBottom: '18px',
                }}
              >
                <UserAvatar
                  name={String(terminateTarget.fullName || 'User')}
                  avatarUrl={String(terminateTarget.avatarUrl || '') || null}
                  size={42}
                  className="avatar-circle"
                />
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--text-main, #193c33)' }}>
                    {String(terminateTarget.fullName || 'Unnamed Employee')}
                  </strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #728477)', marginTop: '2px' }}>
                    Role: <strong style={{ color: 'var(--text-main, #193c33)' }}>{String(terminateTarget.role || 'EMPLOYEE')}</strong> &bull; Code: {String(terminateTarget.employeeCode || '—')} &bull; {String(terminateTarget.email || '')}
                  </div>
                </div>
              </div>

              {/* Reason Form Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #193c33)' }}>
                  Reason for Termination <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={terminateReason}
                  onChange={(e) => {
                    setTerminateReason(e.target.value)
                    if (e.target.value.trim().length >= 5) setTerminateError('')
                  }}
                  placeholder="Provide an audit reason for termination (required, minimum 5 characters)..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    border: terminateError ? '1px solid #ef4444' : '1px solid var(--border-color, #dbe2d8)',
                    fontFamily: 'inherit',
                  }}
                  disabled={terminating}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {terminateError ? (
                    <span style={{ fontSize: '11.5px', color: '#ef4444' }}>{terminateError}</span>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #728477)' }}>
                      Minimum 5 characters required for audit trail
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #728477)' }}>
                    {terminateReason.trim().length} chars
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                disabled={terminating}
                onClick={() => setTerminateTarget(null)}
              >
                Cancel
              </button>
              <button
                className="primary-action"
                type="button"
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  opacity: (terminateReason.trim().length < 5 || terminating) ? 0.6 : 1,
                  cursor: (terminateReason.trim().length < 5 || terminating) ? 'not-allowed' : 'pointer',
                }}
                disabled={terminateReason.trim().length < 5 || terminating}
                onClick={handleConfirmTerminate}
              >
                {terminating ? 'Terminating...' : 'Terminate Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Employee Confirmation Modal */}
      {reactivateTarget && (
        <div
          className="modal-overlay"
          onClick={() => { if (!reactivating) setReactivateTarget(null) }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reactivate-modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="reactivate-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                <RotateCcw size={18} /> Reactivate Employee
              </h3>
              <button
                className="modal-close"
                type="button"
                disabled={reactivating}
                onClick={() => setReactivateTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13.5px', lineHeight: 1.5 }}>
                Are you sure you want to reactivate <strong>{String(reactivateTarget.fullName || 'this employee')}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #728477)' }}>
                Their status will be restored to <strong>ACTIVE</strong> and their account will immediately be permitted to sign in and access the workspace again.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                disabled={reactivating}
                onClick={() => setReactivateTarget(null)}
              >
                Cancel
              </button>
              <button
                className="primary-action"
                type="button"
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                }}
                disabled={reactivating}
                onClick={handleConfirmReactivate}
              >
                {reactivating ? 'Reactivating...' : 'Reactivate Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
      {viewingRow && (
        <div className="modal-overlay" onClick={() => setViewingRow(null)} role="dialog" aria-modal="true" aria-labelledby="view-modal-title">
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="view-modal-title">
                {view === 'employees' ? 'Employee Profile' : view === 'departments' ? 'Department Info' : 'Record Details'}
              </h3>
              <button className="modal-close" type="button" onClick={() => setViewingRow(null)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px', maxHeight: '65vh', overflow: 'auto' }}>
                {view === 'employees' && (
                  <div className="avatar-user-cell" style={{ marginBottom: '20px' }}>
                    <UserAvatar name={String(viewingRow.fullName || 'User')} avatarUrl={String(viewingRow.avatarUrl || '') || null} size={48} className="avatar-circle" />
                    <div className="avatar-info-copy">
                      <strong>{String(viewingRow.fullName || 'Employee')}</strong>
                      {Boolean(viewingRow.email) && <small>{String(viewingRow.email)}</small>}
                    </div>
                  </div>
                )}
                <dl className="detail-grid">
                {Object.entries(viewingRow).filter(([key]) => !['description', 'createdAt', 'updatedAt'].includes(key) && !key.toLowerCase().includes('avatar')).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <dt>{key.replace(/[A-Z]/g, letter => ` ${letter}`).replace(/Id$/, ' ID').toUpperCase()}</dt>
                    <dd>{key.toLowerCase().includes('date') ? formatDate(value) : key.toLowerCase().includes('status') ? renderStatusPill(value) : String(value ?? '—')}</dd>
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

      {/* Main Workspace Body */}
      <section className="workbench-main">
        <header className="workbench-topbar">
          <div className="topbar-location">
            <button className="mobile-sidebar-open-button" type="button" aria-label="Open navigation" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activeItem?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="dash-snowflake-pill" title="Live Snowflake Connection">
              <span className="dash-pulse-dot" />
              <span>Snowflake Live</span>
            </div>
            <span className="today-label">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <NotificationBell />
            <ThemeToggle className="topbar-theme-toggle" />
            <button
              className="icon-button"
              type="button"
              title="Refresh Workspace"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RefreshCw size={17} className={refreshing ? 'spin-icon' : ''} />
            </button>
            <TopProfileDropdown user={user} />
          </div>
        </header>

        <div className={view === 'assistant' ? 'page-content ai-page-content' : view === 'chat' ? 'page-content chat-page-content' : 'page-content'}>
          {view === 'chat' || view === 'assistant' ? (
            /* Compact Header for Chat & AI Employee */
            <section className="chat-hero-compact">
              <div className="chat-hero-compact-content">
                {view === 'chat' ? (
                  <MessageSquare size={18} className="chat-hero-compact-icon" />
                ) : (
                  <Sparkles size={18} className="chat-hero-compact-icon" />
                )}
                <h1 className="chat-hero-compact-title">{view === 'chat' ? 'Chat' : 'AI Employee'}</h1>
                <span className={`dash-role-badge role-${roleClass}`}>
                  {role === 'ADMIN' ? <Shield size={12} /> : role === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : role === 'HR' ? <Users size={12} /> : role === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                  {roleLabel}
                </span>
                <span className="chat-hero-compact-sub">
                  {view === 'chat'
                    ? 'Live messaging with your team'
                    : 'Natural language queries for people operations'}
                </span>
              </div>

              <div className="chat-hero-clock" title="Current Time">
                <Clock3 size={14} className="chat-hero-clock-icon" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </section>
          ) : (
            /* Executive Hero Banner */
            <section className="dash-hero">
              <div className="dash-hero-content">
                <div className="dash-hero-topline">
                  <span className="dash-kicker">
                    {view === 'overview'
                      ? 'SNOWFLEX PEOPLE PLATFORM'
                      : view === 'users' || view === 'system'
                        ? 'ADMINISTRATION PORTAL'
                        : 'PEOPLE OPERATIONS'}
                  </span>
                  <span className={`dash-role-badge role-${roleClass}`}>
                    {role === 'ADMIN' ? <Shield size={12} /> : role === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : role === 'HR' ? <Users size={12} /> : role === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                    {roleLabel}
                  </span>
                </div>
                <h1 className="dash-hero-title">
                  {view === 'overview'
                    ? `Good ${greetingTime}, ${user.fullName.split(' ')[0]}`
                    : activeItem?.label}
                </h1>
                <p className="dash-hero-sub">
                  {view === 'overview'
                    ? isAdminWorkspace
                      ? 'Executive Operations Console • Real-time synchronization across your Snowflake data warehouse.'
                      : role === 'MANAGER'
                        ? 'Team Operations Hub • Monitor attendance, review team leave petitions, and drive deliverables.'
                        : 'Personal Workspace • Track attendance, check leave balances, and review assigned tasks.'
                    : view === 'users'
                      ? 'Governance console: configure user access levels, manage role promotions, and audit registered accounts.'
                      : view === 'system'
                        ? 'Telemetry console: monitor live Snowflake cloud connections, runtime status, and test SMTP email delivery.'
                        : `Centralized registry and workflows for ${activeItem?.label?.toLowerCase() || 'this module'}.`}
                </p>
              </div>

              <div className="dash-hero-actions">
                {view === 'attendance' && role === 'EMPLOYEE' && (
                  <>
                    <button className="secondary-action" type="button" onClick={() => void perform('/attendance/check-in', 'POST')}>
                      Check In
                    </button>
                    <button className="primary-action" type="button" onClick={() => void perform('/attendance/check-out', 'POST')}>
                      Check Out
                    </button>
                  </>
                )}

                {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE')) && (
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => {
                      setEditingRow(null)
                      setForm({
                        name: '', userId: '', employeeCode: '', departmentId: '',
                        phone: '', designation: '', joiningDate: '', fullName: '', email: '',
                        title: '', assignedTo: '', leaveTypeId: '1', startDate: '', endDate: '', reason: ''
                      })
                      setShowCreate((open) => !open)
                    }}
                  >
                    <Plus size={16} />
                    {`Add ${view === 'employees' ? 'Employee' : view === 'departments' ? 'Department' : 'Task'}`}
                  </button>
                )}

                <div className="dash-time-chip" title="Current Time">
                  <Clock3 size={15} color="#517154" />
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </section>
          )}

          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {notice && <div className="notice success-notice" role="status">{notice}</div>}

          {/* Create / Edit Modal Form */}
          {showCreate && (
            <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditingRow(null) }} role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
              <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 id="create-modal-title">
                    {editingRow ? 'Edit' : 'Add New'} {view === 'employees' ? 'Employee' : view === 'departments' ? 'Department' : view === 'tasks' ? 'Task' : 'Leave Request'}
                  </h3>
                  <button className="modal-close" type="button" onClick={() => { setShowCreate(false); setEditingRow(null) }} aria-label="Close">
                    <XIcon size={18} />
                  </button>
                </div>
                <form
                  className="create-panel"
                  style={{ border: 'none', margin: 0, padding: '24px' }}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const path = editingRow ? `/${view}/${editingRow.id}` : `/${view}`
                    const method = editingRow ? 'PATCH' : 'POST'
                    let payload: Record<string, unknown> = {}
                    if (view === 'departments') payload = { name: form.name.trim() }
                    else if (view === 'employees') {
                      if (editingRow) {
                        payload = {
                          employeeCode: form.employeeCode.trim(),
                          departmentId: Number(form.departmentId) || null,
                          phone: form.phone.trim() || null,
                          designation: form.designation.trim() || null,
                          joiningDate: form.joiningDate || null,
                        }
                      } else {
                        payload = {
                          ...(form.userId ? { userId: Number(form.userId) } : {}),
                          ...(form.fullName ? { fullName: form.fullName.trim() } : {}),
                          ...(form.email ? { email: form.email.trim() } : {}),
                          employeeCode: form.employeeCode.trim(),
                          departmentId: Number(form.departmentId) || null,
                          phone: form.phone.trim() || null,
                          designation: form.designation.trim() || null,
                          joiningDate: form.joiningDate || null,
                        }
                      }
                    }
                    else if (view === 'tasks') payload = { title: form.title.trim(), assignedTo: Number(form.assignedTo) }
                    else payload = { leaveTypeId: Number(form.leaveTypeId), startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim() }
                    void perform(path, method, payload)
                  }}
                >
                  {view === 'employees' && editingRow && (
                    <div className="avatar-user-cell" style={{ width: '100%', marginBottom: '16px' }}>
                      <UserAvatar name={String(editingRow.fullName || 'User')} avatarUrl={String(editingRow.avatarUrl || '') || null} size={38} className="avatar-circle" />
                      <strong>{String(editingRow.fullName || 'Employee')}</strong>
                    </div>
                  )}
                  {view === 'departments' && (
                    <label style={{ width: '100%' }}>
                      Department Name
                      <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g., Engineering, People Ops, Marketing" />
                    </label>
                  )}
                  {view === 'employees' && (
                    <>
                      {!editingRow && availableUsers.length > 0 && (
                        <label style={{ width: '100%' }}>
                          Select User Account (Auto-links Snowflake User)
                          <select
                            value={form.userId}
                            onChange={(e) => {
                              const selectedId = e.target.value
                              const selectedUser = availableUsers.find(u => String(u.id) === selectedId)
                              setForm(prev => ({
                                ...prev,
                                userId: selectedId,
                                fullName: selectedUser ? selectedUser.fullName : prev.fullName,
                                email: selectedUser ? selectedUser.email : prev.email,
                                employeeCode: prev.employeeCode || (selectedId ? `EMP-${String(selectedId).padStart(6, '0')}` : ''),
                              }))
                            }}
                          >
                            <option value="">-- Choose User Account (or enter User ID below) --</option>
                            {availableUsers.map((u) => {
                              const alreadyLinked = rows.some((r) => Number(r.userId) === u.id)
                              return (
                                <option key={u.id} value={String(u.id)}>
                                  {u.fullName} ({u.email}) [User #{u.id}]{alreadyLinked ? ' — Already Linked' : ''}
                                </option>
                              )
                            })}
                          </select>
                        </label>
                      )}
                      {!editingRow && (
                        <label>
                          User ID {availableUsers.length > 0 ? '(Selected or Custom)' : '(Existing Account)'}
                          <input
                            required={!form.fullName}
                            min="1"
                            type="number"
                            value={form.userId}
                            onChange={(event) => {
                              const val = event.target.value
                              setForm(prev => ({
                                ...prev,
                                userId: val,
                                employeeCode: prev.employeeCode || (val ? `EMP-${String(val).padStart(6, '0')}` : '')
                              }))
                            }}
                            placeholder="e.g. 101"
                          />
                        </label>
                      )}
                      <label>
                        Employee Code
                        <input
                          required
                          value={form.employeeCode}
                          onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
                          placeholder="e.g., EMP-000101"
                        />
                      </label>
                      {availableDepartments.length > 0 ? (
                        <label>
                          Department (Optional)
                          <select
                            value={form.departmentId}
                            onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                          >
                            <option value="">Unassigned</option>
                            {availableDepartments.map((dept) => (
                              <option key={String(dept.id)} value={String(dept.id)}>
                                {String(dept.name)} (ID: #{String(dept.id)})
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label>
                          Department ID (Optional)
                          <input
                            type="number"
                            min="1"
                            value={form.departmentId}
                            onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                            placeholder="Optional ID"
                          />
                        </label>
                      )}
                      <label>
                        Designation (Optional)
                        <input
                          value={form.designation}
                          onChange={(event) => setForm({ ...form, designation: event.target.value })}
                          placeholder="e.g. Senior Software Engineer"
                        />
                      </label>
                      <label>
                        Phone Number (Optional)
                        <input
                          value={form.phone}
                          onChange={(event) => setForm({ ...form, phone: event.target.value })}
                          placeholder="e.g. +1 555-0199"
                        />
                      </label>
                      <label>
                        Joining Date (Optional)
                        <input
                          type="date"
                          value={form.joiningDate}
                          onChange={(event) => setForm({ ...form, joiningDate: event.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {view === 'tasks' && (
                    <>
                      <label style={{ width: '100%' }}>Task Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Enter deliverable description" /></label>
                      <label style={{ width: '100%' }}>Assigned Employee ID<input required min="1" type="number" value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} placeholder="Employee record ID" /></label>
                    </>
                  )}
                  {view === 'leaves' && (
                    <>
                      <label>Leave Type ID<input required min="1" type="number" value={form.leaveTypeId} onChange={(event) => setForm({ ...form, leaveTypeId: event.target.value })} placeholder="1 = Casual, 2 = Sick, 3 = Annual" /></label>
                      <label>Start Date<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
                      <label>End Date<input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
                      <label style={{ width: '100%' }}>Reason for Absence<textarea required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Describe details for approval..." rows={3} /></label>
                    </>
                  )}
                  <div className="modal-footer" style={{ width: '100%', marginTop: '20px', padding: '16px 0 0' }}>
                    <button type="button" className="secondary-action" onClick={() => { setShowCreate(false); setEditingRow(null) }}>Cancel</button>
                    <button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving to Snowflake…' : editingRow ? 'Update Record' : 'Create Record'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW SWITCHER CONTENT */}
          {view === 'assistant' ? (
            token && <AiAssistant token={token} onError={setError} userName={user?.fullName || 'User'} avatarUrl={user?.avatarUrl} />
          ) : view === 'chat' ? (
            user && <LiveChatView currentUser={user} />
          ) : view === 'users' ? (
            <AdminUsersView
              users={adminUsers}
              token={token || ''}
              currentUserId={user?.id ?? 0}
              onRefresh={() => {
                if (token && user) void loadData(token, user, 'users')
              }}
              loading={loading}
            />
          ) : view === 'system' ? (
            <AdminSystemView
              systemInfo={adminSystemInfo}
              token={token || ''}
              adminEmail={user?.email || ''}
              onRefresh={() => {
                if (token && user) void loadData(token, user, 'system')
              }}
              loading={loading}
            />
          ) : view === 'leaves' ? (
            <LeaveManagementView
              userRole={role || 'EMPLOYEE'}
              currentUserId={user?.id ?? 0}
              token={token || ''}
            />
          ) : view === 'holidays' ? (
            <HolidaysView
              userRole={role || 'EMPLOYEE'}
              token={token || ''}
            />
          ) : view === 'overview' ? (
            loading && !stats ? (
              <SkeletonOverview />
            ) : (
              <>
                {/* 4 Premium Metric Cards */}
              <div className="kpi-metric-grid">
                {metrics.map(({ label, value, detail, icon: Icon, iconClass, trend, trendClass }) => (
                  <article className="kpi-card" key={label}>
                    <div className="kpi-head">
                      <span className="kpi-label">{label}</span>
                      <div className={`kpi-icon-box ${iconClass}`}>
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div className="kpi-value-row">
                      <strong className="kpi-value">{value}</strong>
                    </div>
                    <div className="kpi-foot">
                      <span className="kpi-detail">{detail}</span>
                      <span className={`kpi-trend-pill ${trendClass}`}>
                        {trend}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              {/* Overview Workspace Main Grid */}
              <div className="overview-dashboard-grid">
                {/* Workforce Pulse Widget */}
                <article className="overview-card">
                  <div className="overview-card-header">
                    <div>
                      <span className="dash-kicker">{isEmployee ? 'PERSONAL SNAPSHOT' : 'WORKFORCE METRICS'}</span>
                      <h2>{isEmployee ? 'Your Monthly Overview' : 'Live Attendance Pulse'}</h2>
                      <p>{isEmployee ? 'Time tracking & leave status for the current billing cycle.' : 'Daily active status of employees synchronized in real time.'}</p>
                    </div>
                    <button className="icon-button" type="button" onClick={() => setView('attendance')} title="View detailed attendance">
                      <ArrowUpRight size={17} />
                    </button>
                  </div>

                  {isEmployee ? (
                    <div className="pulse-rate-box">
                      <div className="pulse-rate-primary">
                        <strong>{stats.attendanceThisMonth ?? 0}</strong>
                        <span>days recorded this month</span>
                      </div>
                      <div className="pulse-rate-badge">
                        <CalendarDays size={16} />
                        <span>{stats.leaveBalance ?? 0} days remaining</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pulse-rate-box">
                        <div className="pulse-rate-primary">
                          <strong>{attendancePresent}</strong>
                          <span>/ {attendanceTotal} Active</span>
                        </div>
                        <div className="pulse-rate-badge">
                          <CheckCircle2 size={16} color="#10b981" />
                          <span>{attendanceRate}% Attendance Rate</span>
                        </div>
                      </div>

                      {/* Segmented multi-color progress track */}
                      <div className="pulse-multi-track" role="img" aria-label={`Attendance progress: ${attendanceRate}%`}>
                        <div className="pulse-track-segment pulse-seg-ontime" style={{ width: `${onTimePercent}%` }} title={`On time: ${attendanceOnTime}`} />
                        <div className="pulse-track-segment pulse-seg-late" style={{ width: `${latePercent}%` }} title={`Late: ${attendanceLate}`} />
                        <div className="pulse-track-segment pulse-seg-absent" style={{ width: `${absentPercent}%` }} title={`Absent: ${attendanceAbsent}`} />
                      </div>

                      <div className="pulse-legend-cards">
                        <div className="pulse-mini-card">
                          <div className="pulse-mini-head">
                            <span className="pulse-indicator-dot dot-ontime" />
                            <span>On Time</span>
                          </div>
                          <strong>{attendanceOnTime}</strong>
                          <small>{Math.round(onTimePercent)}% on schedule</small>
                        </div>

                        <div className="pulse-mini-card">
                          <div className="pulse-mini-head">
                            <span className="pulse-indicator-dot dot-late" />
                            <span>Late Arrival</span>
                          </div>
                          <strong>{attendanceLate}</strong>
                          <small>{Math.round(latePercent)}% after 09:00</small>
                        </div>

                        <div className="pulse-mini-card">
                          <div className="pulse-mini-head">
                            <span className="pulse-indicator-dot dot-absent" />
                            <span>Absent / Leave</span>
                          </div>
                          <strong>{attendanceAbsent}</strong>
                          <small>{Math.round(absentPercent)}% out today</small>
                        </div>
                      </div>
                    </>
                  )}
                </article>

                {/* Priority Needs Attention Card */}
                <article className="overview-card">
                  <div className="overview-card-header">
                    <div>
                      <span className="dash-kicker">ACTION REQUIRED</span>
                      <h2>Needs Attention</h2>
                      <p>Outstanding operational petitions awaiting decision.</p>
                    </div>
                    <Activity size={18} color="#10b981" />
                  </div>

                  <div className="priority-list">
                    {actionItems.map(({ label, count, view: targetView, icon: Icon }) => (
                      <button
                        className="priority-item-btn"
                        key={label}
                        type="button"
                        onClick={() => setView(targetView)}
                      >
                        <div className="priority-item-left">
                          <div className="priority-item-icon">
                            <Icon size={18} />
                          </div>
                          <div className="priority-item-info">
                            <strong>{label}</strong>
                            <small>{count > 0 ? 'Requires immediate action' : 'All caught up'}</small>
                          </div>
                        </div>
                        <div className="priority-item-right">
                          <span className={`priority-count-pill ${count === 0 ? 'priority-count-zero' : ''}`}>
                            {count}
                          </span>
                          <ArrowUpRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {recentLeaves.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf1eb' }}>
                      <span className="dash-kicker" style={{ fontSize: '10px' }}>RECENT TIME-OFF ACTIVITY</span>
                      <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                        {recentLeaves.slice(0, 2).map((item) => (
                          <div key={String(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <UserAvatar name={String(item.fullName || 'User')} avatarUrl={String(item.avatarUrl || '') || null} size={26} className="avatar-circle" />
                              <strong style={{ color: '#2b3f34' }}>{String(item.fullName || 'Employee')}</strong>
                            </div>
                            {renderStatusPill(item.status)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </div>

              {/* Upcoming Holidays Dashboard Section */}
              <div className="overview-holidays-banner-wrap">
                <UpcomingHolidaysWidget onNavigate={() => setView('holidays')} />
              </div>

              {/* Quick Launch Shortcuts Hub */}
              <section className="quick-launch-section">
                <span className="dash-kicker">WORKPLACE TOOLS</span>
                <div className="quick-launch-grid">
                  {shortcuts.map(({ label, desc, view: targetView, icon: Icon }) => (
                    <button
                      className="quick-launch-card"
                      key={label}
                      type="button"
                      onClick={() => {
                        if (targetView === 'profile') {
                          navigate('/profile')
                        } else {
                          setView(targetView)
                        }
                      }}
                    >
                      <div className="quick-launch-icon">
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <div className="quick-launch-text">
                        <strong>{label}</strong>
                        <small>{desc}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
            )
          ) : (
            <>
              {/* Employee KPI Summary Bar */}
              {view === 'employees' && employeeStats && (
                <div className="employee-kpi-bar">
                  <div className="employee-kpi-card active-card">
                    <div className="emp-kpi-icon-box kpi-icon-emerald">
                      <UserCheck size={20} strokeWidth={2.2} />
                    </div>
                    <div className="emp-kpi-info">
                      <span className="emp-kpi-label">Active Employees</span>
                      <strong className="emp-kpi-val">{employeeStats.activeCount}</strong>
                      <span className="emp-kpi-sub">Currently working</span>
                    </div>
                  </div>

                  <div className="employee-kpi-card terminated-card">
                    <div className="emp-kpi-icon-box kpi-icon-rose">
                      <UserX size={20} strokeWidth={2.2} />
                    </div>
                    <div className="emp-kpi-info">
                      <span className="emp-kpi-label">Terminated</span>
                      <strong className="emp-kpi-val">{employeeStats.terminatedCount}</strong>
                      <span className="emp-kpi-sub">Deactivated accounts</span>
                    </div>
                  </div>

                  <div className="employee-kpi-card roles-card">
                    <div className="emp-kpi-info" style={{ width: '100%' }}>
                      <span className="emp-kpi-label">Active Staff by Role</span>
                      <div className="emp-role-pills">
                        <span className="role-chip" title="Super Administrators">
                          <small>SUPER ADMIN</small>
                          <strong>{employeeStats.byRole?.SUPER_ADMIN ?? 0}</strong>
                        </span>
                        <span className="role-chip" title="Administrators">
                          <small>ADMIN</small>
                          <strong>{employeeStats.byRole?.ADMIN ?? 0}</strong>
                        </span>
                        <span className="role-chip" title="HR Personnel">
                          <small>HR</small>
                          <strong>{employeeStats.byRole?.HR ?? 0}</strong>
                        </span>
                        <span className="role-chip" title="Managers">
                          <small>MANAGER</small>
                          <strong>{employeeStats.byRole?.MANAGER ?? 0}</strong>
                        </span>
                        <span className="role-chip" title="Employees">
                          <small>EMPLOYEE</small>
                          <strong>{employeeStats.byRole?.EMPLOYEE ?? 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SaaS Modern Data Table / Cards Grid */}
              <section className="saas-table-card">
                <div className="saas-table-top">
                  <div className="saas-table-title-area">
                    <span className="dash-kicker">LIVE FROM SNOWFLAKE</span>
                    <h2>{activeItem?.label} Directory</h2>
                  </div>

                <div className="saas-table-actions">
                  {/* Search Bar */}
                  <div className="saas-search-box">
                    <Search size={16} />
                    <input
                      placeholder={`Search ${activeItem?.label.toLowerCase()}…`}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    />
                    {searchQuery && (
                      <button className="saas-search-clear" type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Status Filter for Attendance / Tasks / Leaves */}
                  {['leaves', 'tasks', 'attendance'].includes(view) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                        style={{
                          height: '38px', padding: '0 12px', borderRadius: '8px',
                          border: '1px solid #dbe2d8', background: 'white', color: '#193c33',
                          fontSize: '12px', fontWeight: 600
                        }}
                      >
                        <option value="ALL">All Statuses</option>
                        {view === 'tasks' && (
                          <>
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </>
                        )}
                        {view === 'attendance' && (
                          <>
                            <option value="PRESENT">Present</option>
                            <option value="HALF_DAY">Half Day</option>
                            <option value="LATE">Late</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Status Filter Tabs for Employees: Active | Terminated | All */}
                  {view === 'employees' && (
                    <div className="employee-filter-tabs">
                      <button
                        type="button"
                        className={`filter-tab-btn ${employeeStatusTab === 'ACTIVE' ? 'active' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('ACTIVE')}
                      >
                        Active
                        {employeeStats && <span className="tab-badge">{employeeStats.activeCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`filter-tab-btn ${employeeStatusTab === 'TERMINATED' ? 'active' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('TERMINATED')}
                      >
                        Terminated
                        {employeeStats && <span className="tab-badge badge-danger">{employeeStats.terminatedCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`filter-tab-btn ${employeeStatusTab === 'ALL' ? 'active' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('ALL')}
                      >
                        All
                        {employeeStats && (
                          <span className="tab-badge badge-neutral">
                            {(employeeStats.activeCount ?? 0) + (employeeStats.terminatedCount ?? 0)}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* View Mode Toggle (Table vs Cards) for Employees & Departments */}
                  {isManagementView && (
                    <div className="view-mode-toggle" title="Switch layout mode">
                      <button
                        className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setViewMode('table')}
                        aria-label="Table view"
                      >
                        <List size={16} />
                      </button>
                      <button
                        className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setViewMode('cards')}
                        aria-label="Grid cards view"
                      >
                        <LayoutGrid size={16} />
                      </button>
                    </div>
                  )}

                  <span className="saas-record-counter">{filteredRows.length} records</span>
                </div>
              </div>

              {loading ? (
                viewMode === 'cards' && isManagementView ? (
                  <SkeletonCards count={6} />
                ) : (
                  <SkeletonTable
                    columns={view === 'employees' ? (role === 'ADMIN' ? 7 : 6) : view === 'departments' ? 4 : 5}
                    rows={6}
                    hasAvatar={view === 'employees'}
                  />
                )
              ) : filteredRows.length === 0 ? (
                <div className="saas-empty-box">
                  <div className="empty-icon-wrap">
                    {view === 'employees' ? <Users size={30} /> : view === 'departments' ? <Building2 size={30} /> : view === 'tasks' ? <CheckSquare2 size={30} /> : <CalendarDays size={30} />}
                  </div>
                  <h3>No {activeItem?.label.toLowerCase()} found</h3>
                  <p>
                    {searchQuery
                      ? `No results match "${searchQuery}". Try adjusting your search or filters.`
                      : `Get started by creating your first ${activeItem?.label.toLowerCase()} record in Snowflake.`}
                  </p>
                  {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE')) && (
                    <button
                      className="primary-action"
                      type="button"
                      style={{ marginTop: '8px' }}
                      onClick={() => {
                        setEditingRow(null)
                        setShowCreate(true)
                      }}
                    >
                      <Plus size={16} /> Add {view === 'employees' ? 'Employee' : view === 'departments' ? 'Department' : 'Task'}
                    </button>
                  )}
                </div>
              ) : viewMode === 'cards' && isManagementView ? (
                /* Card Grid View */
                <>
                  <div className="saas-cards-grid">
                    {paginatedRows.map((row) => (
                      view === 'employees' ? (
                        <article className="emp-profile-card" key={String(row.id)}>
                          <div className="emp-card-top">
                            <div className="emp-card-identity">
                              <UserAvatar name={String(row.fullName || 'User')} avatarUrl={String(row.avatarUrl || '') || null} size={38} className="avatar-circle" />
                              <div className="emp-card-name">
                                <strong>{String(row.fullName || 'Unnamed')}</strong>
                                <small>{String(row.email || 'No email')}</small>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {renderStatusPill(row.status || 'ACTIVE')}
                              {String(row.status || '').toUpperCase() === 'TERMINATED' && Boolean(row.terminatedAt) && (
                                <span
                                  style={{ fontSize: '10.5px', color: '#f87171' }}
                                  title={row.terminationReason ? `Reason: ${String(row.terminationReason)}` : undefined}
                                >
                                  {formatDate(row.terminatedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="emp-card-meta-list">
                            <div className="emp-meta-row">
                              <span>Code</span>
                              <strong>{String(row.employeeCode || '—')}</strong>
                            </div>
                            <div className="emp-meta-row">
                              <span>Department</span>
                              <strong>{String(row.departmentName || row.departmentId || 'Unassigned')}</strong>
                            </div>
                            <div className="emp-meta-row">
                              <span>Designation</span>
                              <strong>{String(row.designation || '—')}</strong>
                            </div>
                            {isAdminWorkspace && (
                              <div className="emp-meta-row">
                                <span>Leave Status</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                  {row.onLeaveToday ? (
                                    <span className="on-leave-today-tag">
                                      🌴 On Leave ({String(row.todayLeaveName || 'Approved')})
                                    </span>
                                  ) : null}
                                  {Number(row.pendingLeaveCount) > 0 ? (
                                    <div className="emp-leave-status-cell">
                                      <LeaveTypeBadge
                                        name={String(row.firstPendingName || 'Pending Leave')}
                                        code={String(row.firstPendingCode || 'OTHER')}
                                        isPaid={Boolean(row.firstPendingIsPaid)}
                                        status="Pending"
                                      />
                                      {Number(row.pendingLeaveCount) > 1 && (
                                        <span className="more-leaves-chip" title={`All pending requests: ${String(row.pendingTypeNames || '')}`}>
                                          +{Number(row.pendingLeaveCount) - 1}
                                        </span>
                                      )}
                                    </div>
                                  ) : !row.onLeaveToday ? (
                                    <span style={{ color: '#8a9c90' }}>—</span>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="emp-card-footer">
                            <span style={{ fontSize: '11px', color: '#798c80' }}>
                              Created {formatDate(row.createdAt)}
                            </span>
                            <div className="table-action-btns">
                              <button className="action-chip-btn" type="button" onClick={() => handleView(row)} title="View profile"><Eye size={15} /></button>
                              {canManage && <button className="action-chip-btn" type="button" onClick={() => handleEdit(row)} title="Edit profile"><Edit size={15} /></button>}
                              {view === 'employees' && canTerminateRow(row) && (
                                <button
                                  className="action-chip-btn action-terminate"
                                  type="button"
                                  onClick={() => handleOpenTerminate(row)}
                                  title="Terminate employee"
                                >
                                  <UserX size={15} />
                                </button>
                              )}
                              {view === 'employees' && canReactivateRow(row) && (
                                <button
                                  className="action-chip-btn action-reactivate"
                                  type="button"
                                  onClick={() => handleOpenReactivate(row)}
                                  title="Reactivate employee"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              )}
                              {canManage && <button className="action-chip-btn action-delete" type="button" onClick={() => void handleDelete(row)} title="Delete"><Trash2 size={15} /></button>}
                            </div>
                          </div>
                        </article>
                      ) : (
                        <article className="dept-card" key={String(row.id)}>
                          <div className="dept-card-header">
                            <div className="dept-card-icon">
                              <Building2 size={24} />
                            </div>
                            <div className="dept-card-info">
                              <h3>{String(row.name || 'Unnamed')}</h3>
                              <span>ID #{String(row.id)}</span>
                            </div>
                          </div>
                          <div className="emp-card-footer" style={{ border: 'none', padding: 0 }}>
                            <span style={{ fontSize: '12px', color: '#798c80' }}>
                              Updated {formatDate(row.updatedAt || row.createdAt)}
                            </span>
                            <div className="table-action-btns">
                              <button className="action-chip-btn" type="button" onClick={() => handleView(row)} title="View details"><Eye size={15} /></button>
                              {canManage && <button className="action-chip-btn" type="button" onClick={() => handleEdit(row)} title="Edit department"><Edit size={15} /></button>}
                              {canManage && <button className="action-chip-btn action-delete" type="button" onClick={() => void handleDelete(row)} title="Delete department"><Trash2 size={15} /></button>}
                            </div>
                          </div>
                        </article>
                      )
                    ))}
                  </div>

                  {/* Pagination Bar */}
                  <div className="saas-pagination-bar">
                    <span>
                      Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
                    </span>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span>Page {currentPage} of {Math.ceil(filteredRows.length / pageSize) || 1}</span>
                      <button
                        className="pagination-btn"
                        type="button"
                        disabled={currentPage * pageSize >= filteredRows.length}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Table View */
                <>
                  <div className="saas-table-container">
                    <table className="saas-grid-table">
                      <thead>
                        {view === 'employees' ? (
                          <tr>
                            <th onClick={() => handleSort('fullName')} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>EMPLOYEE</span>
                                <ArrowUpDown size={12} color="#8a9c90" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('employeeCode')} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>CODE</span>
                                <ArrowUpDown size={12} color="#8a9c90" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('departmentName')} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>DEPARTMENT</span>
                                <ArrowUpDown size={12} color="#8a9c90" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('designation')} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>DESIGNATION</span>
                                <ArrowUpDown size={12} color="#8a9c90" />
                              </div>
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span>STATUS</span>
                                <ArrowUpDown size={12} color="#8a9c90" />
                              </div>
                            </th>
                            {isAdminWorkspace && <th>LEAVE STATUS</th>}
                            {showActions && <th style={{ textAlign: 'right' }}>ACTIONS</th>}
                          </tr>
                        ) : (
                          <tr>
                            {Object.keys(rows[0] || {}).filter((key) => !['description'].includes(key) && !key.toLowerCase().includes('avatar')).slice(0, 7).map((key) => (
                              <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{key.replace(/[A-Z]/g, letter => ` ${letter}`).toUpperCase()}</span>
                                  <ArrowUpDown size={12} color="#8a9c90" />
                                </div>
                              </th>
                            ))}
                            {view === 'tasks' && <th>STATUS UPDATE</th>}
                            {showActions && <th style={{ textAlign: 'right' }}>ACTIONS</th>}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {view === 'employees' ? (
                          paginatedRows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                              <td>
                                <div className="avatar-user-cell">
                                  <UserAvatar name={String(row.fullName || 'User')} avatarUrl={String(row.avatarUrl || '') || null} size={28} className="avatar-circle" />
                                  <div className="avatar-info-copy">
                                    <strong>{String(row.fullName || '—')}</strong>
                                    {row.email ? <small>{String(row.email)}</small> : null}
                                  </div>
                                </div>
                              </td>
                              <td><strong>{String(row.employeeCode || '—')}</strong></td>
                              <td>{String(row.departmentName || row.departmentId || 'Unassigned')}</td>
                              <td>{String(row.designation || '—')}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                  {renderStatusPill(row.status || 'ACTIVE')}
                                  {String(row.status || '').toUpperCase() === 'TERMINATED' && Boolean(row.terminatedAt) && (
                                    <span
                                      style={{ fontSize: '10.5px', color: '#f87171', whiteSpace: 'nowrap' }}
                                      title={row.terminationReason ? `Reason: ${String(row.terminationReason)}` : undefined}
                                    >
                                      Terminated {formatDate(row.terminatedAt)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {isAdminWorkspace && (
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                    {row.onLeaveToday ? (
                                      <span className="on-leave-today-tag" title="Employee has an approved leave covering today">
                                        🌴 On Leave Today ({String(row.todayLeaveName || 'Approved')})
                                      </span>
                                    ) : null}
                                    {Number(row.pendingLeaveCount) > 0 ? (
                                      <div className="emp-leave-status-cell">
                                        <LeaveTypeBadge
                                          name={String(row.firstPendingName || 'Pending Leave')}
                                          code={String(row.firstPendingCode || 'OTHER')}
                                          isPaid={Boolean(row.firstPendingIsPaid)}
                                          status="Pending"
                                        />
                                        {Number(row.pendingLeaveCount) > 1 && (
                                          <span
                                            className="more-leaves-chip"
                                            title={`All pending requests: ${String(row.pendingTypeNames || '')}`}
                                          >
                                            +{Number(row.pendingLeaveCount) - 1}
                                          </span>
                                        )}
                                      </div>
                                    ) : !row.onLeaveToday ? (
                                      <span style={{ color: '#8a9c90' }}>—</span>
                                    ) : null}
                                  </div>
                                </td>
                              )}
                              {showActions && (
                                <td style={{ textAlign: 'right' }}>
                                  <div className="table-action-btns">
                                    <button className="action-chip-btn" type="button" onClick={() => handleView(row)} title="View profile"><Eye size={15} /></button>
                                    {canManage && <button className="action-chip-btn" type="button" onClick={() => handleEdit(row)} title="Edit profile"><Edit size={15} /></button>}
                                    {view === 'employees' && canTerminateRow(row) && (
                                      <button
                                        className="action-chip-btn action-terminate"
                                        type="button"
                                        onClick={() => handleOpenTerminate(row)}
                                        title="Terminate employee"
                                      >
                                        <UserX size={15} />
                                      </button>
                                    )}
                                    {view === 'employees' && canReactivateRow(row) && (
                                      <button
                                        className="action-chip-btn action-reactivate"
                                        type="button"
                                        onClick={() => handleOpenReactivate(row)}
                                        title="Reactivate employee"
                                      >
                                        <RotateCcw size={15} />
                                      </button>
                                    )}
                                    {canManage && <button className="action-chip-btn action-delete" type="button" onClick={() => void handleDelete(row)} title="Delete record"><Trash2 size={15} /></button>}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          paginatedRows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                              {Object.entries(row).filter(([key]) => !['description'].includes(key) && !key.toLowerCase().includes('avatar')).slice(0, 7).map(([key, value]) => (
                                <td key={key}>
                                  {['fullname', 'assignedtoname', 'assignedbyname'].includes(key.toLowerCase()) ? (
                                    <div className="avatar-user-cell">
                                      <UserAvatar
                                        name={String(value || 'User')}
                                        avatarUrl={String(key.toLowerCase() === 'assignedtoname' ? row.assignedToAvatarUrl || '' : key.toLowerCase() === 'assignedbyname' ? row.assignedByAvatarUrl || '' : row.avatarUrl || '') || null}
                                        size={28}
                                        className="avatar-circle"
                                      />
                                      <div className="avatar-info-copy">
                                        <strong>{String(value || '—')}</strong>
                                        {key.toLowerCase() === 'fullname' && row.email ? <small>{String(row.email)}</small> : null}
                                      </div>
                                    </div>
                                  ) : key.toLowerCase().includes('status') ? (
                                    renderStatusPill(value)
                                  ) : key.toLowerCase().includes('date') ? (
                                    formatDate(value)
                                  ) : key.toLowerCase().includes('checkin') || key.toLowerCase().includes('checkout') ? (
                                    formatDateTime(value)
                                  ) : (
                                    String(value ?? '—')
                                  )}
                                </td>
                              ))}

                              {/* Task Status Selector */}
                              {view === 'tasks' && (
                                <td>
                                  <select
                                    defaultValue={String(row.status ?? 'TODO')}
                                    onChange={(event) => void perform(`/tasks/${row.id}/status`, 'PATCH', { status: event.target.value })}
                                    style={{
                                      padding: '5px 10px', borderRadius: '6px', border: '1px solid #d4ddd1',
                                      fontSize: '12px', background: 'white', color: '#193c33'
                                    }}
                                  >
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </td>
                              )}

                              {/* Action Buttons */}
                              {showActions && (
                                <td style={{ textAlign: 'right' }}>
                                  <div className="table-action-btns">
                                    <button className="action-chip-btn" type="button" onClick={() => handleView(row)} title="View details"><Eye size={15} /></button>
                                    {canManage && <button className="action-chip-btn" type="button" onClick={() => handleEdit(row)} title="Edit record"><Edit size={15} /></button>}
                                    {canManage && <button className="action-chip-btn action-delete" type="button" onClick={() => void handleDelete(row)} title="Delete record"><Trash2 size={15} /></button>}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar */}
                  <div className="saas-pagination-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
                      </span>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                        style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #dce2d7', fontSize: '12px' }}
                      >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                    </div>

                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span>Page {currentPage} of {Math.ceil(filteredRows.length / pageSize) || 1}</span>
                      <button
                        className="pagination-btn"
                        type="button"
                        disabled={currentPage * pageSize >= filteredRows.length}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
            </>
          )}

          <footer className="content-foot">
            <span>Snowflex People Operations Platform • Enterprise Data Warehouse Edition</span>
            <span>Connected to Snowflake <span className="connection-dot" /></span>
          </footer>
        </div>
      </section>

      {/* Floating AI Chat Widget */}
      {token && <AiChatWidget token={token} userName={user?.fullName || 'User'} avatarUrl={user?.avatarUrl} />}
    </main>
  )
}