import { useState, useMemo, useEffect, type FormEvent } from 'react'
import {
  X, AlertCircle, Clock, ArrowRight, ShieldAlert,
  Calendar, FileText, CheckCircle2, Sun, Sunset, Info, Check
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  applyLeave, calculateWorkingDaysClient,
  type LeaveType, type LeaveBalance, type LeaveRecord
} from '../lib/leave-api'

interface ApplyLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  leaveTypes: LeaveType[]
  balances: LeaveBalance[]
  existingLeaves: LeaveRecord[]
  initialTypeId?: number | null
}

export default function ApplyLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypes,
  balances,
  existingLeaves,
  initialTypeId,
}: ApplyLeaveModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<number>(() => {
    return initialTypeId || leaveTypes[0]?.id || 1
  })
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false)
  const [halfDaySession, setHalfDaySession] = useState<'FIRST_HALF' | 'SECOND_HALF'>('FIRST_HALF')
  const [reason, setReason] = useState<string>('')
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sync initial selected type when modal opens or prop changes
  useEffect(() => {
    if (initialTypeId) {
      setSelectedTypeId(initialTypeId)
    } else if (leaveTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(leaveTypes[0].id)
    }
  }, [initialTypeId, leaveTypes])

  const selectedType = useMemo(() => {
    return leaveTypes.find((t) => t.id === Number(selectedTypeId))
  }, [leaveTypes, selectedTypeId])

  const selectedBalance = useMemo(() => {
    return balances.find((b) => b.leaveTypeId === Number(selectedTypeId))
  }, [balances, selectedTypeId])

  // Automatically enable half day session selector if leave type is HDL
  useEffect(() => {
    if (selectedType?.code === 'HDL') {
      setIsHalfDay(true)
      if (startDate && !endDate) setEndDate(startDate)
    }
  }, [selectedType, startDate, endDate])

  // Real-time calculated working days
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    return calculateWorkingDaysClient(startDate, endDate, isHalfDay || selectedType?.code === 'HDL')
  }, [startDate, endDate, isHalfDay, selectedType])

  // Balance after this request
  const balanceAfter = useMemo(() => {
    if (!selectedBalance || selectedBalance.isUnlimited) return null
    return Math.max(0, selectedBalance.remaining - calculatedDays)
  }, [selectedBalance, calculatedDays])

  // Validation checks
  const isPastDate = useMemo(() => {
    if (!startDate) return false
    const today = new Date().toISOString().split('T')[0]
    return startDate < today
  }, [startDate])

  const isInsufficientBalance = useMemo(() => {
    if (!selectedBalance || selectedBalance.isUnlimited) return false
    return calculatedDays > selectedBalance.remaining
  }, [selectedBalance, calculatedDays])

  const hasOverlap = useMemo(() => {
    if (!startDate || !endDate) return false
    return existingLeaves.some((l) => {
      if (l.status === 'REJECTED' || l.status === 'CANCELLED') return false
      const s = String(l.startDate).split('T')[0]
      const e = String(l.endDate).split('T')[0]
      return !(endDate < s || startDate > e)
    })
  }, [existingLeaves, startDate, endDate])

  // Suggest Leave Without Pay type
  const lwpType = useMemo(() => {
    return leaveTypes.find((t) => t.code === 'LWP')
  }, [leaveTypes])

  // Helper date preset handler
  const handleQuickPreset = (preset: 'today' | 'tomorrow' | 'next3' | 'nextWeek') => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    let s = new Date()
    let e = new Date()

    if (preset === 'today') {
      s = today
      e = today
    } else if (preset === 'tomorrow') {
      s.setDate(today.getDate() + 1)
      e = new Date(s)
    } else if (preset === 'next3') {
      s.setDate(today.getDate() + 1)
      e.setDate(today.getDate() + 3)
    } else if (preset === 'nextWeek') {
      // Find next Monday
      const day = today.getDay()
      const daysUntilMonday = ((8 - day) % 7) || 7
      s.setDate(today.getDate() + daysUntilMonday)
      e = new Date(s)
      e.setDate(s.getDate() + 4) // Monday to Friday
    }

    const startStr = formatDate(s)
    const endStr = formatDate(e)
    setStartDate(startStr)
    setEndDate(isHalfDay ? startStr : endStr)
    setErrorMsg(null)
  }

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedTypeId) {
      setErrorMsg('Please select a leave type.')
      return
    }
    if (!startDate || !endDate) {
      setErrorMsg('Please select both start and end dates.')
      return
    }
    if (endDate < startDate) {
      setErrorMsg('End date must be on or after start date.')
      return
    }
    if (calculatedDays <= 0) {
      setErrorMsg('The selected date range contains no working days (weekends only).')
      return
    }
    if (isPastDate && selectedType?.code !== 'SL') {
      setErrorMsg('Past dates are only permitted for Sick Leave requests.')
      return
    }
    if (selectedType?.code === 'OTHER' && !reason.trim()) {
      setErrorMsg('A specific reason is required for "Other" leave requests.')
      return
    }
    if (hasOverlap) {
      setErrorMsg('You already have an existing leave request covering these dates.')
      return
    }
    if (isInsufficientBalance) {
      setErrorMsg(
        `Insufficient leave balance for ${selectedType?.name}. Remaining is ${selectedBalance?.remaining} day(s), but requested ${calculatedDays} day(s).`
      )
      return
    }

    setSubmitting(true)
    try {
      await applyLeave({
        leaveTypeId: Number(selectedTypeId),
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        reason: reason.trim(),
        halfDaySession: isHalfDay ? halfDaySession : null,
        documentUrl: documentUrl.trim() || null,
      })

      toast.success('Leave request submitted successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal leave-modal-container enhanced-leave-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="leave-modal-header">
          <div className="leave-modal-header-left">
            <div className="leave-modal-icon-badge">
              <Calendar size={20} />
            </div>
            <div>
              <div className="leave-modal-kicker">
                <span>PEOPLE OPERATIONS</span>
                <span className="kicker-dot">•</span>
                <span>LEAVE APPLICATION</span>
              </div>
              <h2 className="leave-modal-title">Request Time Off</h2>
            </div>
          </div>
          <button
            className="modal-close leave-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="leave-modal-body">
          {errorMsg && (
            <div className="leave-modal-error-alert" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <div className="alert-content">
                <strong>Attention Needed</strong>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Section 1: Leave Type Selection */}
          <div className="leave-form-section">
            <div className="section-label-row">
              <label htmlFor="leave-type-select" className="leave-field-label">
                Leave Type <span className="req-star">*</span>
              </label>
              {selectedBalance && (
                <span className={`balance-status-tag ${selectedBalance.remaining > 0 ? 'in-stock' : 'empty'}`}>
                  {selectedBalance.isUnlimited
                    ? 'Unlimited Allowance'
                    : `${selectedBalance.remaining} days available`}
                </span>
              )}
            </div>

            <div className="leave-select-wrapper">
              <select
                id="leave-type-select"
                required
                value={selectedTypeId}
                onChange={(e) => {
                  setSelectedTypeId(Number(e.target.value))
                  setErrorMsg(null)
                }}
                className="leave-type-dropdown custom-styled-select"
              >
                {leaveTypes.map((t) => {
                  const bal = balances.find((b) => b.leaveTypeId === t.id)
                  const balText = bal
                    ? bal.isUnlimited
                      ? 'Unlimited'
                      : `${bal.remaining} left`
                    : t.yearlyQuota !== null
                      ? `${t.yearlyQuota} quota`
                      : 'Unlimited'
                  const payText = t.isPaid ? 'Paid' : 'Unpaid'

                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {payText} • [{balText}]
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Visual Leave Type Summary Banner */}
            {selectedType && (
              <div className="leave-type-highlight-card">
                <div className="type-badge-row">
                  <span className="type-code-chip">{selectedType.code}</span>
                  <span className={`paid-status-chip ${selectedType.isPaid ? 'paid' : 'unpaid'}`}>
                    {selectedType.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </span>
                  {selectedType.requiresDocument && (
                    <span className="doc-req-chip">
                      <FileText size={11} /> Document Required
                    </span>
                  )}
                  {selectedType.code === 'SL' && (
                    <span className="policy-note-chip">
                      <Info size={11} /> Past dates permitted
                    </span>
                  )}
                </div>
                <p className="type-desc-text">
                  {selectedType.description || 'Standard corporate absence allocation.'}
                </p>
              </div>
            )}
          </div>

          {/* Insufficient Balance Notice & Suggestion */}
          {isInsufficientBalance && (
            <div className="leave-insufficient-notice-box">
              <div className="insufficient-header">
                <ShieldAlert size={18} />
                <strong>Insufficient Leave Balance</strong>
              </div>
              <p>
                You requested <strong>{calculatedDays} working days</strong>, but only have{' '}
                <strong>{selectedBalance?.remaining} day(s)</strong> remaining in{' '}
                <strong>{selectedType?.name}</strong>.
              </p>
              {lwpType && (
                <button
                  type="button"
                  className="switch-lwp-action-btn"
                  onClick={() => {
                    setSelectedTypeId(lwpType.id)
                    setErrorMsg(null)
                  }}
                >
                  <span>Switch to Leave Without Pay (LWP)</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Section 2: Duration Mode Toggle (Full Day vs Half Day) */}
          <div className="leave-form-section">
            <div className="section-label-row">
              <span className="leave-field-label">Duration Mode</span>
              <span className="sub-helper-text">Select full day or half day session</span>
            </div>

            <div className="duration-mode-segmented-control">
              <button
                type="button"
                className={`segment-btn ${!isHalfDay && selectedType?.code !== 'HDL' ? 'active' : ''}`}
                onClick={() => {
                  if (selectedType?.code === 'HDL') return
                  setIsHalfDay(false)
                }}
                disabled={selectedType?.code === 'HDL'}
              >
                <Sun size={15} />
                <span>Full Day(s)</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${isHalfDay || selectedType?.code === 'HDL' ? 'active' : ''}`}
                onClick={() => {
                  setIsHalfDay(true)
                  if (startDate) setEndDate(startDate)
                }}
              >
                <Sunset size={15} />
                <span>Half Day (0.5 Day)</span>
              </button>
            </div>

            {/* Half Day Session Segmented Options */}
            {(isHalfDay || selectedType?.code === 'HDL') && (
              <div className="half-day-options-panel">
                <span className="half-day-prompt">Select Half Day Session:</span>
                <div className="session-options-row">
                  <label className={`session-radio-card ${halfDaySession === 'FIRST_HALF' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="halfDaySession"
                      checked={halfDaySession === 'FIRST_HALF'}
                      onChange={() => setHalfDaySession('FIRST_HALF')}
                    />
                    <div className="session-card-content">
                      <div className="session-title">
                        <Clock size={13} />
                        <strong>First Half</strong>
                      </div>
                      <span className="session-hours">Morning (9:00 AM – 1:30 PM)</span>
                    </div>
                    {halfDaySession === 'FIRST_HALF' && <Check size={14} className="check-mark" />}
                  </label>

                  <label className={`session-radio-card ${halfDaySession === 'SECOND_HALF' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="halfDaySession"
                      checked={halfDaySession === 'SECOND_HALF'}
                      onChange={() => setHalfDaySession('SECOND_HALF')}
                    />
                    <div className="session-card-content">
                      <div className="session-title">
                        <Clock size={13} />
                        <strong>Second Half</strong>
                      </div>
                      <span className="session-hours">Afternoon (1:30 PM – 6:00 PM)</span>
                    </div>
                    {halfDaySession === 'SECOND_HALF' && <Check size={14} className="check-mark" />}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Date Range Picker & Quick Presets */}
          <div className="leave-form-section">
            <div className="section-label-row">
              <span className="leave-field-label">Date Selection <span className="req-star">*</span></span>
              <div className="quick-presets-chips">
                <button type="button" onClick={() => handleQuickPreset('today')} className="preset-chip">
                  Today
                </button>
                <button type="button" onClick={() => handleQuickPreset('tomorrow')} className="preset-chip">
                  Tomorrow
                </button>
                {!isHalfDay && (
                  <>
                    <button type="button" onClick={() => handleQuickPreset('next3')} className="preset-chip">
                      3 Days
                    </button>
                    <button type="button" onClick={() => handleQuickPreset('nextWeek')} className="preset-chip">
                      Next Week
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="date-picker-grid">
              <div className="date-input-field">
                <label htmlFor="leave-start-date" className="date-sub-label">
                  From Date
                </label>
                <div className="date-input-wrapper">
                  <input
                    id="leave-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      if (!endDate || endDate < e.target.value || isHalfDay) {
                        setEndDate(e.target.value)
                      }
                      setErrorMsg(null)
                    }}
                    className="styled-date-input"
                  />
                </div>
              </div>

              <div className="date-input-field">
                <label htmlFor="leave-end-date" className="date-sub-label">
                  To Date {isHalfDay && <span className="same-day-tag">(Same day for half-day)</span>}
                </label>
                <div className="date-input-wrapper">
                  <input
                    id="leave-end-date"
                    type="date"
                    required
                    disabled={isHalfDay}
                    value={isHalfDay ? startDate : endDate}
                    min={startDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setErrorMsg(null)
                    }}
                    className="styled-date-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Overlap Alert Notice */}
          {hasOverlap && (
            <div className="leave-overlap-alert">
              <AlertCircle size={16} />
              <span>You already have an existing leave request covering these dates.</span>
            </div>
          )}

          {/* Section 4: Real-time Leave Calculation & Balance Projection */}
          {startDate && endDate && (
            <div className="leave-impact-summary-box">
              <div className="impact-col">
                <span className="impact-label">Duration</span>
                <div className="impact-stat-row">
                  <strong className="impact-stat-value">{calculatedDays}</strong>
                  <span className="impact-stat-unit">{calculatedDays === 1 ? 'day' : 'days'}</span>
                </div>
                <span className="impact-footnote">Weekends auto-excluded</span>
              </div>

              <div className="impact-divider" />

              <div className="impact-col">
                <span className="impact-label">Current Balance</span>
                <div className="impact-stat-row">
                  <strong className="impact-stat-value">
                    {selectedBalance?.isUnlimited ? '∞' : selectedBalance?.remaining ?? '—'}
                  </strong>
                  <span className="impact-stat-unit">
                    {selectedBalance?.isUnlimited ? 'unlimited' : 'days'}
                  </span>
                </div>
                <span className="impact-footnote">{selectedType?.name}</span>
              </div>

              <div className="impact-divider" />

              <div className="impact-col">
                <span className="impact-label">Remaining After</span>
                <div className="impact-stat-row">
                  <strong
                    className={`impact-stat-value ${
                      isInsufficientBalance ? 'stat-danger' : 'stat-success'
                    }`}
                  >
                    {selectedBalance?.isUnlimited ? '∞' : balanceAfter ?? '—'}
                  </strong>
                  <span className="impact-stat-unit">
                    {selectedBalance?.isUnlimited ? 'unlimited' : 'days'}
                  </span>
                </div>
                <span className={`impact-footnote ${isInsufficientBalance ? 'text-danger' : ''}`}>
                  {isInsufficientBalance ? 'Exceeds quota' : 'Projected balance'}
                </span>
              </div>
            </div>
          )}

          {/* Section 5: Reason for Absence */}
          <div className="leave-form-section">
            <div className="section-label-row">
              <label htmlFor="leave-reason" className="leave-field-label">
                Reason for Absence{' '}
                {selectedType?.code === 'OTHER' ? (
                  <span className="req-star">* (Required for Other)</span>
                ) : (
                  <span className="optional-tag">(Optional for review)</span>
                )}
              </label>
              <span className="char-count">{reason.length} / 500</span>
            </div>
            <textarea
              id="leave-reason"
              required={selectedType?.code === 'OTHER'}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context or details for your manager to review..."
              rows={3}
              className="styled-textarea"
            />
          </div>

          {/* Section 6: Document Attachment (if required) */}
          {selectedType?.requiresDocument && (
            <div className="leave-form-section document-upload-section">
              <div className="section-label-row">
                <label htmlFor="leave-doc" className="leave-field-label">
                  Supporting Document URL <span className="req-star">*</span>
                </label>
                <span className="doc-hint">Medical certificate or supporting file</span>
              </div>
              <div className="doc-input-wrap">
                <FileText size={16} className="doc-input-icon" />
                <input
                  id="leave-doc"
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or uploaded document link"
                  className="styled-doc-input"
                />
              </div>
              <small className="doc-instruction-text">
                {selectedType.name} policies require verifiable documentation prior to approval.
              </small>
            </div>
          )}

          {/* Modal Footer / Actions */}
          <div className="leave-modal-footer">
            <button
              type="button"
              className="leave-modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="leave-modal-submit-btn"
              disabled={submitting || isInsufficientBalance || hasOverlap || calculatedDays <= 0}
            >
              {submitting ? (
                <>
                  <span className="submit-spinner" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit Leave Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
