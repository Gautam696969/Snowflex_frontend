import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Activity, ArrowUpRight, Building2, Calendar, CalendarDays, Check, CheckSquare2,
  Clock3, LayoutDashboard, Menu,
  Plus, RefreshCw, Sparkles, Users, X,
  Edit, Trash2, Eye, Search, X as XIcon, UserCheck, UserX, RotateCcw, AlertTriangle,
  Briefcase, Shield, User, LayoutGrid, List, CheckCircle2, ArrowUpDown,
  Server, ShieldCheck, UserCircle2, MessageSquare, Palette, ShieldAlert
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
import Sidebar from '../components/Sidebar'
import UserAvatar from '../components/UserAvatar'
import LeaveManagementView from '../components/LeaveManagementView'
import LeaveTypeBadge from '../components/LeaveTypeBadge'
import HolidaysView from '../components/HolidaysView'
import UpcomingHolidaysWidget from '../components/UpcomingHolidaysWidget'
import { fetchLeaveActionCount } from '../lib/leave-api'
import { useNotifications } from '../hooks/useNotifications'
import { SkeletonOverview, SkeletonTable, SkeletonCards } from '../components/Skeleton'
import LiveChatView from '../components/chat/LiveChatView'
import { useChat } from '../context/ChatContext'
import ThemeCustomizationView from '../components/ThemeCustomizationView'

type View = 'overview' | 'assistant' | 'chat' | 'employees' | 'departments' | 'attendance' | 'leaves' | 'holidays' | 'tasks' | 'users' | 'system' | 'themes' | 'profile'
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

  // Route guard: prevent unauthorized users from accessing theme settings
  useEffect(() => {
    if (view === 'themes' && user) {
      const currentRole = user.role === 'USER' ? 'EMPLOYEE' : user.role
      if (currentRole !== 'ADMIN' && currentRole !== 'SUPER_ADMIN') {
        toast.error('You do not have permission to access Theme Settings.')
        setView('overview')
        navigate('/dashboard?view=overview', { replace: true })
      }
    }
  }, [view, user, navigate])
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
      } else if (currentView === 'themes') {
        const users = await getUsers(currentToken)
        setAdminUsers(users)
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

  async function confirmLogout() {
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
          { id: 'themes' as View, label: 'Theme Settings', icon: Palette as unknown as typeof LayoutDashboard },
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
        <span className="status-pill status-active inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap bg-[#eaf7ed] text-[#166534] border border-[#bbf7d0]">
          <span className="status-pill-dot w-[6px] h-[6px] rounded-full bg-current" />
          {raw === 'APPROVED' ? <Check size={12} strokeWidth={2.5} /> : null}
          {raw}
        </span>
      )
    }
    if (raw === 'PENDING' || raw === 'HALF_DAY' || raw === 'LATE') {
      return (
        <span className="status-pill status-pending inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]">
          <span className="status-pill-dot w-[6px] h-[6px] rounded-full bg-current" />
          <Clock3 size={12} />
          {raw}
        </span>
      )
    }
    if (raw === 'TERMINATED') {
      return (
        <span className="status-pill status-terminated inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]" title="Deactivated / Terminated Employee">
          <span className="status-pill-dot w-[6px] h-[6px] rounded-full bg-current" />
          <UserX size={12} />
          TERMINATED
        </span>
      )
    }
    if (raw === 'REJECTED' || raw === 'ABSENT' || raw === 'CANCELLED') {
      return (
        <span className="status-pill status-rejected inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">
          <span className="status-pill-dot w-[6px] h-[6px] rounded-full bg-current" />
          <X size={12} />
          {raw}
        </span>
      )
    }
    if (raw === 'IN_PROGRESS' || raw === 'TODO' || raw === 'PRESENT') {
      return (
        <span className="status-pill status-todo inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap bg-[#e0f2fe] text-[#075985] border border-[#bae6fd]">
          <span className="status-pill-dot w-[6px] h-[6px] rounded-full bg-current" />
          {raw}
        </span>
      )
    }
    return <span className="status-pill inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] text-[11px] font-bold tracking-[0.02em] whitespace-nowrap">{raw || '—'}</span>
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
    <main className="dashboard-loading grid min-h-screen place-items-center text-[#617166] dark:text-[#c0ccc2] bg-[#f4f6f1] dark:bg-[#141a17] text-[13px]">
      <div className="live-loader grid justify-items-center gap-[14px] text-center" role="status" aria-live="polite">
        <span className="live-loader-ring relative w-[48px] h-[48px]"><i /><i /><i /><i /></span>
        <strong className="text-[#243a33] dark:text-[#edf2ec] font-bold text-[14px] font-sans">Loading your workspace…</strong>
        <small className="text-[#8a978e] text-[11px]">Connecting to Snowflake People Operations Data Warehouse</small>
      </div>
    </main>
  )

  const currentHour = new Date().getHours()
  const greetingTime = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'

  return (
    <main className={`workbench grid min-h-screen text-[#243a33] bg-[#f4f6f1] transition-[grid-template-columns] duration-180 ease-in-out ${sidebarCollapsed ? 'is-sidebar-collapsed grid-cols-[76px_minmax(0,1fr)]' : 'grid-cols-[256px_minmax(0,1fr)]'}${mobileSidebarOpen ? ' is-mobile-sidebar-open' : ''}${view === 'assistant' ? ' is-ai-page' : ''}${view === 'chat' ? ' is-chat-page' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={view}
        onSelectView={(v) => {
          if (v === 'profile') {
            navigate('/profile')
          } else {
            setView(v)
          }
        }}
        user={user}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        leaveUnreadCount={leaveActionCount}
        chatUnreadCount={chatUnreadCount}
        onLogout={confirmLogout}
      />

      {/* Delete Record Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease]" onClick={() => setDeleteTarget(null)} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal w-[min(100%,360px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb]">
              <h3 id="delete-modal-title" className="m-0 text-[#243a33] font-bold text-[16px] font-sans">Delete Record</h3>
              <button className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33]" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal-body m-0 p-[20px] text-[#546a5d] text-[14px] leading-[1.5]">Are you sure you want to delete this record from Snowflake? This action is permanent and cannot be undone.</p>
            <div className="modal-footer flex justify-end gap-[8px] p-[16px_20px] border-t border-[#edf0eb]">
              <button className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] transition-colors" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dc2626] rounded-[4px] text-white bg-[#dc2626] text-[11px] font-semibold cursor-pointer hover:bg-[#b91c1c] transition-colors" style={{ background: '#dc2626', borderColor: '#dc2626' }} type="button" onClick={confirmDelete}>Delete Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Employee Confirmation Modal */}
      {terminateTarget && (
        <div
          className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease]"
          onClick={() => { if (!terminating) setTerminateTarget(null) }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="terminate-modal-title"
        >
          <div className="modal modal-lg w-[min(100%,560px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb]">
              <h3 id="terminate-modal-title" className="m-0 font-bold text-[16px] font-sans" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <UserX size={18} /> Terminate Employee
              </h3>
              <button
                className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33]"
                type="button"
                disabled={terminating}
                onClick={() => setTerminateTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body m-0 p-[20px_24px] text-[#546a5d] text-[14px] leading-[1.5]" style={{ padding: '20px 24px' }}>
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
                  className="avatar-circle flex items-center justify-center rounded-full"
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
            <div className="modal-footer flex justify-end gap-[8px] p-[16px_20px] border-t border-[#edf0eb]">
              <button
                className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] transition-colors"
                type="button"
                disabled={terminating}
                onClick={() => setTerminateTarget(null)}
              >
                Cancel
              </button>
              <button
                className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dc2626] rounded-[4px] text-white bg-[#dc2626] text-[11px] font-semibold cursor-pointer hover:bg-[#b91c1c] transition-colors"
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
          className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease]"
          onClick={() => { if (!reactivating) setReactivateTarget(null) }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reactivate-modal-title"
        >
          <div className="modal w-[min(100%,360px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb]">
              <h3 id="reactivate-modal-title" className="m-0 font-bold text-[16px] font-sans" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                <RotateCcw size={18} /> Reactivate Employee
              </h3>
              <button
                className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33]"
                type="button"
                disabled={reactivating}
                onClick={() => setReactivateTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body m-0 p-[20px] text-[#546a5d] text-[14px] leading-[1.5]" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13.5px', lineHeight: 1.5 }}>
                Are you sure you want to reactivate <strong>{String(reactivateTarget.fullName || 'this employee')}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #728477)' }}>
                Their status will be restored to <strong>ACTIVE</strong> and their account will immediately be permitted to sign in and access the workspace again.
              </p>
            </div>
            <div className="modal-footer flex justify-end gap-[8px] p-[16px_20px] border-t border-[#edf0eb]">
              <button
                className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] transition-colors"
                type="button"
                disabled={reactivating}
                onClick={() => setReactivateTarget(null)}
              >
                Cancel
              </button>
              <button
                className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#059669] rounded-[4px] text-white bg-[#059669] text-[11px] font-semibold cursor-pointer hover:bg-[#047857] transition-colors"
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
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease]" onClick={() => setViewingRow(null)} role="dialog" aria-modal="true" aria-labelledby="view-modal-title">
          <div className="modal modal-lg w-[min(100%,560px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb]">
              <h3 id="view-modal-title" className="m-0 text-[#243a33] font-bold text-[16px] font-sans">
                {view === 'employees' ? 'Employee Profile' : view === 'departments' ? 'Department Info' : 'Record Details'}
              </h3>
              <button className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33]" type="button" onClick={() => setViewingRow(null)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <div className="modal-body m-0 text-[#546a5d] text-[14px] leading-[1.5]" style={{ padding: '24px', maxHeight: '65vh', overflow: 'auto' }}>
                {view === 'employees' && (
                  <div className="avatar-user-cell flex items-center gap-[12px]" style={{ marginBottom: '20px' }}>
                    <UserAvatar name={String(viewingRow.fullName || 'User')} avatarUrl={String(viewingRow.avatarUrl || '') || null} size={48} className="avatar-circle flex items-center justify-center rounded-full font-sans" />
                    <div className="avatar-info-copy flex flex-col">
                      <strong>{String(viewingRow.fullName || 'Employee')}</strong>
                      {Boolean(viewingRow.email) && <small>{String(viewingRow.email)}</small>}
                    </div>
                  </div>
                )}
                <dl className="detail-grid grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[16px]">
                {Object.entries(viewingRow).filter(([key]) => !['description', 'createdAt', 'updatedAt'].includes(key) && !key.toLowerCase().includes('avatar')).map(([key, value]) => (
                  <div key={key} className="detail-item grid gap-[4px]">
                    <dt className="text-[#87948b] font-mono text-[10px] font-medium tracking-[0.05em]">{key.replace(/[A-Z]/g, letter => ` ${letter}`).replace(/Id$/, ' ID').toUpperCase()}</dt>
                    <dd className="m-0 text-[#243a33] text-[13px] font-medium">{key.toLowerCase().includes('date') ? formatDate(value) : key.toLowerCase().includes('status') ? renderStatusPill(value) : String(value ?? '—')}</dd>
                  </div>
                ))}
                </dl>
            </div>
            <div className="modal-footer flex justify-end gap-[8px] p-[16px_20px] border-t border-[#edf0eb]">
              <button className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#193c33] rounded-[4px] text-white bg-[#193c33] text-[11px] font-semibold cursor-pointer hover:bg-[#265648] transition-colors" type="button" onClick={() => setViewingRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <section className="workbench-main min-w-0 flex-1">
        <header className="workbench-topbar sticky z-[2] top-0 flex h-[62px] items-center justify-between px-[38px] border-b border-[#e4e9e1] bg-[rgba(255,255,255,0.93)] backdrop-blur-[10px]">
          <div className="topbar-location flex items-center gap-[12px] min-w-0">
            <button className="mobile-sidebar-open-button hidden max-[680px]:grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] rounded-[5px] text-[#546a5d] bg-white cursor-pointer hover:bg-[#f3f6ef]" type="button" aria-label="Open navigation" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <span className="breadcrumb text-[#87948b] text-[11px]">Workspace</span>
            <span className="breadcrumb-divider text-[#c2cbc2] text-[11px]">/</span>
            <strong className="text-[11px] font-semibold">{activeItem?.label}</strong>
          </div>
          <div className="topbar-actions flex items-center gap-[12px]">
            <div className="dash-snowflake-pill inline-flex items-center gap-[6px] px-[10px] py-[3px] rounded-[20px] bg-[#edf6ec] border border-[#d3e7d1] text-[#2b5636] text-[11px] font-semibold" title="Live Snowflake Connection">
              <span className="dash-pulse-dot w-[7px] h-[7px] rounded-full bg-[#10b981] animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
              <span>Snowflake Live</span>
            </div>
            <span className="today-label text-[#87948b] text-[11px]">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <NotificationBell />
            <ThemeToggle className="topbar-theme-toggle" />
            <button
              className="icon-button grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] rounded-[5px] text-[#546a5d] bg-white cursor-pointer hover:bg-[#f3f6ef] transition-colors"
              type="button"
              title="Refresh Workspace"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RefreshCw size={17} className={refreshing ? 'spin-icon animate-spin' : ''} />
            </button>
            <TopProfileDropdown user={user} />
          </div>
        </header>

        <div className={`page-content w-[min(100%,1600px)] mx-auto p-[37px_38px_24px] ${view === 'assistant' ? 'ai-page-content' : view === 'chat' ? 'chat-page-content' : ''}`}>
          {view === 'chat' || view === 'assistant' ? (
            /* Compact Header for Chat & AI Employee */
            <section className="chat-hero-compact flex items-center justify-between gap-[16px] h-[56px] min-h-[56px] max-h-[56px] px-[20px] mb-[10px] rounded-[12px] bg-[linear-gradient(135deg,rgba(25,60,51,0.04)_0%,rgba(217,237,116,0.08)_50%,rgba(25,60,51,0.02)_100%)] bg-white dark:bg-[#17211b] dark:bg-[linear-gradient(135deg,rgba(25,60,51,0.35)_0%,rgba(20,32,26,0.8)_100%)] border border-[#e1e7de] dark:border-[#2b3930] shadow-[0_2px_8px_-2px_rgba(25,60,51,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] box-border shrink-0 flex-none overflow-hidden">
              <div className="chat-hero-compact-content flex items-center gap-[12px] min-w-0 flex-1">
                {view === 'chat' ? (
                  <MessageSquare size={18} className="chat-hero-compact-icon text-[#193c33] dark:text-[#d9ed74] shrink-0" />
                ) : (
                  <Sparkles size={18} className="chat-hero-compact-icon text-[#193c33] dark:text-[#d9ed74] shrink-0" />
                )}
                <h1 className="chat-hero-compact-title m-0 p-0 text-[19px] font-bold font-sans text-[#193c33] dark:text-[#eaf2eb] leading-[1.2] whitespace-nowrap tracking-[-0.01em] flex items-center">{view === 'chat' ? 'Chat' : 'AI Employee'}</h1>
                <span className={`dash-role-badge role-${roleClass} inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-[20px] text-[11px] font-bold tracking-[0.04em] uppercase`}>
                  {role === 'ADMIN' ? <Shield size={12} /> : role === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : role === 'HR' ? <Users size={12} /> : role === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                  {roleLabel}
                </span>
                <span className="chat-hero-compact-sub text-[13px] font-medium text-[#4b6354] dark:text-[#a5b8ab] whitespace-nowrap overflow-hidden text-ellipsis min-w-0 leading-[1.2]">
                  {view === 'chat'
                    ? 'Live messaging with your team'
                    : 'Natural language queries for people operations'}
                </span>
              </div>

              <div className="chat-hero-clock inline-flex items-center gap-[6px] h-[32px] px-[12px] rounded-[7px] bg-[rgba(255,255,255,0.9)] dark:bg-[#1f2b24] border border-[#dfe6db] dark:border-[#35443a] text-[#3b4e42] dark:text-[#c7d6cb] text-[12px]" title="Current Time">
                <Clock3 size={14} className="chat-hero-clock-icon text-[#517154] dark:text-[#8fa892]" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </section>
          ) : (
            /* Executive Hero Banner */
            <section className="dash-hero relative overflow-hidden flex flex-wrap items-center justify-between gap-[20px] p-[26px_30px] mb-[24px] rounded-[14px] bg-[linear-gradient(135deg,rgba(25,60,51,0.04)_0%,rgba(217,237,116,0.08)_50%,rgba(25,60,51,0.02)_100%)] bg-white border border-[#e1e7de] shadow-[0_4px_20px_-2px_rgba(25,60,51,0.04)]">
              <div className="dash-hero-content relative z-[1] flex flex-col gap-[6px]">
                <div className="dash-hero-topline flex items-center flex-wrap gap-[10px]">
                  <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154]">
                    {view === 'overview'
                      ? 'SNOWFLEX PEOPLE PLATFORM'
                      : view === 'users' || view === 'system' || view === 'themes'
                        ? 'ADMINISTRATION PORTAL'
                        : 'PEOPLE OPERATIONS'}
                  </span>
                  <span className={`dash-role-badge role-${roleClass} inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-[20px] text-[11px] font-bold tracking-[0.04em] uppercase`}>
                    {role === 'ADMIN' ? <Shield size={12} /> : role === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : role === 'HR' ? <Users size={12} /> : role === 'MANAGER' ? <Briefcase size={12} /> : <User size={12} />}
                    {roleLabel}
                  </span>
                </div>
                <h1 className="dash-hero-title my-[4px_2px] text-[#193c33] font-sans text-[clamp(22px,2.5vw,30px)] font-extrabold leading-[1.15] tracking-[-0.02em]">
                  {view === 'overview'
                    ? `Good ${greetingTime}, ${user.fullName.split(' ')[0]}`
                    : activeItem?.label}
                </h1>
                <p className="dash-hero-sub m-0 text-[#63756a] text-[13px] max-w-[620px] leading-[1.5]">
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
                        : view === 'themes'
                          ? 'Theme Customization: configure custom workspace color palettes per user or in bulk by role.'
                          : `Centralized registry and workflows for ${activeItem?.label?.toLowerCase() || 'this module'}.`}
                </p>
              </div>

              <div className="dash-hero-actions relative z-[1] flex flex-wrap items-center gap-[10px]">
                {view === 'attendance' && role === 'EMPLOYEE' && (
                  <>
                    <button className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] transition-colors" type="button" onClick={() => void perform('/attendance/check-in', 'POST')}>
                      Check In
                    </button>
                    <button className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#193c33] rounded-[4px] text-white bg-[#193c33] text-[11px] font-semibold cursor-pointer hover:bg-[#265648] transition-colors" type="button" onClick={() => void perform('/attendance/check-out', 'POST')}>
                      Check Out
                    </button>
                  </>
                )}

                {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE')) && (
                  <button
                    className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#193c33] rounded-[4px] text-white bg-[#193c33] text-[11px] font-semibold cursor-pointer hover:bg-[#265648] transition-colors"
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

                <div className="dash-time-chip flex items-center gap-[6px] px-[14px] py-[8px] rounded-[8px] bg-[rgba(255,255,255,0.85)] border border-[#dfe6db] text-[#4a5c51] text-[12px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.03)]" title="Current Time">
                  <Clock3 size={15} color="#517154" />
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </section>
          )}

          {error && <div className="notice error-notice p-[12px_16px] rounded-[8px] bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-[13px] mb-[16px]" role="alert">{error}</div>}
          {notice && <div className="notice success-notice p-[12px_16px] rounded-[8px] bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] text-[13px] mb-[16px]" role="status">{notice}</div>}

          {/* Create / Edit Modal Form */}
          {showCreate && (
            <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-[rgba(25,60,51,0.45)] p-[24px] animate-[fade-in_150ms_ease]" onClick={() => { setShowCreate(false); setEditingRow(null) }} role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
              <div className="modal modal-lg w-[min(100%,560px)] border border-[#e2e8df] rounded-[8px] bg-white shadow-[0_24px_48px_rgba(31,54,39,0.15)] animate-[slide-up_180ms_ease]" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header flex items-center justify-between p-[16px_20px] border-b border-[#edf0eb]">
                  <h3 id="create-modal-title" className="m-0 text-[#243a33] font-bold text-[16px] font-sans">
                    {editingRow ? 'Edit' : 'Add New'} {view === 'employees' ? 'Employee' : view === 'departments' ? 'Department' : view === 'tasks' ? 'Task' : 'Leave Request'}
                  </h3>
                  <button className="modal-close grid w-[32px] h-[32px] place-items-center border-0 rounded-[5px] text-[#7d8980] bg-transparent cursor-pointer hover:bg-[#f3f6ef] hover:text-[#243a33]" type="button" onClick={() => { setShowCreate(false); setEditingRow(null) }} aria-label="Close">
                    <XIcon size={18} />
                  </button>
                </div>
                <form
                  className="create-panel flex flex-wrap gap-[12px] bg-white"
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
                    <div className="avatar-user-cell flex items-center gap-[12px]" style={{ width: '100%', marginBottom: '16px' }}>
                      <UserAvatar name={String(editingRow.fullName || 'User')} avatarUrl={String(editingRow.avatarUrl || '') || null} size={38} className="avatar-circle flex items-center justify-center rounded-full font-sans" />
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
                  <div className="modal-footer flex justify-end gap-[8px] border-t border-[#edf0eb]" style={{ width: '100%', marginTop: '20px', padding: '16px 0 0' }}>
                    <button type="button" className="secondary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#dce5d8] rounded-[4px] text-[#28483b] bg-white text-[11px] font-semibold cursor-pointer hover:bg-[#f0f5e9] transition-colors" onClick={() => { setShowCreate(false); setEditingRow(null) }}>Cancel</button>
                    <button className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#193c33] rounded-[4px] text-white bg-[#193c33] text-[11px] font-semibold cursor-pointer hover:bg-[#265648] disabled:opacity-60 disabled:cursor-wait transition-colors" disabled={saving} type="submit">{saving ? 'Saving to Snowflake…' : editingRow ? 'Update Record' : 'Create Record'}</button>
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
          ) : view === 'themes' ? (
            user && (role === 'ADMIN' || role === 'SUPER_ADMIN') ? (
              <ThemeCustomizationView
                currentUser={user}
                token={token || ''}
                users={adminUsers}
                onRefreshUsers={() => {
                  if (token && user) void loadData(token, user, 'themes')
                }}
              />
            ) : (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Access Restricted</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Only Administrators and Super Administrators have permission to customize workspace themes.
                </p>
              </div>
            )
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
              <div className="kpi-metric-grid grid grid-cols-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[16px] mb-[24px]">
                {metrics.map(({ label, value, detail, icon: Icon, iconClass, trend, trendClass }) => (
                  <article className="kpi-card group relative overflow-hidden p-[20px_22px] rounded-[12px] bg-white border border-[#e2e8df] shadow-[0_3px_12px_-2px_rgba(25,60,51,0.03)] transition-[transform,box-shadow,border-color] duration-180 ease-in-out cursor-default hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-4px_rgba(25,60,51,0.08)] hover:border-[#cbdbca]" key={label}>
                    <div className="kpi-head flex items-start justify-between gap-[12px] mb-[14px]">
                      <span className="kpi-label text-[#64756b] text-[12px] font-semibold uppercase tracking-[0.03em]">{label}</span>
                      <div className={`kpi-icon-box flex items-center justify-center w-[38px] h-[38px] rounded-[10px] shrink-0 transition-transform duration-180 ease-in-out group-hover:scale-108 group-hover:rotate-3 ${iconClass}`}>
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div className="kpi-value-row flex items-baseline gap-[8px] mb-[6px]">
                      <strong className="kpi-value text-[#193c33] font-sans text-[34px] font-extrabold leading-none tracking-[-0.02em]">{value}</strong>
                    </div>
                    <div className="kpi-foot flex items-center justify-between gap-[8px] mt-[12px] pt-[12px] border-t border-[#f0f4ee]">
                      <span className="kpi-detail text-[#7b8c82] text-[11px] font-medium">{detail}</span>
                      <span className={`kpi-trend-pill inline-flex items-center gap-[4px] px-[7px] py-[2px] rounded-[6px] text-[11px] font-bold ${trendClass}`}>
                        {trend}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              {/* Overview Workspace Main Grid */}
              <div className="overview-dashboard-grid grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] max-[1024px]:grid-cols-1 gap-[20px] mb-[24px]">
                {/* Workforce Pulse Widget */}
                <article className="overview-card bg-white border border-[#e2e8df] rounded-[14px] p-[24px] shadow-[0_4px_16px_-2px_rgba(25,60,51,0.03)] flex flex-col">
                  <div className="overview-card-header flex items-start justify-between gap-[16px] mb-[20px]">
                    <div>
                      <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154]">{isEmployee ? 'PERSONAL SNAPSHOT' : 'WORKFORCE METRICS'}</span>
                      <h2 className="my-[4px_0] text-[#193c33] font-sans text-[18px] font-bold">{isEmployee ? 'Your Monthly Overview' : 'Live Attendance Pulse'}</h2>
                      <p className="m-0 text-[#7a8b81] text-[12px]">{isEmployee ? 'Time tracking & leave status for the current billing cycle.' : 'Daily active status of employees synchronized in real time.'}</p>
                    </div>
                    <button className="icon-button grid w-[32px] h-[32px] place-items-center border border-[#e1e8df] rounded-[5px] text-[#546a5d] bg-white cursor-pointer hover:bg-[#f3f6ef] transition-colors" type="button" onClick={() => setView('attendance')} title="View detailed attendance">
                      <ArrowUpRight size={17} />
                    </button>
                  </div>

                  {isEmployee ? (
                    <div className="pulse-rate-box flex items-center justify-between gap-[20px] p-[18px_20px] bg-[linear-gradient(135deg,#f7faf5_0%,#edf3e7_100%)] border border-[#dce8d6] rounded-[12px] mb-[20px]">
                      <div className="pulse-rate-primary flex items-baseline gap-[8px]">
                        <strong className="font-sans text-[36px] font-extrabold text-[#193c33]">{stats.attendanceThisMonth ?? 0}</strong>
                        <span className="text-[18px] text-[#7b8e83] font-semibold">days recorded this month</span>
                      </div>
                      <div className="pulse-rate-badge inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] bg-white border border-[#d7e4d2] text-[#1f4f39] font-bold text-[13px] shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                        <CalendarDays size={16} />
                        <span>{stats.leaveBalance ?? 0} days remaining</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pulse-rate-box flex items-center justify-between gap-[20px] p-[18px_20px] bg-[linear-gradient(135deg,#f7faf5_0%,#edf3e7_100%)] border border-[#dce8d6] rounded-[12px] mb-[20px]">
                        <div className="pulse-rate-primary flex items-baseline gap-[8px]">
                          <strong className="font-sans text-[36px] font-extrabold text-[#193c33]">{attendancePresent}</strong>
                          <span className="text-[18px] text-[#7b8e83] font-semibold">/ {attendanceTotal} Active</span>
                        </div>
                        <div className="pulse-rate-badge inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] bg-white border border-[#d7e4d2] text-[#1f4f39] font-bold text-[13px] shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                          <CheckCircle2 size={16} color="#10b981" />
                          <span>{attendanceRate}% Attendance Rate</span>
                        </div>
                      </div>

                      {/* Segmented multi-color progress track */}
                      <div className="pulse-multi-track flex h-[12px] rounded-[8px] bg-[#eef2ec] overflow-hidden mb-[20px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]" role="img" aria-label={`Attendance progress: ${attendanceRate}%`}>
                        <div className="pulse-track-segment pulse-seg-ontime h-full transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ width: `${onTimePercent}%` }} title={`On time: ${attendanceOnTime}`} />
                        <div className="pulse-track-segment pulse-seg-late h-full transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ width: `${latePercent}%` }} title={`Late: ${attendanceLate}`} />
                        <div className="pulse-track-segment pulse-seg-absent h-full transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ width: `${absentPercent}%` }} title={`Absent: ${attendanceAbsent}`} />
                      </div>

                      <div className="pulse-legend-cards grid grid-cols-3 max-[600px]:grid-cols-1 gap-[12px]">
                        <div className="pulse-mini-card p-[14px_16px] rounded-[10px] border border-[#edf2ea] bg-white flex flex-col gap-[4px] transition-[border-color,transform] duration-160 ease-in-out hover:-translate-y-[2px] hover:border-[#d1ded0]">
                          <div className="pulse-mini-head flex items-center gap-[8px] text-[#68796e] text-[11px] font-semibold">
                            <span className="pulse-indicator-dot dot-ontime w-[8px] h-[8px] rounded-full bg-[#10b981]" />
                            <span>On Time</span>
                          </div>
                          <strong className="font-sans text-[22px] font-extrabold text-[#193c33]">{attendanceOnTime}</strong>
                          <small className="text-[#8c9c92] text-[11px]">{Math.round(onTimePercent)}% on schedule</small>
                        </div>

                        <div className="pulse-mini-card p-[14px_16px] rounded-[10px] border border-[#edf2ea] bg-white flex flex-col gap-[4px] transition-[border-color,transform] duration-160 ease-in-out hover:-translate-y-[2px] hover:border-[#d1ded0]">
                          <div className="pulse-mini-head flex items-center gap-[8px] text-[#68796e] text-[11px] font-semibold">
                            <span className="pulse-indicator-dot dot-late w-[8px] h-[8px] rounded-full bg-[#f59e0b]" />
                            <span>Late Arrival</span>
                          </div>
                          <strong className="font-sans text-[22px] font-extrabold text-[#193c33]">{attendanceLate}</strong>
                          <small className="text-[#8c9c92] text-[11px]">{Math.round(latePercent)}% after 09:00</small>
                        </div>

                        <div className="pulse-mini-card p-[14px_16px] rounded-[10px] border border-[#edf2ea] bg-white flex flex-col gap-[4px] transition-[border-color,transform] duration-160 ease-in-out hover:-translate-y-[2px] hover:border-[#d1ded0]">
                          <div className="pulse-mini-head flex items-center gap-[8px] text-[#68796e] text-[11px] font-semibold">
                            <span className="pulse-indicator-dot dot-absent w-[8px] h-[8px] rounded-full bg-[#f43f5e]" />
                            <span>Absent / Leave</span>
                          </div>
                          <strong className="font-sans text-[22px] font-extrabold text-[#193c33]">{attendanceAbsent}</strong>
                          <small className="text-[#8c9c92] text-[11px]">{Math.round(absentPercent)}% out today</small>
                        </div>
                      </div>
                    </>
                  )}
                </article>

                {/* Priority Needs Attention Card */}
                <article className="overview-card bg-white border border-[#e2e8df] rounded-[14px] p-[24px] shadow-[0_4px_16px_-2px_rgba(25,60,51,0.03)] flex flex-col">
                  <div className="overview-card-header flex items-start justify-between gap-[16px] mb-[20px]">
                    <div>
                      <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154]">ACTION REQUIRED</span>
                      <h2 className="my-[4px_0] text-[#193c33] font-sans text-[18px] font-bold">Needs Attention</h2>
                      <p className="m-0 text-[#7a8b81] text-[12px]">Outstanding operational petitions awaiting decision.</p>
                    </div>
                    <Activity size={18} color="#10b981" />
                  </div>

                  <div className="priority-list flex flex-col gap-[10px] mt-[4px]">
                    {actionItems.map(({ label, count, view: targetView, icon: Icon }) => (
                      <button
                        className="priority-item-btn flex items-center justify-between gap-[14px] p-[14px_16px] rounded-[10px] bg-[#fbfdfa] border border-[#e7ede4] text-[#2e4337] cursor-pointer transition-all duration-180 ease-in-out text-left hover:-translate-y-[2px] hover:border-[#c8dac6] hover:bg-[#f4f8f1] hover:shadow-[0_4px_14px_-2px_rgba(25,60,51,0.05)]"
                        key={label}
                        type="button"
                        onClick={() => setView(targetView)}
                      >
                        <div className="priority-item-left flex items-center gap-[12px]">
                          <div className="priority-item-icon flex items-center justify-center w-[36px] h-[36px] rounded-[8px] bg-[#edf5eb] text-[#2f6542] shrink-0">
                            <Icon size={18} />
                          </div>
                          <div className="priority-item-info">
                            <strong className="block text-[13px] font-bold text-[#1c3529]">{label}</strong>
                            <small className="block text-[11px] text-[#798c81]">{count > 0 ? 'Requires immediate action' : 'All caught up'}</small>
                          </div>
                        </div>
                        <div className="priority-item-right flex items-center gap-[10px]">
                          <span className={`priority-count-pill px-[10px] py-[4px] rounded-[20px] bg-[#193c33] text-[#d9ed74] font-mono text-[12px] font-bold ${count === 0 ? 'priority-count-zero bg-[#eaf1e8] text-[#6c7f73]' : ''}`}>
                            {count}
                          </span>
                          <ArrowUpRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {recentLeaves.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf1eb' }}>
                      <span className="dash-kicker font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#517154]" style={{ fontSize: '10px' }}>RECENT TIME-OFF ACTIVITY</span>
                      <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                        {recentLeaves.slice(0, 2).map((item) => (
                          <div key={String(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <UserAvatar name={String(item.fullName || 'User')} avatarUrl={String(item.avatarUrl || '') || null} size={26} className="avatar-circle flex items-center justify-center rounded-full font-sans" />
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
              <div className="overview-holidays-banner-wrap mb-[24px]">
                <UpcomingHolidaysWidget onNavigate={() => setView('holidays')} />
              </div>

              {/* Quick Launch Shortcuts Hub */}
              <section className="quick-launch-section mb-[24px]">
                <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154]">WORKPLACE TOOLS</span>
                <div className="quick-launch-grid grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[14px] mt-[14px]">
                  {shortcuts.map(({ label, desc, view: targetView, icon: Icon }) => (
                    <button
                      className="quick-launch-card group flex items-center gap-[14px] p-[16px_18px] rounded-[12px] bg-white border border-[#e2e8df] cursor-pointer transition-all duration-180 ease-in-out text-left hover:-translate-y-[2px] hover:border-[#b7cb9d] hover:shadow-[0_8px_18px_-4px_rgba(25,60,51,0.07)]"
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
                      <div className="quick-launch-icon flex items-center justify-center w-[42px] h-[42px] rounded-[10px] bg-[#f0f6ec] text-[#193c33] shrink-0 transition-[background,color] duration-180 ease-in-out group-hover:bg-[#193c33] group-hover:text-[#d9ed74]">
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <div className="quick-launch-text">
                        <strong className="block text-[13px] font-bold text-[#193c33]">{label}</strong>
                        <small className="block text-[11px] text-[#798b80] mt-[2px]">{desc}</small>
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
                <div className="employee-kpi-bar grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[16px] mb-[20px]">
                  <div className="employee-kpi-card active-card flex items-center gap-[16px] p-[16px_20px] rounded-[12px] border border-[#e2e8df] border-l-[4px] border-l-[#10b981] bg-white shadow-[0_2px_8px_rgba(25,60,51,0.04)] transition-[transform,box-shadow] duration-160 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(25,60,51,0.08)]">
                    <div className="emp-kpi-icon-box kpi-icon-emerald flex items-center justify-center w-[44px] h-[44px] rounded-[10px] shrink-0">
                      <UserCheck size={20} strokeWidth={2.2} />
                    </div>
                    <div className="emp-kpi-info flex flex-col">
                      <span className="emp-kpi-label text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#657b6f] mb-[2px]">Active Employees</span>
                      <strong className="emp-kpi-val text-[24px] font-extrabold text-[#193c33] leading-[1.1] font-sans">{employeeStats.activeCount}</strong>
                      <span className="emp-kpi-sub text-[11.5px] text-[#8a9c90] mt-[3px]">Currently working</span>
                    </div>
                  </div>

                  <div className="employee-kpi-card terminated-card flex items-center gap-[16px] p-[16px_20px] rounded-[12px] border border-[#e2e8df] border-l-[4px] border-l-[#ef4444] bg-white shadow-[0_2px_8px_rgba(25,60,51,0.04)] transition-[transform,box-shadow] duration-160 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(25,60,51,0.08)]">
                    <div className="emp-kpi-icon-box kpi-icon-rose flex items-center justify-center w-[44px] h-[44px] rounded-[10px] shrink-0">
                      <UserX size={20} strokeWidth={2.2} />
                    </div>
                    <div className="emp-kpi-info flex flex-col">
                      <span className="emp-kpi-label text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#657b6f] mb-[2px]">Terminated</span>
                      <strong className="emp-kpi-val text-[24px] font-extrabold text-[#193c33] leading-[1.1] font-sans">{employeeStats.terminatedCount}</strong>
                      <span className="emp-kpi-sub text-[11.5px] text-[#8a9c90] mt-[3px]">Deactivated accounts</span>
                    </div>
                  </div>

                  <div className="employee-kpi-card roles-card flex items-center gap-[16px] p-[16px_20px] rounded-[12px] border border-[#e2e8df] border-l-[4px] border-l-[#6366f1] bg-white shadow-[0_2px_8px_rgba(25,60,51,0.04)] transition-[transform,box-shadow] duration-160 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(25,60,51,0.08)]">
                    <div className="emp-kpi-info flex flex-col" style={{ width: '100%' }}>
                      <span className="emp-kpi-label text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#657b6f] mb-[2px]">Active Staff by Role</span>
                      <div className="emp-role-pills flex flex-wrap gap-[6px] mt-[6px]">
                        <span className="role-chip inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] bg-[#f1f5f1] dark:bg-[#1e2c24] border border-[#dbe2d8] dark:border-[#2e3d35] text-[10.5px]" title="Super Administrators">
                          <small className="text-[#62766b] font-bold text-[9.5px]">SUPER ADMIN</small>
                          <strong className="text-[#193c33] font-extrabold">{employeeStats.byRole?.SUPER_ADMIN ?? 0}</strong>
                        </span>
                        <span className="role-chip inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] bg-[#f1f5f1] dark:bg-[#1e2c24] border border-[#dbe2d8] dark:border-[#2e3d35] text-[10.5px]" title="Administrators">
                          <small className="text-[#62766b] font-bold text-[9.5px]">ADMIN</small>
                          <strong className="text-[#193c33] font-extrabold">{employeeStats.byRole?.ADMIN ?? 0}</strong>
                        </span>
                        <span className="role-chip inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] bg-[#f1f5f1] dark:bg-[#1e2c24] border border-[#dbe2d8] dark:border-[#2e3d35] text-[10.5px]" title="HR Personnel">
                          <small className="text-[#62766b] font-bold text-[9.5px]">HR</small>
                          <strong className="text-[#193c33] font-extrabold">{employeeStats.byRole?.HR ?? 0}</strong>
                        </span>
                        <span className="role-chip inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] bg-[#f1f5f1] dark:bg-[#1e2c24] border border-[#dbe2d8] dark:border-[#2e3d35] text-[10.5px]" title="Managers">
                          <small className="text-[#62766b] font-bold text-[9.5px]">MANAGER</small>
                          <strong className="text-[#193c33] font-extrabold">{employeeStats.byRole?.MANAGER ?? 0}</strong>
                        </span>
                        <span className="role-chip inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] bg-[#f1f5f1] dark:bg-[#1e2c24] border border-[#dbe2d8] dark:border-[#2e3d35] text-[10.5px]" title="Employees">
                          <small className="text-[#62766b] font-bold text-[9.5px]">EMPLOYEE</small>
                          <strong className="text-[#193c33] font-extrabold">{employeeStats.byRole?.EMPLOYEE ?? 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SaaS Modern Data Table / Cards Grid */}
              <section className="saas-table-card bg-white border border-[#e1e7de] rounded-[14px] overflow-hidden shadow-[0_4px_18px_-2px_rgba(25,60,51,0.03)]">
                <div className="saas-table-top flex flex-wrap items-center justify-between gap-[16px] p-[18px_24px] border-b border-[#edf1eb] bg-[#fafbf9]">
                  <div className="saas-table-title-area flex flex-col">
                    <span className="dash-kicker font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#517154]">LIVE FROM SNOWFLAKE</span>
                    <h2 className="my-[3px_0] text-[#193c33] font-sans text-[18px] font-bold">{activeItem?.label} Directory</h2>
                  </div>

                <div className="saas-table-actions flex flex-wrap items-center gap-[10px]">
                  {/* Search Bar */}
                  <div className="saas-search-box relative flex items-center">
                    <Search size={16} className="pointer-events-none text-[#7b8d82] absolute left-[12px]" />
                    <input
                      className="h-[38px] w-[260px] pl-[38px] pr-[34px] rounded-[8px] border border-[#dbe2d8] bg-white text-[#193c33] text-[13px] outline-none transition-all duration-160 ease-in-out focus:border-[#193c33] focus:shadow-[0_0_0_3px_rgba(25,60,51,0.08)]"
                      placeholder={`Search ${activeItem?.label.toLowerCase()}…`}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    />
                    {searchQuery && (
                      <button className="saas-search-clear absolute right-[10px] border-0 bg-transparent text-[#8c9b91] cursor-pointer flex items-center p-[2px] hover:text-[#193c33]" type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
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
                    <div className="employee-filter-tabs inline-flex items-center bg-[#edf3eb] p-[3px] rounded-[9px] gap-[3px]">
                      <button
                        type="button"
                        className={`filter-tab-btn inline-flex items-center gap-[6px] px-[14px] py-[6px] border-none rounded-[7px] bg-transparent text-[#556b5e] text-[12px] font-bold cursor-pointer transition-all duration-140 ease-in-out hover:text-[#193c33] ${employeeStatusTab === 'ACTIVE' ? 'active bg-white text-[#193c33]' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('ACTIVE')}
                      >
                        Active
                        {employeeStats && <span className="tab-badge inline-flex items-center justify-center px-[6px] py-[1px] rounded-[10px] text-[10.5px] font-extrabold bg-[#e2e8df] text-[#3b5044]">{employeeStats.activeCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`filter-tab-btn inline-flex items-center gap-[6px] px-[14px] py-[6px] border-none rounded-[7px] bg-transparent text-[#556b5e] text-[12px] font-bold cursor-pointer transition-all duration-140 ease-in-out hover:text-[#193c33] ${employeeStatusTab === 'TERMINATED' ? 'active bg-white text-[#193c33]' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('TERMINATED')}
                      >
                        Terminated
                        {employeeStats && <span className="tab-badge badge-danger inline-flex items-center justify-center px-[6px] py-[1px] rounded-[10px] text-[10.5px] font-extrabold bg-[#fee2e2] text-[#dc2626]">{employeeStats.terminatedCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`filter-tab-btn inline-flex items-center gap-[6px] px-[14px] py-[6px] border-none rounded-[7px] bg-transparent text-[#556b5e] text-[12px] font-bold cursor-pointer transition-all duration-140 ease-in-out hover:text-[#193c33] ${employeeStatusTab === 'ALL' ? 'active bg-white text-[#193c33]' : ''}`}
                        onClick={() => handleEmployeeStatusTabChange('ALL')}
                      >
                        All
                        {employeeStats && (
                          <span className="tab-badge badge-neutral inline-flex items-center justify-center px-[6px] py-[1px] rounded-[10px] text-[10.5px] font-extrabold bg-[#e5e7eb] text-[#4b5563]">
                            {(employeeStats.activeCount ?? 0) + (employeeStats.terminatedCount ?? 0)}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* View Mode Toggle (Table vs Cards) for Employees & Departments */}
                  {isManagementView && (
                    <div className="view-mode-toggle flex p-[3px] rounded-[8px] bg-[#edf2eb] border border-[#dfe5dc] gap-[2px]" title="Switch layout mode">
                      <button
                        className={`view-mode-btn flex items-center justify-center w-[32px] h-[32px] rounded-[6px] border-0 bg-transparent text-[#63756a] cursor-pointer transition-all duration-140 ease-in-out hover:text-[#193c33] ${viewMode === 'table' ? 'active bg-white text-[#193c33] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : ''}`}
                        type="button"
                        onClick={() => setViewMode('table')}
                        aria-label="Table view"
                      >
                        <List size={16} />
                      </button>
                      <button
                        className={`view-mode-btn flex items-center justify-center w-[32px] h-[32px] rounded-[6px] border-0 bg-transparent text-[#63756a] cursor-pointer transition-all duration-140 ease-in-out hover:text-[#193c33] ${viewMode === 'cards' ? 'active bg-white text-[#193c33] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : ''}`}
                        type="button"
                        onClick={() => setViewMode('cards')}
                        aria-label="Grid cards view"
                      >
                        <LayoutGrid size={16} />
                      </button>
                    </div>
                  )}

                  <span className="saas-record-counter px-[10px] py-[5px] rounded-[6px] bg-[#edf4eb] text-[#2f563d] font-mono text-[11px] font-semibold">{filteredRows.length} records</span>
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
                <div className="saas-empty-box flex flex-col items-center justify-center p-[48px_24px] text-center">
                  <div className="empty-icon-wrap grid w-[60px] h-[60px] place-items-center rounded-full bg-[#f1f5ee] text-[#193c33] mb-[16px]">
                    {view === 'employees' ? <Users size={30} /> : view === 'departments' ? <Building2 size={30} /> : view === 'tasks' ? <CheckSquare2 size={30} /> : <CalendarDays size={30} />}
                  </div>
                  <h3 className="m-[0_0_6px] font-sans text-[18px] font-bold text-[#193c33]">No {activeItem?.label.toLowerCase()} found</h3>
                  <p className="m-0 text-[13px] text-[#798b80] max-w-[420px]">
                    {searchQuery
                      ? `No results match "${searchQuery}". Try adjusting your search or filters.`
                      : `Get started by creating your first ${activeItem?.label.toLowerCase()} record in Snowflake.`}
                  </p>
                  {((view === 'employees' && canManage) || (view === 'departments' && canManage) || (view === 'tasks' && role !== 'EMPLOYEE')) && (
                    <button
                      className="primary-action inline-flex min-h-[36px] items-center justify-center gap-[7px] px-[12px] border border-[#193c33] rounded-[4px] text-white bg-[#193c33] text-[11px] font-semibold cursor-pointer hover:bg-[#265648] transition-colors"
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
                  <div className="saas-cards-grid grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4 p-6">
                    {paginatedRows.map((row) => (
                      view === 'employees' ? (
                        <article className="emp-profile-card flex flex-col gap-[14px] p-5 rounded-xl border border-[#e3e9e0] bg-white shadow-[0_2px_8px_-2px_rgba(25,60,51,0.03)] transition-all duration-[180ms] ease hover:-translate-y-[3px] hover:border-[#c4d7bf] hover:shadow-[0_10px_22px_-4px_rgba(25,60,51,0.08)] dark:bg-[#1c2720] dark:border-[#2c3a30] dark:hover:border-[#405445]" key={String(row.id)}>
                          <div className="emp-card-top flex items-start justify-between gap-3">
                            <div className="emp-card-identity flex items-center gap-3">
                              <UserAvatar name={String(row.fullName || 'User')} avatarUrl={String(row.avatarUrl || '') || null} size={38} className="avatar-circle flex items-center justify-center w-[34px] h-[34px] rounded-full font-sans text-[12px] font-bold shrink-0 uppercase text-white" />
                              <div className="emp-card-name">
                                <strong className="block text-[14px] font-bold text-[#193c33] dark:text-[#eaf2ec]">{String(row.fullName || 'Unnamed')}</strong>
                                <small className="block text-[12px] text-[#798b80]">{String(row.email || 'No email')}</small>
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

                          <div className="emp-card-meta-list grid gap-2 p-[12px_14px] rounded-lg bg-[#f7f9f6] border border-[#ebf0e8] text-[12px] dark:bg-[#17211b] dark:border-[#243329]">
                            <div className="emp-meta-row flex justify-between gap-[10px]">
                              <span className="text-[#7b8d82]">Code</span>
                              <strong className="text-[#233e31] font-semibold font-mono text-[11px] dark:text-[#d6e2d9]">{String(row.employeeCode || '—')}</strong>
                            </div>
                            <div className="emp-meta-row flex justify-between gap-[10px]">
                              <span className="text-[#7b8d82]">Department</span>
                              <strong className="text-[#233e31] font-semibold font-mono text-[11px] dark:text-[#d6e2d9]">{String(row.departmentName || row.departmentId || 'Unassigned')}</strong>
                            </div>
                            <div className="emp-meta-row flex justify-between gap-[10px]">
                              <span className="text-[#7b8d82]">Designation</span>
                              <strong className="text-[#233e31] font-semibold font-mono text-[11px] dark:text-[#d6e2d9]">{String(row.designation || '—')}</strong>
                            </div>
                            {isAdminWorkspace && (
                              <div className="emp-meta-row flex justify-between gap-[10px]">
                                <span className="text-[#7b8d82]">Leave Status</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                  {row.onLeaveToday ? (
                                    <span className="on-leave-today-tag inline-flex items-center gap-[5px] px-2 py-[3px] rounded-[5px] text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] whitespace-nowrap dark:bg-[#3a220a] dark:text-[#fde68a] dark:border-[#63390c]">
                                      🌴 On Leave ({String(row.todayLeaveName || 'Approved')})
                                    </span>
                                  ) : null}
                                  {Number(row.pendingLeaveCount) > 0 ? (
                                    <div className="emp-leave-status-cell inline-flex items-center gap-1.5 flex-wrap">
                                      <LeaveTypeBadge
                                        name={String(row.firstPendingName || 'Pending Leave')}
                                        code={String(row.firstPendingCode || 'OTHER')}
                                        isPaid={Boolean(row.firstPendingIsPaid)}
                                        status="Pending"
                                      />
                                      {Number(row.pendingLeaveCount) > 1 && (
                                        <span className="more-leaves-chip inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-[10px] text-[10px] font-bold bg-[#e2e8f0] text-[#334155] cursor-help transition-colors duration-150 hover:bg-[#cbd5e1] dark:bg-[#334155] dark:text-[#cbd5e1] dark:hover:bg-[#475569]" title={`All pending requests: ${String(row.pendingTypeNames || '')}`}>
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

                          <div className="emp-card-footer mt-auto flex items-center justify-between gap-[10px] pt-3 border-t border-[#f0f4ee]">
                            <span style={{ fontSize: '11px', color: '#798c80' }}>
                              Created {formatDate(row.createdAt)}
                            </span>
                            <div className="table-action-btns flex items-center justify-end gap-1.5">
                              <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleView(row)} title="View profile"><Eye size={15} /></button>
                              {canManage && <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleEdit(row)} title="Edit profile"><Edit size={15} /></button>}
                              {view === 'employees' && canTerminateRow(row) && (
                                <button
                                  className="action-chip-btn action-terminate inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]"
                                  type="button"
                                  onClick={() => handleOpenTerminate(row)}
                                  title="Terminate employee"
                                >
                                  <UserX size={15} />
                                </button>
                              )}
                              {view === 'employees' && canReactivateRow(row) && (
                                <button
                                  className="action-chip-btn action-reactivate inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]"
                                  type="button"
                                  onClick={() => handleOpenReactivate(row)}
                                  title="Reactivate employee"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              )}
                              {canManage && <button className="action-chip-btn action-delete inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3]" type="button" onClick={() => void handleDelete(row)} title="Delete"><Trash2 size={15} /></button>}
                            </div>
                          </div>
                        </article>
                      ) : (
                        <article className="dept-card flex flex-col gap-[14px] p-[22px] rounded-xl border border-[#e3e9e0] bg-white transition-all duration-[180ms] ease hover:-translate-y-[3px] hover:border-[#c4d7bf] hover:shadow-[0_10px_22px_-4px_rgba(25,60,51,0.08)] dark:bg-[#1c2720] dark:border-[#2c3a30] dark:hover:border-[#405445]" key={String(row.id)}>
                          <div className="dept-card-header flex items-center gap-[14px]">
                            <div className="dept-card-icon flex items-center justify-center w-[44px] h-[44px] rounded-[10px] bg-[#ecf4e9] text-[#193c33] shrink-0 dark:bg-[#24332a] dark:text-[#d9ed74]">
                              <Building2 size={24} />
                            </div>
                            <div className="dept-card-info">
                              <h3 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#eaf2ec]">{String(row.name || 'Unnamed')}</h3>
                              <span className="text-[12px] text-[#798b80]">ID #{String(row.id)}</span>
                            </div>
                          </div>
                          <div className="emp-card-footer mt-auto flex items-center justify-between gap-[10px]" style={{ border: 'none', padding: 0 }}>
                            <span style={{ fontSize: '12px', color: '#798c80' }}>
                              Updated {formatDate(row.updatedAt || row.createdAt)}
                            </span>
                            <div className="table-action-btns flex items-center justify-end gap-1.5">
                              <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleView(row)} title="View details"><Eye size={15} /></button>
                              {canManage && <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleEdit(row)} title="Edit department"><Edit size={15} /></button>}
                              {canManage && <button className="action-chip-btn action-delete inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3]" type="button" onClick={() => void handleDelete(row)} title="Delete department"><Trash2 size={15} /></button>}
                            </div>
                          </div>
                        </article>
                      )
                    ))}
                  </div>

                  {/* Pagination Bar */}
                  <div className="saas-pagination-bar flex flex-wrap items-center justify-between gap-[14px] p-[14px_24px] border-t border-[#edf1eb] bg-[#fafbf9] text-[12px] text-[#64756b] dark:bg-[#161f1a] dark:border-[#26332a] dark:text-[#8fa195]">
                    <span>
                      Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
                    </span>
                    <div className="pagination-controls flex items-center gap-2">
                      <button
                        className="pagination-btn flex items-center justify-center w-8 h-8 rounded-md border border-[#dce3d8] bg-white text-[#3b5043] cursor-pointer transition-all duration-[140ms] ease enabled:hover:bg-[#f0f5eb] enabled:hover:border-[#b7c7b4] enabled:hover:text-[#193c33] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#1f2c24] dark:border-[#314236] dark:text-[#c7d6cb]"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span>Page {currentPage} of {Math.ceil(filteredRows.length / pageSize) || 1}</span>
                      <button
                        className="pagination-btn flex items-center justify-center w-8 h-8 rounded-md border border-[#dce3d8] bg-white text-[#3b5043] cursor-pointer transition-all duration-[140ms] ease enabled:hover:bg-[#f0f5eb] enabled:hover:border-[#b7c7b4] enabled:hover:text-[#193c33] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#1f2c24] dark:border-[#314236] dark:text-[#c7d6cb]"
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
                  <div className="saas-table-container w-full overflow-x-auto">
                    <table className="saas-grid-table w-full border-collapse text-left text-[13px] [&_th]:p-[13px_20px] [&_th]:bg-[#f7f9f6] [&_th]:text-[#5d7064] [&_th]:font-mono [&_th]:text-[11px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.04em] [&_th]:border-b [&_th]:border-[#e7ede4] [&_th]:whitespace-nowrap dark:[&_th]:bg-[#17211b] dark:[&_th]:text-[#92a698] dark:[&_th]:border-[#27342b] [&_td]:p-[14px_20px] [&_td]:border-b [&_td]:border-[#eef2ec] [&_td]:text-[#2b4237] [&_td]:align-middle dark:[&_td]:border-[#232f26] dark:[&_td]:text-[#cfded3] [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-[120ms] hover:[&_tbody_tr]:bg-[#f8faf6] dark:hover:[&_tbody_tr]:bg-[#1f2c23]">
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
                                <div className="avatar-user-cell flex items-center gap-3">
                                  <UserAvatar name={String(row.fullName || 'User')} avatarUrl={String(row.avatarUrl || '') || null} size={28} className="avatar-circle flex items-center justify-center w-[34px] h-[34px] rounded-full font-sans text-[12px] font-bold shrink-0 uppercase text-white" />
                                  <div className="avatar-info-copy">
                                    <strong className="block text-[13px] font-bold text-[#193c33] dark:text-[#eaf2ec]">{String(row.fullName || '—')}</strong>
                                    {row.email ? <small className="block text-[11px] text-[#798b80] dark:text-[#8fa195]">{String(row.email)}</small> : null}
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
                                      <span className="on-leave-today-tag inline-flex items-center gap-[5px] px-2 py-[3px] rounded-[5px] text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] whitespace-nowrap dark:bg-[#3a220a] dark:text-[#fde68a] dark:border-[#63390c]" title="Employee has an approved leave covering today">
                                        🌴 On Leave Today ({String(row.todayLeaveName || 'Approved')})
                                      </span>
                                    ) : null}
                                    {Number(row.pendingLeaveCount) > 0 ? (
                                      <div className="emp-leave-status-cell inline-flex items-center gap-1.5 flex-wrap">
                                        <LeaveTypeBadge
                                          name={String(row.firstPendingName || 'Pending Leave')}
                                          code={String(row.firstPendingCode || 'OTHER')}
                                          isPaid={Boolean(row.firstPendingIsPaid)}
                                          status="Pending"
                                        />
                                        {Number(row.pendingLeaveCount) > 1 && (
                                          <span
                                            className="more-leaves-chip inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-[10px] text-[10px] font-bold bg-[#e2e8f0] text-[#334155] cursor-help transition-colors duration-150 hover:bg-[#cbd5e1] dark:bg-[#334155] dark:text-[#cbd5e1] dark:hover:bg-[#475569]"
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
                                  <div className="table-action-btns flex items-center justify-end gap-1.5">
                                    <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleView(row)} title="View profile"><Eye size={15} /></button>
                                    {canManage && <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleEdit(row)} title="Edit profile"><Edit size={15} /></button>}
                                    {view === 'employees' && canTerminateRow(row) && (
                                      <button
                                        className="action-chip-btn action-terminate inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]"
                                        type="button"
                                        onClick={() => handleOpenTerminate(row)}
                                        title="Terminate employee"
                                      >
                                        <UserX size={15} />
                                      </button>
                                    )}
                                    {view === 'employees' && canReactivateRow(row) && (
                                      <button
                                        className="action-chip-btn action-reactivate inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]"
                                        type="button"
                                        onClick={() => handleOpenReactivate(row)}
                                        title="Reactivate employee"
                                      >
                                        <RotateCcw size={15} />
                                      </button>
                                    )}
                                    {canManage && <button className="action-chip-btn action-delete inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3]" type="button" onClick={() => void handleDelete(row)} title="Delete record"><Trash2 size={15} /></button>}
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
                                    <div className="avatar-user-cell flex items-center gap-3">
                                      <UserAvatar
                                        name={String(value || 'User')}
                                        avatarUrl={String(key.toLowerCase() === 'assignedtoname' ? row.assignedToAvatarUrl || '' : key.toLowerCase() === 'assignedbyname' ? row.assignedByAvatarUrl || '' : row.avatarUrl || '') || null}
                                        size={28}
                                        className="avatar-circle flex items-center justify-center w-[34px] h-[34px] rounded-full font-sans text-[12px] font-bold shrink-0 uppercase text-white"
                                      />
                                      <div className="avatar-info-copy">
                                        <strong className="block text-[13px] font-bold text-[#193c33] dark:text-[#eaf2ec]">{String(value || '—')}</strong>
                                        {key.toLowerCase() === 'fullname' && row.email ? <small className="block text-[11px] text-[#798b80] dark:text-[#8fa195]">{String(row.email)}</small> : null}
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
                                  <div className="table-action-btns flex items-center justify-end gap-1.5">
                                    <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleView(row)} title="View details"><Eye size={15} /></button>
                                    {canManage && <button className="action-chip-btn inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#f2f6ee] hover:text-[#193c33] hover:border-[#cbd8c8] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3] dark:hover:bg-[#2b3b30] dark:hover:text-[#f1f7f2]" type="button" onClick={() => handleEdit(row)} title="Edit record"><Edit size={15} /></button>}
                                    {canManage && <button className="action-chip-btn action-delete inline-flex items-center justify-center w-8 h-8 rounded-[7px] border border-[#e1e7de] bg-white text-[#55695d] cursor-pointer transition-all duration-[140ms] ease hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] dark:bg-[#202c24] dark:border-[#314236] dark:text-[#bed0c3]" type="button" onClick={() => void handleDelete(row)} title="Delete record"><Trash2 size={15} /></button>}
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
                  <div className="saas-pagination-bar flex flex-wrap items-center justify-between gap-[14px] p-[14px_24px] border-t border-[#edf1eb] bg-[#fafbf9] text-[12px] text-[#64756b] dark:bg-[#161f1a] dark:border-[#26332a] dark:text-[#8fa195]">
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

                    <div className="pagination-controls flex items-center gap-2">
                      <button
                        className="pagination-btn flex items-center justify-center w-8 h-8 rounded-md border border-[#dce3d8] bg-white text-[#3b5043] cursor-pointer transition-all duration-[140ms] ease enabled:hover:bg-[#f0f5eb] enabled:hover:border-[#b7c7b4] enabled:hover:text-[#193c33] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#1f2c24] dark:border-[#314236] dark:text-[#c7d6cb]"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span>Page {currentPage} of {Math.ceil(filteredRows.length / pageSize) || 1}</span>
                      <button
                        className="pagination-btn flex items-center justify-center w-8 h-8 rounded-md border border-[#dce3d8] bg-white text-[#3b5043] cursor-pointer transition-all duration-[140ms] ease enabled:hover:bg-[#f0f5eb] enabled:hover:border-[#b7c7b4] enabled:hover:text-[#193c33] disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#1f2c24] dark:border-[#314236] dark:text-[#c7d6cb]"
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

          <footer className="content-foot flex justify-between mt-[26px] text-[#9aa49c] font-mono text-[9px] max-[760px]:gap-[10px] max-[760px]:text-[8px] dark:text-[#88978d]">
            <span>Snowflex People Operations Platform • Enterprise Data Warehouse Edition</span>
            <span>Connected to Snowflake <span className="connection-dot inline-block w-1.5 h-1.5 ml-1 rounded-full bg-[#7da457]" /></span>
          </footer>
        </div>
      </section>

      {/* Floating AI Chat Widget */}
      {token && <AiChatWidget token={token} userName={user?.fullName || 'User'} avatarUrl={user?.avatarUrl} />}
    </main>
  )
}