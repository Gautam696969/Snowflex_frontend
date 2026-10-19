import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  Clock,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Check,
  Home,
  Briefcase,
  SlidersHorizontal,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  createAttendanceRequest,
  type CreateAttendanceRequestInput,
  type ApiError,
} from '../lib/attendance-request-api'
import type { SafeUser } from '../lib/auth-api'

const POLICY_MAX_DAYS_AGO = 30

export type RegularizationType = 'MISSED_PUNCH' | 'WORK_FROM_HOME' | 'ON_DUTY' | 'CORRECTION'

interface CategoryItem {
  id: RegularizationType
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'MISSED_PUNCH',
    title: 'Missed Punch',
    subtitle: 'Biometric / Turnstile',
    description: 'Forgot to swipe card or reader did not log punch.',
    icon: Clock,
  },
  {
    id: 'WORK_FROM_HOME',
    title: 'Work From Home',
    subtitle: 'Remote Day',
    description: 'Approved remote workday with normal hours.',
    icon: Home,
  },
  {
    id: 'ON_DUTY',
    title: 'On-Duty / Field',
    subtitle: 'External Duty',
    description: 'Client visit, seminar, or off-site assignment.',
    icon: Briefcase,
  },
  {
    id: 'CORRECTION',
    title: 'Time Correction',
    subtitle: 'Log Adjustment',
    description: 'Rectify incorrect timestamp or system error.',
    icon: SlidersHorizontal,
  },
]

interface ShiftPreset {
  id: string
  label: string
  checkIn: string
  checkOut: string
}

const SHIFT_PRESETS: ShiftPreset[] = [
  { id: 'general', label: 'General 9-6', checkIn: '09:00', checkOut: '18:00' },
  { id: 'morning', label: 'Morning 8:30-5:30', checkIn: '08:30', checkOut: '17:30' },
  { id: 'evening', label: 'Evening 1:30-10:00', checkIn: '13:30', checkOut: '22:00' },
  { id: 'custom', label: 'Custom', checkIn: '09:00', checkOut: '18:00' },
]

interface RequestAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUser?: SafeUser | null
}

function calculateWorkingHours(inTime: string, outTime: string): {
  totalHours: number
  text: string
  isValid: boolean
} {
  if (!inTime || !outTime) {
    return { totalHours: 0, text: '0h 00m', isValid: false }
  }

  const [inH, inM] = inTime.split(':').map(Number)
  const [outH, outM] = outTime.split(':').map(Number)

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
    return { totalHours: 0, text: '0h 00m', isValid: false }
  }

  let inMinutes = inH * 60 + inM
  let outMinutes = outH * 60 + outM

  if (outMinutes <= inMinutes) {
    outMinutes += 24 * 60
  }

  const diffMinutes = outMinutes - inMinutes
  if (diffMinutes <= 0) {
    return { totalHours: 0, text: 'Check-out must be after check-in', isValid: false }
  }

  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  const totalDecHours = Math.round((diffMinutes / 60) * 100) / 100

  return {
    totalHours: totalDecHours,
    text: `${hours}h ${mins.toString().padStart(2, '0')}m`,
    isValid: true,
  }
}

function getFormattedDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTime12h(time24: string): string {
  if (!time24) return '—'
  const [h, m] = time24.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return time24
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function RequestAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}: RequestAttendanceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }, [])
  const minDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - POLICY_MAX_DAYS_AGO)
    return d.toISOString().split('T')[0]
  }, [])

  // Essential Form State
  const [date, setDate] = useState<string>(todayStr)
  const [type, setType] = useState<RegularizationType>('MISSED_PUNCH')
  const [checkInTime, setCheckInTime] = useState<string>('09:00')
  const [checkOutTime, setCheckOutTime] = useState<string>('18:00')
  const [activePreset, setActivePreset] = useState<string>('general')
  const [reason, setReason] = useState<string>('')

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState<boolean>(false)

  // Track if user entered changes
  const isDirty = useMemo(() => {
    return (
      date !== todayStr ||
      type !== 'MISSED_PUNCH' ||
      checkInTime !== '09:00' ||
      checkOutTime !== '18:00' ||
      reason.trim().length > 0
    )
  }, [date, todayStr, type, checkInTime, checkOutTime, reason])

  // Scroll lock & Focus Trap
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = setTimeout(() => modalRef.current?.focus(), 50)
    return () => {
      document.body.style.overflow = originalOverflow
      clearTimeout(timer)
    }
  }, [isOpen])

  // Safe Close with dirty confirmation
  const handleSafeClose = () => {
    if (isDirty) {
      const discard = window.confirm('Discard unsaved attendance request?')
      if (!discard) return
    }
    onClose()
  }

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSafeClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDirty])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleSafeClose()
    }
  }

  const duration = useMemo(() => {
    return calculateWorkingHours(checkInTime, checkOutTime)
  }, [checkInTime, checkOutTime])

  const selectedCategory = useMemo(() => {
    return CATEGORIES.find((c) => c.id === type) || CATEGORIES[0]
  }, [type])

  const handleApplyPreset = (preset: ShiftPreset) => {
    setActivePreset(preset.id)
    if (preset.id !== 'custom') {
      setCheckInTime(preset.checkIn)
      setCheckOutTime(preset.checkOut)
    }
  }

  const handleTimeChange = (field: 'in' | 'out', val: string) => {
    setActivePreset('custom')
    if (field === 'in') setCheckInTime(val)
    if (field === 'out') setCheckOutTime(val)
  }

  const handleCategoryKeyDown = (e: ReactKeyboardEvent, currentId: RegularizationType) => {
    const ids: RegularizationType[] = ['MISSED_PUNCH', 'WORK_FROM_HOME', 'ON_DUTY', 'CORRECTION']
    const idx = ids.indexOf(currentId)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setType(ids[(idx + 1) % ids.length])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setType(ids[(idx - 1 + ids.length) % ids.length])
    }
  }

  const isFormValid = useMemo(() => {
    if (!date || date > todayStr || date < minDateStr) return false
    if (!duration.isValid) return false
    if (reason.trim().length < 10) return false
    return true
  }, [date, todayStr, minDateStr, duration, reason])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!date) {
      setErrorMsg('Please select an attendance date.')
      return
    }
    if (date > todayStr) {
      setErrorMsg('Future dates cannot be selected for attendance request.')
      return
    }
    if (date < minDateStr) {
      setErrorMsg(`Requests are restricted to the last ${POLICY_MAX_DAYS_AGO} days.`)
      return
    }
    if (!duration.isValid) {
      setErrorMsg(duration.text)
      return
    }
    if (reason.trim().length < 10) {
      setErrorMsg('Please provide a reason with at least 10 characters.')
      return
    }

    setSubmitting(true)

    try {
      const payload: CreateAttendanceRequestInput = {
        date,
        type,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        reason: reason.trim(),
      }

      await createAttendanceRequest(payload)
      toast.success('Request sent to Admin, HR & Super Admin', {
        icon: '✅',
        duration: 4000,
      })
      onSuccess()
      onClose()
    } catch (err) {
      const apiErr = err as ApiError
      setErrorMsg(apiErr.message || 'Failed to submit attendance request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Clean Summary Rows
  const SummaryDetails = () => (
    <div className="space-y-3 text-[12px] min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#657d6e] dark:text-[#8ba293]">Applicant</span>
        <span className="font-semibold text-[#14261c] dark:text-[#edf5ef] truncate text-right">
          {currentUser?.fullName || 'Current Employee'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[#657d6e] dark:text-[#8ba293]">Date</span>
        <span className="font-semibold text-[#14261c] dark:text-[#edf5ef] text-right truncate">
          {getFormattedDate(date) || date}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[#657d6e] dark:text-[#8ba293]">Request Type</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef7ea] dark:bg-[#1a3325] text-[#193c33] dark:text-[#d9ed74] border border-[#cfdfcb] dark:border-[#284232]">
          {selectedCategory.title}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[#657d6e] dark:text-[#8ba293]">Hours</span>
        <span className="font-mono text-[11.5px] text-[#14261c] dark:text-[#edf5ef] text-right truncate">
          {formatTime12h(checkInTime)} → {formatTime12h(checkOutTime)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[#657d6e] dark:text-[#8ba293]">Duration</span>
        <span className="font-bold text-[#10b981] dark:text-[#34d399] text-right">
          {duration.isValid ? `${duration.totalHours} hrs (${duration.text})` : '—'}
        </span>
      </div>

      <div className="pt-2.5 border-t border-[#e2ede2] dark:border-[#213527] text-[11px] text-[#557361] dark:text-[#91a89b] leading-relaxed">
        <p className="m-0 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 text-[#10b981] mt-0.5" />
          <span>Updates attendance upon approval. Routed to Admin, HR & Super Admin.</span>
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="attendance-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-[4px] p-0 sm:p-4 overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
        tabIndex={-1}
        className="attendance-modal-shell bg-white dark:bg-[#111c16] text-[#20251f] dark:text-[#edf5ee] w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-[18px] rounded-none sm:w-[min(680px,94vw)] lg:w-[min(900px,92vw)] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.5)] border-0 sm:border border-[#d3ded5] dark:border-[#223528] overflow-hidden box-border focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className="h-[4px] w-full bg-gradient-to-r from-[#193c33] via-[#2f6354] to-[#d9ed74] shrink-0" />

        {/* Modal Header */}
        <header className="attendance-modal-header sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b border-[#edf2ec] dark:border-[#1d2d23] bg-white dark:bg-[#111c16] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[42px] h-[42px] rounded-[12px] bg-[#f0f6ec] dark:bg-[#192720] border border-[#cfdfc8] dark:border-[#283e30] text-[#193c33] dark:text-[#d9ed74] flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#617c6b] dark:text-[#8ea495] leading-tight">
                Workforce Management • Regularization
              </div>
              <h2
                id="attendance-modal-title"
                className="text-[18px] sm:text-[20px] font-semibold text-[#112319] dark:text-[#f2f7f3] m-0 mt-0.5 leading-snug"
              >
                Submit Attendance Request
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3f7f2] dark:bg-[#17251d] border border-[#d8e4da] dark:border-[#25392d] text-[11px] font-bold text-[#4e6a59] dark:text-[#90a89a]">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shrink-0" />
              <span>Live Approval</span>
            </div>
            <button
              className="w-9 h-9 min-h-[38px] min-w-[38px] rounded-[9px] flex items-center justify-center bg-[#f4f7f4] dark:bg-[#192720] border border-[#d8e4da] dark:border-[#263a2e] text-[#6d8476] dark:text-[#91a698] hover:text-[#193c33] dark:hover:text-[#d9ed74] hover:bg-[#e6efe5] dark:hover:bg-[#203227] cursor-pointer transition-colors"
              type="button"
              onClick={handleSafeClose}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Modal Scrollable Body */}
        <div className="attendance-modal-body flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 space-y-5 box-border min-w-0">
          {/* Error Message */}
          {errorMsg && (
            <div
              className="flex items-start gap-3 p-3.5 bg-[#fef2f2] dark:bg-[#2d1414] border border-[#fecaca] dark:border-[#602020] rounded-[10px] text-[#991b1b] dark:text-[#fca5a5] text-[12px]"
              role="alert"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="m-0 leading-relaxed font-medium">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-[#991b1b] dark:text-[#fca5a5] cursor-pointer border-0 bg-transparent p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* SECTION 1: Category Selection (4 Clean Cards) */}
          <section className="space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-bold text-[#1a3325] dark:text-[#dfebdf] tracking-wide uppercase">
                1. Regularization Category <span className="text-[#dc2626]">*</span>
              </label>
              <span className="text-[11px] text-[#66806f] dark:text-[#8ba292]">
                Selected: <strong className="text-[#193c33] dark:text-[#d9ed74]">{selectedCategory.title}</strong>
              </span>
            </div>

            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0"
              role="radiogroup"
              aria-label="Regularization Category"
            >
              {CATEGORIES.map((cat) => {
                const isSelected = type === cat.id
                const Icon = cat.icon
                return (
                  <div
                    key={cat.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onKeyDown={(e) => handleCategoryKeyDown(e, cat.id)}
                    onClick={() => setType(cat.id)}
                    className={`relative flex flex-col justify-between p-3 rounded-[12px] border cursor-pointer transition-all duration-150 min-w-0 select-none ${
                      isSelected
                        ? 'border-[#193c33] dark:border-[#d9ed74] bg-[#f4f9f2] dark:bg-[#16271e] ring-2 ring-[#193c33]/15 dark:ring-[#d9ed74]/20 shadow-xs'
                        : 'border-[#dfe8e0] dark:border-[#203326] bg-white dark:bg-[#131f18] hover:border-[#b4c8bb] dark:hover:border-[#314a39] hover:bg-[#fafcf9]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#193c33] text-[#d9ed74] dark:bg-[#d9ed74] dark:text-[#111c16]'
                              : 'bg-[#f0f5ef] dark:bg-[#1b2b21] text-[#4d6a58] dark:text-[#8ba293]'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#111c16] flex items-center justify-center shadow-xs shrink-0">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-[#cfded1] dark:border-[#2c4033] shrink-0" />
                        )}
                      </div>

                      <h4 className="text-[12.5px] font-bold text-[#14261c] dark:text-[#edf5ef] m-0 leading-tight">
                        {cat.title}
                      </h4>
                      <p className="text-[9.5px] font-semibold text-[#688171] dark:text-[#849c8d] m-0 mt-0.5">
                        {cat.subtitle}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#eef3ee] dark:border-[#1d2d22]">
                      <p className="text-[10.5px] text-[#556e5f] dark:text-[#9bb0a3] m-0 leading-snug line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Form Columns: 2 Columns on Desktop, Single Column on Mobile/Tablet */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6 min-w-0">
            {/* Left Column (Inputs) */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* SECTION 2: Attendance Date */}
              <section className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="attendance-date-field"
                    className="text-[11.5px] font-bold text-[#1a3325] dark:text-[#dfebdf] tracking-wide uppercase"
                  >
                    2. Attendance Date <span className="text-[#dc2626]">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDate(todayStr)}
                      className={`min-h-[30px] px-3 py-1 text-[11px] font-bold rounded-full border transition-colors cursor-pointer ${
                        date === todayStr
                          ? 'bg-[#193c33] text-[#d9ed74] border-[#193c33] dark:bg-[#d9ed74] dark:text-[#111c16]'
                          : 'bg-[#f4f8f4] dark:bg-[#18271e] text-[#557361] dark:text-[#90a698] border-[#d8e3d9] dark:border-[#25392d]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(yesterdayStr)}
                      className={`min-h-[30px] px-3 py-1 text-[11px] font-bold rounded-full border transition-colors cursor-pointer ${
                        date === yesterdayStr
                          ? 'bg-[#193c33] text-[#d9ed74] border-[#193c33] dark:bg-[#d9ed74] dark:text-[#111c16]'
                          : 'bg-[#f4f8f4] dark:bg-[#18271e] text-[#557361] dark:text-[#90a698] border-[#d8e3d9] dark:border-[#25392d]'
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>

                <div className="relative min-w-0">
                  <input
                    id="attendance-date-field"
                    type="date"
                    max={todayStr}
                    min={minDateStr}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full min-h-[40px] px-3.5 py-2 text-[13px] font-semibold rounded-[10px] border border-[#d8e3d9] dark:border-[#25382c] bg-white dark:bg-[#14221b] text-[#14261c] dark:text-[#edf5ef] focus:outline-none focus:ring-2 focus:ring-[#193c33]/20 dark:focus:ring-[#d9ed74]/30 box-border"
                  />
                </div>

                {date && (
                  <div className="flex items-center gap-2 p-2 px-3 rounded-[8px] bg-[#f3f8f3] dark:bg-[#15241c] border border-[#d8e5d8] dark:border-[#203326] text-[11.5px] text-[#2c4e3a] dark:text-[#b4cdbf]">
                    <Calendar size={13} className="text-[#10b981] shrink-0" />
                    <span className="font-semibold">{getFormattedDate(date)}</span>
                  </div>
                )}
              </section>

              {/* SECTION 3: Working Hours */}
              <section className="space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11.5px] font-bold text-[#1a3325] dark:text-[#dfebdf] tracking-wide uppercase">
                    3. Working Hours & Timing <span className="text-[#dc2626]">*</span>
                  </label>
                  {duration.isValid && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#eef7ee] dark:bg-[#18291f] text-[#059669] dark:text-[#34d399] border border-[#d0e2d1] dark:border-[#253d2e]">
                      {duration.text}
                    </span>
                  )}
                </div>

                {/* Shift presets */}
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Shift presets">
                  {SHIFT_PRESETS.map((preset) => {
                    const isCurrent = activePreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`min-h-[34px] px-3 py-1 rounded-[8px] text-[11.5px] font-semibold border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#193c33] text-[#d9ed74] border-[#193c33] dark:bg-[#d9ed74] dark:text-[#111c16]'
                            : 'bg-[#f6f9f6] dark:bg-[#17261d] text-[#4d6a59] dark:text-[#8ea596] border-[#dce5dc] dark:border-[#23372a] hover:bg-[#ebf2ea]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>

                {/* Check-In and Check-Out inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <label
                      htmlFor="check-in-time-input"
                      className="text-[11px] font-semibold text-[#557361] dark:text-[#88a393] uppercase tracking-wider block"
                    >
                      Check-In Time <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      id="check-in-time-input"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => handleTimeChange('in', e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 py-1.5 text-[13px] font-semibold rounded-[9px] border border-[#d8e3d9] dark:border-[#25382c] bg-white dark:bg-[#14221b] text-[#14261c] dark:text-[#edf5ef] focus:outline-none focus:ring-2 focus:ring-[#193c33]/20 dark:focus:ring-[#d9ed74]/30 box-border"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <label
                      htmlFor="check-out-time-input"
                      className="text-[11px] font-semibold text-[#557361] dark:text-[#88a393] uppercase tracking-wider block"
                    >
                      Check-Out Time <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      id="check-out-time-input"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => handleTimeChange('out', e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 py-1.5 text-[13px] font-semibold rounded-[9px] border border-[#d8e3d9] dark:border-[#25382c] bg-white dark:bg-[#14221b] text-[#14261c] dark:text-[#edf5ef] focus:outline-none focus:ring-2 focus:ring-[#193c33]/20 dark:focus:ring-[#d9ed74]/30 box-border"
                    />
                  </div>
                </div>

                {!duration.isValid && checkInTime && checkOutTime && (
                  <p className="text-[11px] font-semibold text-[#dc2626] m-0">
                    Check-out time must be after check-in time.
                  </p>
                )}
              </section>

              {/* SECTION 4: Reason */}
              <section className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="regularization-reason-input"
                    className="text-[11.5px] font-bold text-[#1a3325] dark:text-[#dfebdf] tracking-wide uppercase"
                  >
                    4. Reason for Request <span className="text-[#dc2626]">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      reason.length >= 300
                        ? 'text-[#dc2626] font-bold'
                        : reason.length >= 10
                        ? 'text-[#059669] dark:text-[#34d399]'
                        : 'text-[#6e8a79] dark:text-[#8ea596]'
                    }`}
                  >
                    {reason.length}/300
                  </span>
                </div>

                <div className="relative min-w-0">
                  <textarea
                    id="regularization-reason-input"
                    rows={3}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly explain the reason for this attendance regularization (min 10 characters)..."
                    required
                    className="w-full p-3 text-[13px] rounded-[10px] border border-[#d8e3d9] dark:border-[#25382c] bg-white dark:bg-[#14221b] text-[#14261c] dark:text-[#edf5ef] focus:outline-none focus:ring-2 focus:ring-[#193c33]/20 dark:focus:ring-[#d9ed74]/30 resize-none box-border leading-relaxed"
                  />
                </div>

                {reason.length > 0 && reason.length < 10 && (
                  <p className="text-[11px] text-[#d97706] font-medium m-0">
                    Please enter at least {10 - reason.length} more character(s).
                  </p>
                )}
              </section>

              {/* Tablet/Mobile Summary (Single Column) */}
              <div className="block lg:hidden pt-1">
                <div className="rounded-[12px] border border-[#d8e4da] dark:border-[#223528] bg-[#f8faf8] dark:bg-[#15231b] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
                    className="w-full flex items-center justify-between p-3 text-left bg-transparent border-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#10b981]" />
                      <span className="text-[12px] font-bold text-[#1a3325] dark:text-[#dfebdf] uppercase tracking-wider">
                        Request Summary
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#059669] dark:text-[#34d399]">
                        {duration.text}
                      </span>
                    </div>
                    <div className="text-[#557361] dark:text-[#8ea596]">
                      {mobileSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {mobileSummaryOpen && (
                    <div className="p-3.5 pt-0 border-t border-[#e8efe8] dark:border-[#1d2d23]">
                      <SummaryDetails />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Sticky Summary (300px) */}
            <aside className="hidden lg:block w-[300px] shrink-0 sticky top-0 self-start">
              <div className="rounded-[14px] border border-[#d8e4da] dark:border-[#223528] bg-[#f8faf8] dark:bg-[#15231b] p-4.5 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#e5ebe2] dark:border-[#1e2f24]">
                  <CheckCircle2 size={15} className="text-[#10b981]" />
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#1a3325] dark:text-[#dfebdf]">
                    Request Summary
                  </span>
                </div>
                <SummaryDetails />
              </div>
            </aside>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <footer className="attendance-modal-footer sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-[#edf2ec] dark:border-[#1d2d23] bg-[#fafcfa] dark:bg-[#132018] shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[#637d6e] dark:text-[#8ea596]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
            <span>First approver decides (Admin / HR / Super Admin).</span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleSafeClose}
              disabled={submitting}
              className="min-h-[40px] px-4 py-2 rounded-[9px] text-[13px] font-semibold text-[#486353] dark:text-[#a0b8aa] hover:bg-[#ecf3ec] dark:hover:bg-[#1a2c21] border border-[#d5e0d6] dark:border-[#25392d] bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className={`min-h-[40px] px-5 py-2 rounded-[9px] text-[13px] font-bold border-0 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs select-none ${
                isFormValid && !submitting
                  ? 'bg-[#193c33] hover:bg-[#235346] text-[#d9ed74] dark:bg-[#d9ed74] dark:text-[#111c16] dark:hover:bg-[#e4f58c] active:scale-[0.98]'
                  : 'bg-[#d8e3da] text-[#7d9485] dark:bg-[#1d2e24] dark:text-[#526b5c] cursor-not-allowed opacity-60'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
