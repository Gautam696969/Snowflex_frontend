import { useState, type FormEvent } from 'react'
import {
  X, AlertCircle, Clock, CheckCircle2,
  FileText, Briefcase, Home, Check
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  createAttendanceRequest,
  type CreateAttendanceRequestInput,
  type ApiError,
} from '../lib/attendance-request-api'

interface RequestAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ATTENDANCE_TYPES = [
  {
    id: 'MISSED_PUNCH',
    label: 'Missed Punch',
    description: 'Forgot to check in or check out on time',
    icon: Clock,
  },
  {
    id: 'WORK_FROM_HOME',
    label: 'Work From Home',
    description: 'Remote work day approved by supervisor',
    icon: Home,
  },
  {
    id: 'ON_DUTY',
    label: 'On-Duty',
    description: 'Off-site client visit, training, or conference',
    icon: Briefcase,
  },
  {
    id: 'CORRECTION',
    label: 'Time Correction',
    description: 'Correct inaccurate punch timestamps',
    icon: FileText,
  },
]

export default function RequestAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestAttendanceModalProps) {
  const todayStr = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState<string>(todayStr)
  const [type, setType] = useState<string>('MISSED_PUNCH')
  const [checkInTime, setCheckInTime] = useState<string>('09:00')
  const [checkOutTime, setCheckOutTime] = useState<string>('18:00')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!date) {
      setErrorMsg('Please select an attendance date.')
      return
    }

    if (!reason.trim()) {
      setErrorMsg('Please provide a reason explaining your attendance request.')
      return
    }

    if (reason.trim().length < 5) {
      setErrorMsg('Reason must be at least 5 characters long.')
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
      toast.success('Attendance request submitted! Reviewers notified.', {
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

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-[16px] z-[9999]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal attendance-modal-container bg-white dark:bg-[#19231e] rounded-[16px] border border-[#dce2d7] dark:border-[#27372e] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[580px] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex items-center justify-between px-[24px] py-[20px] border-b border-[#edf1eb] dark:border-[#25352c]">
          <div className="modal-header-left flex items-center gap-[14px]">
            <div className="icon-badge w-[42px] h-[42px] rounded-[10px] bg-[#f2f7ec] dark:bg-[#202d26] border border-[#d9ed74] dark:border-[#334b2a] text-[#193c33] dark:text-[#d9ed74] flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="modal-kicker flex items-center gap-[6px] text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#708477] dark:text-[#8c9d92]">
                <span>PEOPLE OPERATIONS</span>
                <span className="kicker-dot">•</span>
                <span>ATTENDANCE REQUEST</span>
              </div>
              <h2 className="modal-title text-[20px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] m-0 mt-[2px]">
                Request Attendance
              </h2>
            </div>
          </div>
          <button
            className="modal-close-btn bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] rounded-[6px]"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body p-[24px] flex flex-col gap-[20px]">
          {errorMsg && (
            <div
              className="error-alert flex gap-[12px] p-[12px_16px] bg-[#fef2f2] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] rounded-[10px] text-[#991b1b] dark:text-[#fca5a5]"
              role="alert"
            >
              <AlertCircle size={18} className="shrink-0 mt-[2px]" />
              <div>
                <strong className="block text-[13px] font-bold">Error</strong>
                <p className="m-0 text-[12px] mt-[2px]">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Section: Type Picker */}
          <div className="form-section flex flex-col gap-[8px]">
            <label className="field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
              Request Type <span className="text-[#dc2626]">*</span>
            </label>
            <div className="type-options-grid grid grid-cols-2 max-[520px]:grid-cols-1 gap-[8px]">
              {ATTENDANCE_TYPES.map((item) => {
                const isSelected = type === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`type-radio-btn flex items-start gap-[10px] p-[12px] text-left border rounded-[10px] cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#193c33] dark:border-[#d9ed74] bg-[#f7faf5] dark:bg-[#1e2a22] shadow-[0_2px_8px_rgba(25,60,51,0.06)]'
                        : 'border-[#dce2d7] dark:border-[#2a3c30] bg-white dark:bg-[#141c18] hover:border-[#b4c4af]'
                    }`}
                    onClick={() => setType(item.id)}
                  >
                    <div
                      className={`type-icon-box w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#193c33] text-[#d9ed74]'
                          : 'bg-[#edf2ea] dark:bg-[#202d26] text-[#55695d] dark:text-[#a2b4a7]'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="type-info min-w-0">
                      <strong className="block text-[13px] font-bold text-[#1a2d23] dark:text-[#edf5ef] leading-tight">
                        {item.label}
                      </strong>
                      <span className="block text-[11px] text-[#718478] dark:text-[#8e9f94] mt-[2px] line-clamp-1">
                        {item.description}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-[#193c33] dark:text-[#d9ed74] shrink-0 ml-auto mt-[2px]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Attendance Date */}
          <div className="form-section flex flex-col gap-[6px]">
            <label
              htmlFor="attendance-date-input"
              className="field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]"
            >
              Attendance Date <span className="text-[#dc2626]">*</span>
            </label>
            <div className="relative">
              <input
                id="attendance-date-input"
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-[14px] py-[10px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2b3c31] bg-white dark:bg-[#151d19] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors"
              />
            </div>
            <span className="text-[11px] text-[#718478] dark:text-[#8c9e93]">
              Date for which you are requesting an attendance punch or status adjustment.
            </span>
          </div>

          {/* Section: Check-In & Check-Out Times */}
          <div className="grid grid-cols-2 max-[500px]:grid-cols-1 gap-[14px]">
            <div className="form-section flex flex-col gap-[6px]">
              <label
                htmlFor="check-in-time-input"
                className="field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]"
              >
                Check-In Time
              </label>
              <input
                id="check-in-time-input"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-[14px] py-[10px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2b3c31] bg-white dark:bg-[#151d19] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors"
              />
            </div>

            <div className="form-section flex flex-col gap-[6px]">
              <label
                htmlFor="check-out-time-input"
                className="field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]"
              >
                Check-Out Time
              </label>
              <input
                id="check-out-time-input"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-[14px] py-[10px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2b3c31] bg-white dark:bg-[#151d19] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors"
              />
            </div>
          </div>

          {/* Section: Reason */}
          <div className="form-section flex flex-col gap-[6px]">
            <div className="flex items-center justify-between">
              <label
                htmlFor="attendance-reason-input"
                className="field-label text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]"
              >
                Reason for Request <span className="text-[#dc2626]">*</span>
              </label>
              <span className="text-[11px] text-[#788a80] dark:text-[#8e9f95]">
                {reason.length}/2000 chars
              </span>
            </div>
            <textarea
              id="attendance-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you missed punch, worked from home, or need this adjustment..."
              maxLength={2000}
              required
              className="w-full px-[14px] py-[10px] text-[13px] rounded-[8px] border border-[#dce2d7] dark:border-[#2b3c31] bg-white dark:bg-[#151d19] text-[#193c33] dark:text-[#edf5ef] placeholder-[#94a59a] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors resize-none"
            />
          </div>

          {/* Informational Banner */}
          <div className="info-banner p-[12px_14px] rounded-[10px] bg-[#f2f7ec] dark:bg-[#1d2922] border border-[#d9e6d0] dark:border-[#2e4033] flex items-center gap-[10px] text-[12px] text-[#28483b] dark:text-[#cde0d2]">
            <CheckCircle2 size={16} className="text-[#10b981] shrink-0" />
            <span>
              Your request will be immediately dispatched in real time to all administrators and HR reviewers.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer flex items-center justify-end gap-[10px] pt-[12px] border-t border-[#edf1eb] dark:border-[#25352c]">
            <button
              type="button"
              className="px-[16px] py-[9px] rounded-[7px] text-[13px] font-semibold border border-[#dce3d8] dark:border-[#314237] bg-white dark:bg-[#1e2a22] text-[#4d6356] dark:text-[#c4d4c8] hover:bg-[#f2f6ee] dark:hover:bg-[#25352b] transition-colors cursor-pointer"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-[8px] px-[20px] py-[9px] rounded-[7px] text-[13px] font-bold border-0 bg-[#193c33] hover:bg-[#265648] text-[#d9ed74] shadow-[0_2px_8px_rgba(25,60,51,0.2)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-[#d9ed74] rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Submit Attendance Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
