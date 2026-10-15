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
    <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-[16px] z-[9999]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal leave-modal-container enhanced-leave-modal bg-white dark:bg-[#19231e] rounded-[16px] border border-[#dce2d7] dark:border-[#27372e] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[640px] max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="leave-modal-header flex items-center justify-between px-[24px] py-[20px] border-b border-[#edf1eb] dark:border-[#25352c]">
          <div className="leave-modal-header-left flex items-center gap-[14px]">
            <div className="leave-modal-icon-badge w-[42px] h-[42px] rounded-[10px] bg-[#f2f7ec] dark:bg-[#202d26] border border-[#d9ed74] dark:border-[#334b2a] text-[#193c33] dark:text-[#d9ed74] flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <div className="leave-modal-kicker flex items-center gap-[6px] text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#708477] dark:text-[#8c9d92]">
                <span>PEOPLE OPERATIONS</span>
                <span className="kicker-dot">•</span>
                <span>LEAVE APPLICATION</span>
              </div>
              <h2 className="leave-modal-title text-[20px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] m-0 mt-[2px]">Request Time Off</h2>
            </div>
          </div>
          <button
            className="modal-close leave-modal-close-btn bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] rounded-[6px]"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="leave-modal-body p-[24px] flex flex-col gap-[20px]">
          {errorMsg && (
            <div className="leave-modal-error-alert flex gap-[12px] p-[12px_16px] bg-[#fef2f2] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] rounded-[10px] text-[#991b1b] dark:text-[#fca5a5]" role="alert">
              <AlertCircle size={18} className="alert-icon shrink-0 mt-[2px]" />
              <div className="alert-content">
                <strong className="block text-[13px] font-bold">Attention Needed</strong>
                <p className="m-0 text-[12px] mt-[2px]">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Section 1: Leave Type Selection */}
          <div className="leave-form-section flex flex-col gap-[8px]">
            <div className="section-label-row flex items-center justify-between">
              <label htmlFor="leave-type-select" className="leave-field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                Leave Type <span className="req-star text-[#dc2626]">*</span>
              </label>
              {selectedBalance && (
                <span className={`balance-status-tag text-[11px] font-bold px-[8px] py-[3px] rounded-full ${
                  selectedBalance.remaining > 0
                    ? 'in-stock bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399]'
                    : 'empty bg-[#fee2e2] dark:bg-[#3b1c1c] text-[#b91c1c] dark:text-[#f87171]'
                }`}>
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
                className="leave-type-dropdown custom-styled-select w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit cursor-pointer transition-all box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
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
              <div className="leave-type-highlight-card p-[12px_14px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] flex flex-col gap-[6px]">
                <div className="type-badge-row flex items-center gap-[8px] flex-wrap">
                  <span className="type-code-chip px-[7px] py-[2px] text-[10px] font-extrabold rounded-[4px] bg-[#193c33] text-[#d9ed74]">{selectedType.code}</span>
                  <span className={`paid-status-chip px-[7px] py-[2px] text-[10px] font-bold rounded-[4px] ${
                    selectedType.isPaid
                      ? 'paid bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399]'
                      : 'unpaid bg-[#fef3c7] dark:bg-[#3b2d14] text-[#92400e] dark:text-[#fbbf24]'
                  }`}>
                    {selectedType.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </span>
                  {selectedType.requiresDocument && (
                    <span className="doc-req-chip inline-flex items-center gap-[4px] px-[7px] py-[2px] text-[10px] font-semibold rounded-[4px] bg-[#eff6ff] dark:bg-[#1e293b] text-[#1d4ed8] dark:text-[#93c5fd]">
                      <FileText size={11} /> Document Required
                    </span>
                  )}
                  {selectedType.code === 'SL' && (
                    <span className="policy-note-chip inline-flex items-center gap-[4px] px-[7px] py-[2px] text-[10px] font-semibold rounded-[4px] bg-[#f3f4f6] dark:bg-[#202923] text-[#4b5563] dark:text-[#9ca3af]">
                      <Info size={11} /> Past dates permitted
                    </span>
                  )}
                </div>
                <p className="type-desc-text text-[12px] text-[#65776d] dark:text-[#8c9d92] m-0">
                  {selectedType.description || 'Standard corporate absence allocation.'}
                </p>
              </div>
            )}
          </div>

          {/* Insufficient Balance Notice & Suggestion */}
          {isInsufficientBalance && (
            <div className="leave-insufficient-notice-box p-[14px_16px] bg-[#fff7ed] dark:bg-[#2b1f14] border border-[#ffedd5] dark:border-[#52331c] rounded-[10px] text-[#9a3412] dark:text-[#fdba74]">
              <div className="insufficient-header flex items-center gap-[8px] mb-[6px]">
                <ShieldAlert size={18} />
                <strong className="text-[13px]">Insufficient Leave Balance</strong>
              </div>
              <p className="text-[12px] m-0 leading-[1.4]">
                You requested <strong>{calculatedDays} working days</strong>, but only have{' '}
                <strong>{selectedBalance?.remaining} day(s)</strong> remaining in{' '}
                <strong>{selectedType?.name}</strong>.
              </p>
              {lwpType && (
                <button
                  type="button"
                  className="switch-lwp-action-btn mt-[10px] inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-bold rounded-[8px] bg-[#c2410c] dark:bg-[#ea580c] text-white hover:bg-[#9a3412] cursor-pointer transition-all"
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
          <div className="leave-form-section flex flex-col gap-[8px]">
            <div className="section-label-row flex items-center justify-between">
              <span className="leave-field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">Duration Mode</span>
              <span className="sub-helper-text text-[11px] text-[#708477] dark:text-[#8c9d92]">Select full day or half day session</span>
            </div>

            <div className="duration-mode-segmented-control grid grid-cols-2 gap-[6px] p-[4px] bg-[#edf1eb] dark:bg-[#141c18] border border-[#dce2d7] dark:border-[#25362b] rounded-[10px]">
              <button
                type="button"
                className={`segment-btn flex items-center justify-center gap-[8px] px-[14px] py-[8px] text-[12px] font-bold border-0 rounded-[8px] cursor-pointer transition-all ${
                  !isHalfDay && selectedType?.code !== 'HDL'
                    ? 'active bg-white dark:bg-[#202d26] text-[#193c33] dark:text-[#d9ed74] shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    : 'text-[#65776d] dark:text-[#8c9d92] bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74]'
                }`}
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
                className={`segment-btn flex items-center justify-center gap-[8px] px-[14px] py-[8px] text-[12px] font-bold border-0 rounded-[8px] cursor-pointer transition-all ${
                  isHalfDay || selectedType?.code === 'HDL'
                    ? 'active bg-white dark:bg-[#202d26] text-[#193c33] dark:text-[#d9ed74] shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    : 'text-[#65776d] dark:text-[#8c9d92] bg-transparent hover:text-[#193c33] dark:hover:text-[#d9ed74]'
                }`}
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
              <div className="half-day-options-panel p-[12px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] flex flex-col gap-[8px]">
                <span className="half-day-prompt text-[11px] font-bold text-[#708477] dark:text-[#8c9d92]">Select Half Day Session:</span>
                <div className="session-options-row grid grid-cols-2 max-[500px]:grid-cols-1 gap-[10px]">
                  <label className={`session-radio-card flex items-center justify-between p-[10px_12px] border rounded-[8px] cursor-pointer transition-all ${
                    halfDaySession === 'FIRST_HALF'
                      ? 'selected border-[#193c33] dark:border-[#d9ed74] bg-[#f0fdf4] dark:bg-[#192a20]'
                      : 'border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#131a16]'
                  }`}>
                    <input
                      type="radio"
                      name="halfDaySession"
                      checked={halfDaySession === 'FIRST_HALF'}
                      onChange={() => setHalfDaySession('FIRST_HALF')}
                      className="sr-only"
                    />
                    <div className="session-card-content flex flex-col gap-[2px]">
                      <div className="session-title flex items-center gap-[6px] text-[12px] text-[#193c33] dark:text-[#edf5ef]">
                        <Clock size={13} />
                        <strong>First Half</strong>
                      </div>
                      <span className="session-hours text-[11px] text-[#708477] dark:text-[#8c9d92]">Morning (9:00 AM – 1:30 PM)</span>
                    </div>
                    {halfDaySession === 'FIRST_HALF' && <Check size={14} className="check-mark text-[#166534] dark:text-[#4ade80]" />}
                  </label>

                  <label className={`session-radio-card flex items-center justify-between p-[10px_12px] border rounded-[8px] cursor-pointer transition-all ${
                    halfDaySession === 'SECOND_HALF'
                      ? 'selected border-[#193c33] dark:border-[#d9ed74] bg-[#f0fdf4] dark:bg-[#192a20]'
                      : 'border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#131a16]'
                  }`}>
                    <input
                      type="radio"
                      name="halfDaySession"
                      checked={halfDaySession === 'SECOND_HALF'}
                      onChange={() => setHalfDaySession('SECOND_HALF')}
                      className="sr-only"
                    />
                    <div className="session-card-content flex flex-col gap-[2px]">
                      <div className="session-title flex items-center gap-[6px] text-[12px] text-[#193c33] dark:text-[#edf5ef]">
                        <Clock size={13} />
                        <strong>Second Half</strong>
                      </div>
                      <span className="session-hours text-[11px] text-[#708477] dark:text-[#8c9d92]">Afternoon (1:30 PM – 6:00 PM)</span>
                    </div>
                    {halfDaySession === 'SECOND_HALF' && <Check size={14} className="check-mark text-[#166534] dark:text-[#4ade80]" />}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Date Range Picker & Quick Presets */}
          <div className="leave-form-section flex flex-col gap-[8px]">
            <div className="section-label-row flex items-center justify-between">
              <span className="leave-field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">Date Selection <span className="req-star text-[#dc2626]">*</span></span>
              <div className="quick-presets-chips flex gap-[6px]">
                <button type="button" onClick={() => handleQuickPreset('today')} className="preset-chip px-[8px] py-[3px] text-[11px] font-semibold border border-[#dce2d7] dark:border-[#2a3d31] rounded-full bg-white dark:bg-[#19231e] text-[#517154] dark:text-[#8c9d92] hover:bg-[#f7faf6] dark:hover:bg-[#202d26] cursor-pointer transition-all">
                  Today
                </button>
                <button type="button" onClick={() => handleQuickPreset('tomorrow')} className="preset-chip px-[8px] py-[3px] text-[11px] font-semibold border border-[#dce2d7] dark:border-[#2a3d31] rounded-full bg-white dark:bg-[#19231e] text-[#517154] dark:text-[#8c9d92] hover:bg-[#f7faf6] dark:hover:bg-[#202d26] cursor-pointer transition-all">
                  Tomorrow
                </button>
                {!isHalfDay && (
                  <>
                    <button type="button" onClick={() => handleQuickPreset('next3')} className="preset-chip px-[8px] py-[3px] text-[11px] font-semibold border border-[#dce2d7] dark:border-[#2a3d31] rounded-full bg-white dark:bg-[#19231e] text-[#517154] dark:text-[#8c9d92] hover:bg-[#f7faf6] dark:hover:bg-[#202d26] cursor-pointer transition-all">
                      3 Days
                    </button>
                    <button type="button" onClick={() => handleQuickPreset('nextWeek')} className="preset-chip px-[8px] py-[3px] text-[11px] font-semibold border border-[#dce2d7] dark:border-[#2a3d31] rounded-full bg-white dark:bg-[#19231e] text-[#517154] dark:text-[#8c9d92] hover:bg-[#f7faf6] dark:hover:bg-[#202d26] cursor-pointer transition-all">
                      Next Week
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="date-picker-grid grid grid-cols-2 max-[500px]:grid-cols-1 gap-[12px]">
              <div className="date-input-field flex flex-col gap-[4px]">
                <label htmlFor="leave-start-date" className="date-sub-label text-[11px] font-bold text-[#708477] dark:text-[#8c9d92]">
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
                    className="styled-date-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
                  />
                </div>
              </div>

              <div className="date-input-field flex flex-col gap-[4px]">
                <label htmlFor="leave-end-date" className="date-sub-label text-[11px] font-bold text-[#708477] dark:text-[#8c9d92]">
                  To Date {isHalfDay && <span className="same-day-tag text-[10px] text-[#0f766e] dark:text-[#34d399]">(Same day for half-day)</span>}
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
                    className="styled-date-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit box-border disabled:bg-[#f7faf6] dark:disabled:bg-[#17221c] disabled:text-[#65776d] dark:disabled:text-[#8c9d92] disabled:cursor-not-allowed focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Overlap Alert Notice */}
          {hasOverlap && (
            <div className="leave-overlap-alert flex items-center gap-[8px] p-[10px_14px] bg-[#fff5f5] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] text-[#dc2626] dark:text-[#f87171] rounded-[8px] text-[12px]">
              <AlertCircle size={16} />
              <span>You already have an existing leave request covering these dates.</span>
            </div>
          )}

          {/* Section 4: Real-time Leave Calculation & Balance Projection */}
          {startDate && endDate && (
            <div className="leave-impact-summary-box flex items-center justify-around p-[14px_18px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[12px]">
              <div className="impact-col flex flex-col items-center gap-[2px]">
                <span className="impact-label text-[10px] font-bold text-[#708477] dark:text-[#8c9d92] uppercase tracking-[0.05em]">Duration</span>
                <div className="impact-stat-row flex items-baseline gap-[4px]">
                  <strong className="impact-stat-value text-[22px] font-extrabold text-[#193c33] dark:text-[#edf5ef]">{calculatedDays}</strong>
                  <span className="impact-stat-unit text-[11px] text-[#708477] dark:text-[#8c9d92]">{calculatedDays === 1 ? 'day' : 'days'}</span>
                </div>
                <span className="impact-footnote text-[10px] text-[#708477] dark:text-[#8c9d92]">Weekends auto-excluded</span>
              </div>

              <div className="impact-divider w-[1px] h-[40px] bg-[#e2ebd0] dark:bg-[#25362b]" />

              <div className="impact-col flex flex-col items-center gap-[2px]">
                <span className="impact-label text-[10px] font-bold text-[#708477] dark:text-[#8c9d92] uppercase tracking-[0.05em]">Current Balance</span>
                <div className="impact-stat-row flex items-baseline gap-[4px]">
                  <strong className="impact-stat-value text-[22px] font-extrabold text-[#193c33] dark:text-[#edf5ef]">
                    {selectedBalance?.isUnlimited ? '∞' : selectedBalance?.remaining ?? '—'}
                  </strong>
                  <span className="impact-stat-unit text-[11px] text-[#708477] dark:text-[#8c9d92]">
                    {selectedBalance?.isUnlimited ? 'unlimited' : 'days'}
                  </span>
                </div>
                <span className="impact-footnote text-[10px] text-[#708477] dark:text-[#8c9d92]">{selectedType?.name}</span>
              </div>

              <div className="impact-divider w-[1px] h-[40px] bg-[#e2ebd0] dark:bg-[#25362b]" />

              <div className="impact-col flex flex-col items-center gap-[2px]">
                <span className="impact-label text-[10px] font-bold text-[#708477] dark:text-[#8c9d92] uppercase tracking-[0.05em]">Remaining After</span>
                <div className="impact-stat-row flex items-baseline gap-[4px]">
                  <strong
                    className={`impact-stat-value text-[22px] font-extrabold ${
                      isInsufficientBalance ? 'stat-danger text-[#dc2626] dark:text-[#f87171]' : 'stat-success text-[#166534] dark:text-[#4ade80]'
                    }`}
                  >
                    {selectedBalance?.isUnlimited ? '∞' : balanceAfter ?? '—'}
                  </strong>
                  <span className="impact-stat-unit text-[11px] text-[#708477] dark:text-[#8c9d92]">
                    {selectedBalance?.isUnlimited ? 'unlimited' : 'days'}
                  </span>
                </div>
                <span className={`impact-footnote text-[10px] ${isInsufficientBalance ? 'text-danger text-[#dc2626] dark:text-[#f87171] font-semibold' : 'text-[#708477] dark:text-[#8c9d92]'}`}>
                  {isInsufficientBalance ? 'Exceeds quota' : 'Projected balance'}
                </span>
              </div>
            </div>
          )}

          {/* Section 5: Reason for Absence */}
          <div className="leave-form-section flex flex-col gap-[8px]">
            <div className="section-label-row flex items-center justify-between">
              <label htmlFor="leave-reason" className="leave-field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                Reason for Absence{' '}
                {selectedType?.code === 'OTHER' ? (
                  <span className="req-star text-[#dc2626]">* (Required for Other)</span>
                ) : (
                  <span className="optional-tag text-[11px] text-[#708477] dark:text-[#8c9d92] font-normal">(Optional for review)</span>
                )}
              </label>
              <span className="char-count text-[11px] text-[#708477] dark:text-[#8c9d92]">{reason.length} / 500</span>
            </div>
            <textarea
              id="leave-reason"
              required={selectedType?.code === 'OTHER'}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context or details for your manager to review..."
              rows={3}
              className="styled-textarea w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit box-border resize-y focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
            />
          </div>

          {/* Section 6: Document Attachment (if required) */}
          {selectedType?.requiresDocument && (
            <div className="leave-form-section document-upload-section flex flex-col gap-[8px]">
              <div className="section-label-row flex items-center justify-between">
                <label htmlFor="leave-doc" className="leave-field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                  Supporting Document URL <span className="req-star text-[#dc2626]">*</span>
                </label>
                <span className="doc-hint text-[11px] text-[#708477] dark:text-[#8c9d92]">Medical certificate or supporting file</span>
              </div>
              <div className="doc-input-wrap relative flex items-center">
                <FileText size={16} className="doc-input-icon absolute left-[12px] text-[#708477] dark:text-[#8c9d92] pointer-events-none" />
                <input
                  id="leave-doc"
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or uploaded document link"
                  className="styled-doc-input w-full pl-[38px] pr-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
                />
              </div>
              <small className="doc-instruction-text text-[11px] text-[#708477] dark:text-[#8c9d92]">
                {selectedType.name} policies require verifiable documentation prior to approval.
              </small>
            </div>
          )}

          {/* Modal Footer / Actions */}
          <div className="leave-modal-footer flex items-center justify-end gap-[10px] px-[24px] py-[16px] border-t border-[#edf1eb] dark:border-[#25352c] bg-[#f7faf6] dark:bg-[#141c18] -mx-[24px] -mb-[24px] rounded-b-[16px]">
            <button
              type="button"
              className="leave-modal-cancel-btn px-[16px] py-[9px] text-[13px] font-bold rounded-[8px] border border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="leave-modal-submit-btn inline-flex items-center gap-[8px] px-[20px] py-[9px] text-[13px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(25,60,51,0.2)]"
              disabled={submitting || isInsufficientBalance || hasOverlap || calculatedDays <= 0}
            >
              {submitting ? (
                <>
                  <span className="submit-spinner inline-block w-[14px] h-[14px] border-2 border-current border-t-transparent rounded-full animate-spin" />
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
