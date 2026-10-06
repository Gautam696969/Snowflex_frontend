import { useState, useMemo, useEffect, useCallback } from 'react'
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
import LeaveTypeBadge from './LeaveTypeBadge'
import LeaveBalanceSummary from './LeaveBalanceSummary'
import ApplyLeaveModal from './ApplyLeaveModal'
import LeaveTypesAdminModal from './LeaveTypesAdminModal'
import UserAvatar from './UserAvatar'

interface LeaveManagementViewProps {
  userRole?: string
  currentUserId?: number
  token?: string
}

export default function LeaveManagementView({
  userRole = 'EMPLOYEE',
}: LeaveManagementViewProps) {
  const isAdminOrHr = userRole === 'ADMIN' || userRole === 'HR'
  const isManager = userRole === 'MANAGER'
  const canReview = isAdminOrHr || isManager

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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

  // Rejection modal state
  const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true)
      const [typesData, balancesData, leavesData] = await Promise.all([
        fetchLeaveTypes(!isAdminOrHr).catch(() => []),
        fetchMyLeaveBalances().catch(() => []),
        (canReview ? fetchAllLeaves() : fetchMyLeaves()).catch(() => []),
      ])

      setLeaveTypes(typesData)
      setBalances(balancesData)
      setLeaves(leavesData)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load leave records')
    } finally {
      setLoading(false)
    }
  }, [isAdminOrHr, canReview])

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
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [loadAllData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
    toast.success('Leave records refreshed')
  };

  const handleOpenApplyModal = (typeId?: number) => {
    setSelectedInitialTypeId(typeId || null)
    setShowApplyModal(true)
  }

  const handleApprove = async (id: number) => {
    setSubmittingDecision(true)
    try {
      await approveLeave(id)
      toast.success('Leave request approved!')
      await loadAllData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve leave request')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const handleOpenReject = (id: number) => {
    setRejectingLeaveId(id)
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectingLeaveId) return
    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason')
      return
    }

    setSubmittingDecision(true)
    try {
      await rejectLeave(rejectingLeaveId, rejectionReason.trim())
      toast.success('Leave request rejected')
      setRejectingLeaveId(null)
      await loadAllData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject leave request')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const handleCancelMyLeave = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return
    try {
      await cancelLeave(id)
      toast.success('Leave request cancelled')
      await loadAllData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel leave request')
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
        <span className="leave-status-pill approved">
          <CheckCircle2 size={12} />
          <span>Approved</span>
        </span>
      )
    }
    if (status === 'REJECTED') {
      return (
        <span className="leave-status-pill rejected">
          <XCircle size={12} />
          <span>Rejected</span>
        </span>
      )
    }
    if (status === 'CANCELLED') {
      return (
        <span className="leave-status-pill cancelled">
          <Clock size={12} />
          <span>Cancelled</span>
        </span>
      )
    }
    return (
      <span className="leave-status-pill pending">
        <Clock size={12} />
        <span>Pending</span>
      </span>
    )
  }

  return (
    <div className="leave-workspace-container">
      {/* Action Toolbar */}
      <div className="leave-action-toolbar">
        <div className="leave-toolbar-meta">
          <div className="section-kicker">
            {canReview ? 'WORKFORCE ABSENCE & COMPLIANCE' : 'EMPLOYEE LEAVE HUB'}
          </div>
          <p className="leave-toolbar-desc">
            {canReview
              ? 'Review pending employee time-off requests, monitor leave quotas, and manage absence types.'
              : 'Submit absence requests, review quota balances, and track manager approval decisions.'}
          </p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh leave data"
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          {isAdminOrHr && (
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowSettingsModal(true)}
              title="Configure Leave Types & Quotas"
            >
              <Settings size={14} />
              <span>Leave Types</span>
            </button>
          )}

          <button
            type="button"
            className="primary-action"
            onClick={() => handleOpenApplyModal()}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Request Leave</span>
          </button>
        </div>
      </div>

      {/* Employee Balances Section (Cards with progress bar) */}
      <LeaveBalanceSummary
        balances={balances}
        loading={loading}
        onSelectType={(typeId) => handleOpenApplyModal(typeId)}
      />

      {/* Filter and Search Bar */}
      <div className="leave-filter-bar">
        <div className="leave-search-wrap">
          <Search size={15} color="#8a9c90" />
          <input
            type="text"
            placeholder={canReview ? 'Search by employee, leave type, or reason...' : 'Search by reason or leave type...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="leave-filter-group">
          {/* Leave Type Filter */}
          <div className="filter-select-wrap">
            <Filter size={13} color="#8a9c90" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              title="Filter by leave type"
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
          <div className="filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by approval status"
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
      <div className="saas-table-container leave-table-container">
        {loading && leaves.length === 0 ? (
          <div className="notif-loading-state" style={{ padding: '60px 20px' }}>
            <span className="notif-spinner" />
            <span>Loading leave records...</span>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="notif-empty-state" style={{ padding: '60px 20px' }}>
            <CalendarDays size={36} color="#8a9c90" strokeWidth={1.5} style={{ marginBottom: '10px' }} />
            <strong>No leave records found</strong>
            <p>
              {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'No absence requests have been filed yet.'}
            </p>
          </div>
        ) : (
          <table className="saas-grid-table leave-grid-table">
            <thead>
              <tr>
                {canReview && (
                  <th onClick={() => handleSort('employee')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>EMPLOYEE</span>
                      <ArrowUpDown size={12} color={sortKey === 'employee' ? '#10b981' : '#8a9c90'} />
                    </div>
                  </th>
                )}
                <th onClick={() => handleSort('leaveType')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>LEAVE TYPE</span>
                    <ArrowUpDown size={12} color={sortKey === 'leaveType' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th onClick={() => handleSort('dates')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>DATES & DURATION</span>
                    <ArrowUpDown size={12} color={sortKey === 'dates' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th>REASON / DETAILS</th>
                {canReview && <th>REMAINING BALANCE</th>}
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>STATUS</span>
                    <ArrowUpDown size={12} color={sortKey === 'status' ? '#10b981' : '#8a9c90'} />
                  </div>
                </th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l) => {
                const startDateStr = String(l.startDate || '').split('T')[0]
                const endDateStr = String(l.endDate || '').split('T')[0]
                const dateDisplay = startDateStr === endDateStr ? startDateStr : `${startDateStr} → ${endDateStr}`
                const daysNum = l.daysCount ?? l.totalDays ?? 1
                const durationLabel = l.halfDaySession
                  ? `0.5 Day (${l.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'})`
                  : `${daysNum} ${daysNum === 1 ? 'day' : 'days'}`

                return (
                  <tr key={l.id}>
                    {/* Employee Profile (Admin view) */}
                    {canReview && (
                      <td>
                        <div className="avatar-user-cell">
                          <UserAvatar name={l.fullName || 'User'} avatarUrl={l.avatarUrl} size={34} className="avatar-circle" />
                          <div className="avatar-info-copy">
                            <strong>{l.fullName || 'Employee'}</strong>
                            {l.email && <small>{l.email}</small>}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Leave Type Badge */}
                    <td>
                      <LeaveTypeBadge
                        name={l.leaveType || l.leaveTypeName || 'Not specified'}
                        code={l.leaveTypeCode}
                        isPaid={l.isPaid}
                      />
                    </td>

                    {/* Dates & Duration */}
                    <td>
                      <div className="leave-date-cell">
                        <strong className="leave-date-range">{dateDisplay}</strong>
                        <span className="leave-duration-tag">
                          <Clock size={11} />
                          <span>{durationLabel}</span>
                        </span>
                      </div>
                    </td>

                    {/* Reason & Support Docs */}
                    <td>
                      <div className="leave-reason-cell">
                        <span className="leave-reason-text" title={l.reason}>
                          {l.reason || 'No reason provided'}
                        </span>
                        {l.documentUrl && (
                          <a
                            href={l.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="leave-doc-link"
                            title="View attached supporting document"
                          >
                            <FileText size={11} />
                            <span>Attachment</span>
                          </a>
                        )}
                        {l.rejectionReason && l.status === 'REJECTED' && (
                          <small className="leave-rejection-note">
                            Reason: {l.rejectionReason}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Remaining Balance (Admin view) */}
                    {canReview && (
                      <td>
                        <div className="leave-balance-preview-cell">
                          {l.remainingBalance !== undefined ? (
                            <span className={l.remainingBalance <= 0 ? 'bal-pill zero' : 'bal-pill positive'}>
                              {l.remainingBalance} days left
                            </span>
                          ) : (
                            <span className="bal-pill unknown">—</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Status Pill */}
                    <td>{renderStatus(l.status)}</td>

                    {/* Action Buttons */}
                    <td style={{ textAlign: 'right' }}>
                      {l.status === 'PENDING' ? (
                        canReview ? (
                          <div className="leave-action-group">
                            <button
                              type="button"
                              className="leave-decision-btn approve"
                              disabled={submittingDecision}
                              onClick={() => handleApprove(l.id)}
                              title="Approve this leave request"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="leave-decision-btn reject"
                              disabled={submittingDecision}
                              onClick={() => handleOpenReject(l.id)}
                              title="Reject this leave request"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="leave-cancel-btn"
                            onClick={() => handleCancelMyLeave(l.id)}
                            title="Cancel pending request"
                          >
                            <span>Cancel</span>
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
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
          onSuccess={loadAllData}
          leaveTypes={leaveTypes.filter((t) => t.isActive)}
          balances={balances}
          existingLeaves={leaves}
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
        />
      )}

      {/* Rejection Reason Modal */}
      {rejectingLeaveId !== null && (
        <div className="modal-overlay" onClick={() => setRejectingLeaveId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Reject Leave Request</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setRejectingLeaveId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#4b5e52', margin: '0 0 12px 0' }}>
                Please provide a reason for rejecting this leave request. The employee will receive this in their notification.
              </p>
              <textarea
                required
                rows={3}
                placeholder="e.g. Inadequate team coverage or project deadline"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setRejectingLeaveId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-action"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                disabled={submittingDecision || !rejectionReason.trim()}
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
