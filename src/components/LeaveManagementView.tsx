import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  CalendarDays, Plus, Filter, Search, RefreshCw, Settings,
  CheckCircle2, XCircle, Clock, FileText, Check, X, ArrowUpDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  fetchLeaveTypes, fetchMyLeaveBalances, fetchMyLeaves,
  fetchAllLeaves, approveLeave, rejectLeave, cancelLeave,
  type LeaveType, type LeaveBalance, type LeaveRecord
} from '../lib/leave-api'
import { useNotifications } from '../hooks/useNotifications'
import LeaveTypeBadge from './LeaveTypeBadge'
import LeaveBalanceSummary from './LeaveBalanceSummary'
import ApplyLeaveModal from './ApplyLeaveModal'
import LeaveTypesAdminModal from './LeaveTypesAdminModal'
import UserAvatar from './UserAvatar'
import { SkeletonTable } from './Skeleton'

interface LeaveManagementViewProps {
  userRole?: string
  currentUserId?: number
  token?: string
}

type LeaveLoadErrorKey = 'types' | 'balances' | 'my' | 'team' | 'admin'
type RequestResult<T> = { data: T } | { error: string }

async function captureRequest<T>(request: Promise<T>): Promise<RequestResult<T>> {
  try {
    return { data: await request }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The request failed.' }
  }
}

export default function LeaveManagementView({
  userRole = 'EMPLOYEE',
  currentUserId = 0,
}: LeaveManagementViewProps) {
  const normalizedRole = userRole.trim().toUpperCase().replace(/[\s-]+/g, '_')
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'
  const isAdminOrHr = normalizedRole === 'ADMIN' || isSuperAdmin || normalizedRole === 'HR'
  const canReview = normalizedRole === 'ADMIN' || isSuperAdmin

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [myLeaves, setMyLeaves] = useState<LeaveRecord[]>([])
  const [teamLeaves, setTeamLeaves] = useState<LeaveRecord[]>([])
  const [adminLeaves, setAdminLeaves] = useState<LeaveRecord[]>([])
  const [activeTab, setActiveTab] = useState<'my' | 'team' | 'admin'>('my')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadErrors, setLoadErrors] = useState<Partial<Record<LeaveLoadErrorKey, string>>>({})

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Sorting
  const [sortKey, setSortKey] = useState<'leaveType' | 'employee' | 'dates' | 'status' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: 'leaveType' | 'employee' | 'dates' | 'status') => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedInitialTypeId, setSelectedInitialTypeId] = useState<number | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Rejection modal & single-flight decision state
  const isSubmittingRef = useRef(false)
  const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)
  const [activeDecisionId, setActiveDecisionId] = useState<number | null>(null)

  const { refresh: refreshNotifications } = useNotifications()

  const leaves = useMemo(() => activeTab === 'my'
    ? myLeaves
    : activeTab === 'admin'
      ? adminLeaves
      : teamLeaves, [activeTab, myLeaves, teamLeaves, adminLeaves])

  const loadAllData = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const [typesResult, balancesResult, myResult, teamResult, adminResult] = await Promise.all([
        captureRequest(fetchLeaveTypes(!isAdminOrHr)),
        captureRequest(fetchMyLeaveBalances()),
        captureRequest(fetchMyLeaves()),
        canReview ? captureRequest(fetchAllLeaves('team')) : Promise.resolve({ data: [] as LeaveRecord[] }),
        isSuperAdmin ? captureRequest(fetchAllLeaves('admin')) : Promise.resolve({ data: [] as LeaveRecord[] }),
      ])

      const errors: Partial<Record<LeaveLoadErrorKey, string>> = {}
      if ('data' in typesResult) setLeaveTypes(typesResult.data)
      else errors.types = typesResult.error
      if ('data' in balancesResult) setBalances(balancesResult.data)
      else errors.balances = balancesResult.error
      if ('data' in myResult) setMyLeaves(myResult.data)
      else errors.my = myResult.error
      if ('data' in teamResult) setTeamLeaves(teamResult.data)
      else errors.team = teamResult.error
      if ('data' in adminResult) setAdminLeaves(adminResult.data)
      else errors.admin = adminResult.error
      setLoadErrors(errors)
      return Object.keys(errors).length === 0
    } finally {
      setLoading(false)
    }
  }, [isAdminOrHr, canReview, isSuperAdmin])

  const refreshEverything = useCallback(async () => {
    await loadAllData()
    window.dispatchEvent(new CustomEvent('leaves-updated'))
    try {
      await refreshNotifications()
    } catch {
      // non-blocking
    }
  }, [loadAllData, refreshNotifications])

  useEffect(() => {
    void loadAllData()
    let refreshing = false
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible' || refreshing) return
      refreshing = true
      void loadAllData().finally(() => { refreshing = false })
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const handleLeavesUpdated = () => { void loadAllData() }
    window.addEventListener('leaves-updated', handleLeavesUpdated)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('leaves-updated', handleLeavesUpdated)
    }
  }, [loadAllData])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (await loadAllData()) toast.success('Leave records refreshed')
      else toast.error('Some leave data could not be refreshed. See the request details below.')
    } finally {
      setRefreshing(false)
    }
  };

  const handleOpenApplyModal = (typeId?: number) => {
    setSelectedInitialTypeId(typeId || null)
    setShowApplyModal(true)
  }

  const handleApprove = async (id: number) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSubmittingDecision(true)
    setActiveDecisionId(id)

    try {
      await approveLeave(id)
      toast.success('Leave request approved!')
      await refreshEverything()
    } catch (err: any) {
      const msg = String(err?.message || '')
      const isConflict = Boolean(err?.isConflict || err?.status === 409 || /already decided|not pending/i.test(msg))
      if (isConflict) {
        toast('This request was already decided', { icon: 'ℹ️' })
        await refreshEverything()
      } else {
        toast.error(msg || 'Failed to approve leave request')
      }
    } finally {
      isSubmittingRef.current = false
      setSubmittingDecision(false)
      setActiveDecisionId(null)
    }
  }

  const handleOpenReject = (id: number) => {
    setRejectingLeaveId(id)
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (isSubmittingRef.current || !rejectingLeaveId) return
    isSubmittingRef.current = true
    setSubmittingDecision(true)
    const leaveIdToReject = rejectingLeaveId

    try {
      await rejectLeave(leaveIdToReject, rejectionReason.trim() || undefined)
      toast.success('Leave request rejected')
      setRejectingLeaveId(null)
      setRejectionReason('')
      await refreshEverything()
    } catch (err: any) {
      const msg = String(err?.message || '')
      const isConflict = Boolean(err?.isConflict || err?.status === 409 || /already decided|not pending/i.test(msg))
      if (isConflict) {
        toast('This request was already decided', { icon: 'ℹ️' })
        setRejectingLeaveId(null)
        setRejectionReason('')
        await refreshEverything()
      } else {
        toast.error(msg || 'Failed to reject leave request')
      }
    } finally {
      isSubmittingRef.current = false
      setSubmittingDecision(false)
    }
  }

  const handleCancelMyLeave = async (id: number) => {
    if (isSubmittingRef.current) return
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return
    isSubmittingRef.current = true
    try {
      await cancelLeave(id)
      toast.success('Leave request cancelled')
      await refreshEverything()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel leave request')
    } finally {
      isSubmittingRef.current = false
    }
  }

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    const list = leaves.filter((l) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'UNSPECIFIED') {
          if (l.leaveTypeId) return false
        } else if (String(l.leaveTypeId) !== typeFilter) {
          return false
        }
      }
      // Status filter
      if (statusFilter !== 'ALL' && l.status !== statusFilter) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = l.fullName?.toLowerCase().includes(q)
        const matchesReason = l.reason?.toLowerCase().includes(q)
        const matchesType = (l.leaveType || l.leaveTypeName)?.toLowerCase().includes(q)
        if (!matchesName && !matchesReason && !matchesType) return false
      }
      return true
    })

    if (!sortKey) return list

    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'leaveType') {
        const typeA = (a.leaveType || a.leaveTypeName || 'Not specified').toLowerCase()
        const typeB = (b.leaveType || b.leaveTypeName || 'Not specified').toLowerCase()
        cmp = typeA.localeCompare(typeB)
      } else if (sortKey === 'employee') {
        const empA = (a.fullName || '').toLowerCase()
        const empB = (b.fullName || '').toLowerCase()
        cmp = empA.localeCompare(empB)
      } else if (sortKey === 'dates') {
        const dateA = new Date(a.startDate || '').getTime() || 0
        const dateB = new Date(b.startDate || '').getTime() || 0
        cmp = dateA - dateB
      } else if (sortKey === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [leaves, typeFilter, statusFilter, searchQuery, sortKey, sortDir])

  // Status badge styling
  const renderStatus = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span className="leave-status-pill approved inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-bold bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399] border border-[#a7f3d0] dark:border-[#065f46]">
          <CheckCircle2 size={12} />
          <span>Approved</span>
        </span>
      )
    }
    if (status === 'REJECTED') {
      return (
        <span className="leave-status-pill rejected inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-bold bg-[#fee2e2] dark:bg-[#3b1c1c] text-[#b91c1c] dark:text-[#f87171] border border-[#fca5a5] dark:border-[#7f1d1d]">
          <XCircle size={12} />
          <span>Rejected</span>
        </span>
      )
    }
    if (status === 'CANCELLED') {
      return (
        <span className="leave-status-pill cancelled inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-bold bg-[#f3f4f6] dark:bg-[#202923] text-[#6b7280] dark:text-[#9ca3af] border border-[#d1d5db] dark:border-[#374151]">
          <Clock size={12} />
          <span>Cancelled</span>
        </span>
      )
    }
    return (
      <span className="leave-status-pill pending inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-bold bg-[#fef3c7] dark:bg-[#3b2d14] text-[#92400e] dark:text-[#fbbf24] border border-[#fde68a] dark:border-[#78350f]">
        <Clock size={12} />
        <span>Pending</span>
      </span>
    )
  }

  return (
    <div className="leave-workspace-container flex flex-col gap-[24px]">
      {/* Action Toolbar */}
      <div className="leave-action-toolbar flex items-center justify-between gap-[16px] flex-wrap mb-[4px]">
        <div className="leave-toolbar-meta flex flex-col gap-[4px]">
          <div className="section-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">
            {canReview ? 'WORKFORCE ABSENCE & COMPLIANCE' : 'EMPLOYEE LEAVE HUB'}
          </div>
          <p className="leave-toolbar-desc text-[13px] text-[#65776d] dark:text-[#8c9d92] m-0">
            {canReview
              ? 'Review pending employee time-off requests, monitor leave quotas, and manage absence types.'
              : 'Submit absence requests, review quota balances, and track manager approval decisions.'}
          </p>
        </div>

        <div className="heading-actions flex items-center gap-[10px]">
          <button
            type="button"
            className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[7px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh leave data"
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isAdminOrHr && (
            <button
              type="button"
              className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[7px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all"
              onClick={() => setShowSettingsModal(true)}
              title="Configure Leave Types & Quotas"
            >
              <Settings size={14} />
              <span>Leave Types</span>
            </button>
          )}

          <button
            type="button"
            className="primary-action inline-flex items-center gap-[6px] px-[16px] py-[7px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all"
            onClick={() => handleOpenApplyModal()}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Request Leave</span>
          </button>
        </div>
      </div>

      {(loadErrors.types || loadErrors.balances) && (
        <div className="leave-load-error flex items-center justify-between p-[12px_16px] bg-[#fef2f2] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] text-[#dc2626] dark:text-[#f87171] rounded-[10px] text-[13px]" role="alert">
          <div>
            <strong>Some leave information could not be loaded.</strong>
            <p>{[loadErrors.types, loadErrors.balances].filter(Boolean).join(' ')}</p>
          </div>
          <button type="button" className="secondary-action inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all" onClick={() => void loadAllData()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon animate-spin' : ''} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Employee Balances Section (Cards with progress bar) */}
      <LeaveBalanceSummary
        balances={balances}
        loading={loading}
        onSelectType={(typeId) => handleOpenApplyModal(typeId)}
      />

      <div className="leave-view-tabs flex items-center gap-[6px] border-b border-[#dce2d7] dark:border-[#27372e] pb-0" role="tablist" aria-label="Leave requests">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'my'}
          className={`px-[16px] py-[10px] text-[13px] font-bold border-0 border-b-[3px] cursor-pointer transition-all -mb-[1px] rounded-t-[6px] ${
            activeTab === 'my'
              ? 'active text-[#10b981] dark:text-[#d9ed74] border-b-[#10b981] dark:border-b-[#d9ed74] bg-white dark:bg-transparent'
              : 'text-[#55675c] dark:text-[#8c9d92] border-transparent bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74]'
          }`}
          onClick={() => setActiveTab('my')}
        >
          My leaves
        </button>
        {canReview && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'team'}
            className={`px-[16px] py-[10px] text-[13px] font-bold border-0 border-b-[3px] cursor-pointer transition-all -mb-[1px] rounded-t-[6px] ${
              activeTab === 'team'
                ? 'active text-[#10b981] dark:text-[#d9ed74] border-b-[#10b981] dark:border-b-[#d9ed74] bg-white dark:bg-transparent'
                : 'text-[#55675c] dark:text-[#8c9d92] border-transparent bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('team')}
          >
            Team requests
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`px-[16px] py-[10px] text-[13px] font-bold border-0 border-b-[3px] cursor-pointer transition-all -mb-[1px] rounded-t-[6px] ${
              activeTab === 'admin'
                ? 'active text-[#10b981] dark:text-[#d9ed74] border-b-[#10b981] dark:border-b-[#d9ed74] bg-white dark:bg-transparent'
                : 'text-[#55675c] dark:text-[#8c9d92] border-transparent bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74]'
            }`}
            onClick={() => setActiveTab('admin')}
          >
            Admin requests
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="leave-filter-bar flex items-center justify-between gap-[12px] flex-wrap mb-[12px]">
        <div className="leave-search-wrap flex items-center gap-[8px] px-[12px] py-[8px] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] flex-1 max-w-[420px]">
          <Search size={15} color="#8a9c90" />
          <input
            type="text"
            placeholder={activeTab !== 'my' ? 'Search by employee, leave type, or reason...' : 'Search by reason or leave type...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-[13px] text-[#193c33] dark:text-[#edf5ef]"
          />
        </div>

        <div className="leave-filter-group flex items-center gap-[10px]">
          {/* Leave Type Filter */}
          <div className="filter-select-wrap flex items-center gap-[6px] px-[10px] py-[6px] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px]">
            <Filter size={13} color="#8a9c90" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              title="Filter by leave type"
              className="bg-transparent border-0 outline-none text-[12px] text-[#193c33] dark:text-[#edf5ef] cursor-pointer"
            >
              <option value="ALL">All Leave Types</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.code})
                </option>
              ))}
              <option value="UNSPECIFIED">Not specified</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-wrap flex items-center gap-[6px] px-[10px] py-[6px] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by approval status"
              className="bg-transparent border-0 outline-none text-[12px] text-[#193c33] dark:text-[#edf5ef] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="saas-table-container leave-table-container overflow-x-auto bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#27372e] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        {loading && leaves.length === 0 ? (
          <SkeletonTable columns={canReview ? 7 : 6} rows={5} hasAvatar={canReview} />
        ) : filteredLeaves.length === 0 ? (
          <div className="notif-empty-state flex flex-col items-center justify-center p-[60px_20px] text-center">
            <CalendarDays size={36} color="#8a9c90" strokeWidth={1.5} className="mb-[10px]" />
            <strong className="text-[14px] text-[#193c33] dark:text-[#edf5ef]">No leave records found</strong>
            <p className="text-[13px] text-[#708477] dark:text-[#8c9d92] mt-[4px] m-0">
              {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'No absence requests have been filed yet.'}
            </p>
          </div>
        ) : (
          <table className="saas-grid-table leave-grid-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf1eb] dark:border-[#25352c] text-[10px] font-extrabold text-[#708477] dark:text-[#8c9d92] uppercase tracking-[0.06em]">
                {activeTab !== 'my' && (
                  <th onClick={() => handleSort('employee')} className="py-[12px] px-[16px] cursor-pointer">
                    <div className="inline-flex items-center gap-[6px]">
                      <span>{activeTab === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}</span>
                      <ArrowUpDown size={12} color={sortKey === 'employee' ? '#10b981' : '#8a9c90'} />
                    </div>
                  </th>
                )}
                <th onClick={() => handleSort('leaveType')} className="py-[12px] px-[16px] cursor-pointer">
                  <div className="inline-flex items-center gap-[6px]">
                    <span>LEAVE TYPE</span>
                    <ArrowUpDown size={12} color={sortKey === 'leaveType' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th onClick={() => handleSort('dates')} className="py-[12px] px-[16px] cursor-pointer">
                  <div className="inline-flex items-center gap-[6px]">
                    <span>DATES & DURATION</span>
                    <ArrowUpDown size={12} color={sortKey === 'dates' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th className="py-[12px] px-[16px]">REASON / DETAILS</th>
                {activeTab !== 'my' && <th className="py-[12px] px-[16px]">REMAINING BALANCE</th>}
                <th onClick={() => handleSort('status')} className="py-[12px] px-[16px] cursor-pointer">
                  <div className="inline-flex items-center gap-[6px]">
                    <span>STATUS</span>
                    <ArrowUpDown size={12} color={sortKey === 'status' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th className="py-[12px] px-[16px] text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1eb] dark:divide-[#25352c]">
              {filteredLeaves.map((l) => {
                const startDateStr = String(l.startDate || '').split('T')[0]
                const endDateStr = String(l.endDate || '').split('T')[0]
                const dateDisplay = startDateStr === endDateStr ? startDateStr : `${startDateStr} → ${endDateStr}`
                const daysNum = l.daysCount ?? l.totalDays ?? 1
                const durationLabel = l.halfDaySession
                  ? `0.5 Day (${l.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'})`
                  : `${daysNum} ${daysNum === 1 ? 'day' : 'days'}`

                return (
                  <tr key={l.id} className="hover:bg-[#f7faf6] dark:hover:bg-[#17221c] transition-colors">
                    {/* Employee Profile (Admin view) */}
                    {activeTab !== 'my' && (
                      <td className="py-[12px] px-[16px]">
                        <div className="avatar-user-cell flex items-center gap-[10px]">
                          <UserAvatar name={l.fullName || 'User'} avatarUrl={l.avatarUrl} size={34} className="avatar-circle" />
                          <div className="avatar-info-copy flex flex-col">
                            <strong className="text-[13px] text-[#193c33] dark:text-[#edf5ef]">{l.fullName || 'Employee'}</strong>
                            {l.email && <small className="text-[11px] text-[#6b7280] dark:text-[#8c9d92]">{l.email}</small>}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Leave Type Badge */}
                    <td className="py-[12px] px-[16px]">
                      <LeaveTypeBadge
                        name={l.leaveType || l.leaveTypeName || 'Not specified'}
                        code={l.leaveTypeCode}
                        isPaid={l.isPaid}
                      />
                    </td>

                    {/* Dates & Duration */}
                    <td className="py-[12px] px-[16px]">
                      <div className="leave-date-cell flex flex-col gap-[3px]">
                        <strong className="leave-date-range text-[13px] text-[#193c33] dark:text-[#edf5ef] font-semibold">{dateDisplay}</strong>
                        <span className="leave-duration-tag inline-flex items-center gap-[4px] text-[11px] font-semibold text-[#517154] dark:text-[#8c9d92]">
                          <Clock size={11} />
                          <span>{durationLabel}</span>
                        </span>
                      </div>
                    </td>

                    {/* Reason & Support Docs */}
                    <td className="py-[12px] px-[16px]">
                      <div className="leave-reason-cell flex flex-col gap-[3px]">
                        <span className="leave-reason-text text-[13px] text-[#2b3f34] dark:text-[#c4d6cb] max-w-[260px] truncate" title={l.reason}>
                          {l.reason || 'No reason provided'}
                        </span>
                        {l.documentUrl && (
                          <a
                            href={l.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="leave-doc-link inline-flex items-center gap-[4px] text-[11px] font-semibold text-[#0f766e] dark:text-[#34d399] hover:underline"
                            title="View attached supporting document"
                          >
                            <FileText size={11} />
                            <span>Attachment</span>
                          </a>
                        )}
                        {(l.decisionNote || l.rejectionReason) && l.status === 'REJECTED' && (
                          <small className="leave-rejection-note text-[11px] text-[#dc2626] dark:text-[#f87171]">
                            Reason: {l.decisionNote || l.rejectionReason}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Remaining Balance (Admin view) */}
                    {activeTab !== 'my' && (
                      <td className="py-[12px] px-[16px]">
                        <div className="leave-balance-preview-cell">
                          {l.remainingBalance !== undefined ? (
                            <span className={`bal-pill text-[11px] font-bold px-[8px] py-[2px] rounded-full ${
                              l.remainingBalance <= 0
                                ? 'zero bg-[#fee2e2] dark:bg-[#3b1c1c] text-[#b91c1c] dark:text-[#f87171]'
                                : 'positive bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399]'
                            }`}>
                              {l.remainingBalance} days left
                            </span>
                          ) : (
                            <span className="bal-pill unknown text-[11px] text-[#9ca3af]">—</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Status Pill and decision history */}
                    <td className="py-[12px] px-[16px]">
                      {renderStatus(l.status)}
                      {l.autoApproved ? (
                        <small className="leave-decision-meta block text-[10px] text-[#708477] dark:text-[#8c9d92] mt-[3px]">{l.decisionNote || 'Auto-approved (no approver available)'}</small>
                      ) : l.approverName && l.decidedAt ? (
                        <small className="leave-decision-meta block text-[10px] text-[#708477] dark:text-[#8c9d92] mt-[3px]">
                          {l.status === 'REJECTED' ? 'Rejected' : 'Approved'} by {l.approverName} · {new Date(l.decidedAt).toLocaleDateString()}
                        </small>
                      ) : null}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-[12px] px-[16px] text-right">
                      {l.status === 'PENDING' ? (
                        activeTab === 'my' ? (
                          <div className="leave-own-pending-actions flex flex-col items-end gap-[4px]">
                            <small className="text-[10px] text-[#9ca3af]">You can't approve your own leave</small>
                            <button
                              type="button"
                              className="leave-cancel-btn px-[10px] py-[4px] text-[11px] font-bold text-[#dc2626] bg-[#fee2e2] dark:bg-[#3b1c1c] hover:bg-[#fca5a5] rounded-[6px] border border-[#fecaca] cursor-pointer transition-all"
                              onClick={() => handleCancelMyLeave(l.id)}
                              title="Cancel pending request"
                            >
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : canReview && l.requesterUserId !== undefined && l.requesterUserId !== currentUserId ? (
                          <div className="leave-action-group inline-flex items-center gap-[6px]">
                            <button
                              type="button"
                              className="leave-decision-btn approve inline-flex items-center gap-[4px] px-[10px] py-[5px] text-[11px] font-bold text-[#166534] dark:text-[#34d399] bg-[#dcfce7] dark:bg-[#143823] hover:bg-[#bbf7d0] border border-[#86efac] dark:border-[#1e5836] rounded-[6px] cursor-pointer transition-all disabled:opacity-50"
                              disabled={submittingDecision}
                              onClick={() => handleApprove(l.id)}
                              title="Approve this leave request"
                            >
                              <Check size={13} />
                              <span>{submittingDecision && activeDecisionId === l.id ? 'Approving...' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              className="leave-decision-btn reject inline-flex items-center gap-[4px] px-[10px] py-[5px] text-[11px] font-bold text-[#991b1b] dark:text-[#f87171] bg-[#fee2e2] dark:bg-[#3b1c1c] hover:bg-[#fecaca] border border-[#fca5a5] dark:border-[#7f1d1d] rounded-[6px] cursor-pointer transition-all disabled:opacity-50"
                              disabled={submittingDecision}
                              onClick={() => handleOpenReject(l.id)}
                              title="Reject this leave request"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <small className="leave-own-pending-note text-[11px] text-[#9ca3af]">You can't approve your own leave</small>
                        )
                      ) : (
                        <span className="text-[11px] text-[#9ca3af] italic">
                          Decision finalized
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <ApplyLeaveModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onSuccess={async () => { await loadAllData() }}
          leaveTypes={leaveTypes.filter((t) => t.isActive)}
          balances={balances}
          existingLeaves={myLeaves}
          initialTypeId={selectedInitialTypeId}
        />
      )}

      {/* Leave Types Admin Configuration Modal */}
      {showSettingsModal && (
        <LeaveTypesAdminModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          leaveTypes={leaveTypes}
          onRefresh={loadAllData}
          loading={loading}
        />
      )}

      {/* Rejection Reason Modal */}
      {rejectingLeaveId !== null && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-[16px] z-[9999]" onClick={() => setRejectingLeaveId(null)}>
          <div className="modal bg-white dark:bg-[#19231e] rounded-[16px] border border-[#dce2d7] dark:border-[#27372e] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[420px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between px-[20px] py-[16px] border-b border-[#edf1eb] dark:border-[#25352c]">
              <h3 className="text-[16px] font-bold text-[#14241d] dark:text-[#f1f7f2] m-0">Reject Leave Request</h3>
              <button
                className="modal-close bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] rounded-[6px]"
                type="button"
                onClick={() => setRejectingLeaveId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body p-[20px]">
              <p className="text-[13px] text-[#4b5e52] dark:text-[#8ea596] m-0 mb-[12px]">
                Add an optional reason for rejecting this leave request. The employee will receive it in their notification.
              </p>
              <textarea
                rows={3}
                placeholder="Optional: e.g. Inadequate team coverage or project deadline"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none box-border resize-y"
              />
            </div>
            <div className="modal-footer flex items-center justify-end gap-[8px] px-[20px] py-[14px] border-t border-[#edf1eb] dark:border-[#25352c] bg-[#f7faf6] dark:bg-[#141c18]">
              <button
                type="button"
                className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[7px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all"
                onClick={() => setRejectingLeaveId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-action inline-flex items-center gap-[6px] px-[16px] py-[7px] text-[12px] font-bold rounded-[8px] bg-[#dc2626] text-white hover:bg-[#b91c1c] border border-[#dc2626] cursor-pointer transition-all disabled:opacity-50"
                disabled={submittingDecision}
                onClick={handleConfirmReject}
              >
                {submittingDecision ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
