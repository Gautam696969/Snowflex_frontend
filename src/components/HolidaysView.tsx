import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  Calendar, CalendarDays, List, Plus, Search, RefreshCw,
  Edit, Trash2, X, Sparkles, AlertTriangle, Repeat,
  ChevronLeft, ChevronRight, Info, Check, Filter
} from 'lucide-react'
import {
  fetchHolidays, createHoliday, updateHoliday, deleteHoliday
} from '../lib/holiday-api'
import type {
  Holiday, HolidayType, CreateHolidayPayload, UpdateHolidayPayload
} from '../lib/holiday-api'
import { useChat } from '../context/ChatContext'

interface HolidaysViewProps {
  userRole: string
  token?: string
}

const PRESET_COLORS = [
  '#ed6b4f', // Brand Coral
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#64748b', // Slate
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysRemaining(targetDateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${targetDateStr}T00:00:00`)
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Passed'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `in ${diffDays} days`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function HolidaysView({ userRole }: HolidaysViewProps) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12
  const todayIso = new Date().toISOString().split('T')[0]

  const normalizedRole = userRole.toUpperCase().replace(/[\s-]+/g, '_')
  const canManage = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN' || normalizedRole === 'HR'
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'

  // View state
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonth)
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Data state
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    holidayDate: '',
    endDate: '',
    type: 'PUBLIC' as HolidayType,
    color: '#ed6b4f',
    isRecurring: false,
  })

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [hardDelete, setHardDelete] = useState(false)

  // Details popup for calendar click
  const [selectedDayHolidays, setSelectedDayHolidays] = useState<{ date: string; items: Holiday[] } | null>(null)

  const { socket } = useChat()

  const loadHolidays = useCallback(async () => {
    try {
      setError('')
      const params: Parameters<typeof fetchHolidays>[0] = {
        year: selectedYear,
        status: 'ACTIVE',
      }
      if (selectedMonth !== 'ALL') params.month = selectedMonth
      if (selectedType !== 'ALL') params.type = selectedType
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const data = await fetchHolidays(params)
      setHolidays(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load holidays'
      setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedYear, selectedMonth, selectedType, searchQuery])

  useEffect(() => {
    setLoading(true)
    void loadHolidays()
  }, [loadHolidays])

  // Real-time synchronization
  useEffect(() => {
    if (socket) {
      socket.on('holiday:changed', () => {
        void loadHolidays()
      })
    }

    const handleLocalUpdate = () => void loadHolidays()
    window.addEventListener('holidays-updated', handleLocalUpdate)

    return () => {
      if (socket) {
        socket.off('holiday:changed')
      }
      window.removeEventListener('holidays-updated', handleLocalUpdate)
    }
  }, [socket, loadHolidays])

  // Identify next upcoming holiday
  const nextUpcomingId = useMemo(() => {
    const upcoming = holidays
      .filter((h) => h.endDate >= todayIso || h.holidayDate >= todayIso)
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    return upcoming[0]?.id
  }, [holidays, todayIso])

  // Calendar calculations
  const calendarDays = useMemo(() => {
    if (selectedMonth === 'ALL') return []

    const year = selectedYear
    const month = selectedMonth - 1 // 0-11
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Monday is index 0 in ISO week (Sun is 6, Mon is 0)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const totalDaysInMonth = lastDay.getDate()
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; holidays: Holiday[] }[] = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const prevDate = new Date(year, month - 1, d)
      const dateStr = prevDate.toISOString().split('T')[0]
      days.push({ dateStr, dayNum: d, isCurrentMonth: false, holidays: [] })
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      const dateStr = `${year}-${mStr}-${dStr}`

      // Match holidays that span over this day
      const dayHolidays = holidays.filter((h) => {
        const start = h.holidayDate
        const end = h.endDate || h.holidayDate
        return dateStr >= start && dateStr <= end
      })

      days.push({ dateStr, dayNum: d, isCurrentMonth: true, holidays: dayHolidays })
    }

    // Next month padding to fill out 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i)
      const dateStr = nextDate.toISOString().split('T')[0]
      days.push({ dateStr, dayNum: i, isCurrentMonth: false, holidays: [] })
    }

    return days
  }, [selectedYear, selectedMonth, holidays])

  // Open modal for Create
  function handleOpenCreate(defaultDate?: string) {
    setEditingHoliday(null)
    setFormErrors({})
    const initialDate = defaultDate || todayIso
    setFormData({
      name: '',
      description: '',
      holidayDate: initialDate,
      endDate: initialDate,
      type: 'PUBLIC',
      color: '#ed6b4f',
      isRecurring: false,
    })
    setShowModal(true)
  }

  // Open modal for Edit
  function handleOpenEdit(holiday: Holiday) {
    setEditingHoliday(holiday)
    setFormErrors({})
    setFormData({
      name: holiday.name,
      description: holiday.description || '',
      holidayDate: holiday.holidayDate,
      endDate: holiday.endDate || holiday.holidayDate,
      type: holiday.type,
      color: holiday.color || '#ed6b4f',
      isRecurring: holiday.isRecurring,
    })
    setShowModal(true)
    setSelectedDayHolidays(null)
  }

  // Validate form before save
  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.'
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Name cannot exceed 100 characters.'
    }

    if (!formData.holidayDate) {
      errors.holidayDate = 'Holiday date is required.'
    }

    if (formData.endDate && formData.endDate < formData.holidayDate) {
      errors.endDate = 'End date cannot be earlier than holiday date.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Save
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || saving) return

    setSaving(true)
    try {
      if (editingHoliday) {
        const payload: UpdateHolidayPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          holidayDate: formData.holidayDate,
          endDate: formData.endDate || formData.holidayDate,
          type: formData.type,
          color: formData.color,
          isRecurring: formData.isRecurring,
        }
        await updateHoliday(editingHoliday.id, payload)
        toast.success(`Holiday "${formData.name}" updated successfully`)
      } else {
        const payload: CreateHolidayPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          holidayDate: formData.holidayDate,
          endDate: formData.endDate || formData.holidayDate,
          type: formData.type,
          color: formData.color,
          isRecurring: formData.isRecurring,
        }
        await createHoliday(payload)
        toast.success(`Holiday "${formData.name}" added successfully`)
      }

      setShowModal(false)
      window.dispatchEvent(new CustomEvent('holidays-updated'))
      void loadHolidays()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save holiday'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteHoliday(deleteTarget.id, hardDelete)
      toast.success(
        hardDelete
          ? `Holiday "${deleteTarget.name}" deleted permanently`
          : `Holiday "${deleteTarget.name}" cancelled`
      )
      setDeleteTarget(null)
      setSelectedDayHolidays(null)
      window.dispatchEvent(new CustomEvent('holidays-updated'))
      void loadHolidays()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete holiday'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  // Month navigation in calendar mode
  function handlePrevMonth() {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => (m as number) - 1)
    }
  }

  function handleNextMonth() {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => (m as number) + 1)
    }
  }

  function handleJumpToday() {
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonth)
  }

  return (
    <div className="holidays-view-root flex flex-col gap-[20px]">
      {/* Top Header & Action Bar */}
      <header className="holidays-header flex items-center justify-between gap-[16px] flex-wrap pb-[16px] border-b border-[#edf1eb] dark:border-[#25352c]">
        <div className="holidays-title-area">
          <div className="holidays-title-row flex items-center gap-[14px]">
            <div className="holidays-icon-badge w-[44px] h-[44px] rounded-[10px] bg-[#fff5f2] dark:bg-[#2b1f1a] border border-[#fcd8d0] dark:border-[#542d22] text-[#ed6b4f] flex items-center justify-center shrink-0">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] m-0">Holidays & Observances</h1>
              <p className="text-[13px] text-[#65776d] dark:text-[#8c9d92] m-0 mt-[2px]">Organization calendar schedule, public holidays, and official breaks.</p>
            </div>
          </div>
        </div>

        <div className="holidays-top-actions flex items-center gap-[10px] flex-wrap">
          {/* View mode toggle */}
          <div className="view-toggle-group inline-flex p-[3px] bg-[#edf1eb] dark:bg-[#1c2520] border border-[#dce2d7] dark:border-[#303b34] rounded-[8px]">
            <button
              type="button"
              className={`view-toggle-btn inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-bold rounded-[6px] cursor-pointer transition-all border-0 ${
                viewMode === 'calendar'
                  ? 'active bg-white dark:bg-[#27362e] text-[#14241d] dark:text-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
                  : 'text-[#55675c] dark:text-[#8c9d92] bg-transparent hover:text-[#14241d] dark:hover:text-white'
              }`}
              onClick={() => {
                setViewMode('calendar')
                if (selectedMonth === 'ALL') setSelectedMonth(currentMonth)
              }}
              title="Calendar grid view"
              aria-label="Calendar view"
            >
              <Calendar size={16} />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-bold rounded-[6px] cursor-pointer transition-all border-0 ${
                viewMode === 'list'
                  ? 'active bg-white dark:bg-[#27362e] text-[#14241d] dark:text-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
                  : 'text-[#55675c] dark:text-[#8c9d92] bg-transparent hover:text-[#14241d] dark:hover:text-white'
              }`}
              onClick={() => setViewMode('list')}
              title="List agenda view"
              aria-label="List view"
            >
              <List size={16} />
              <span>List</span>
            </button>
          </div>

          <button
            type="button"
            className="icon-button p-[8px] rounded-[8px] border border-[#dce2d7] dark:border-[#27372e] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all"
            onClick={() => {
              setRefreshing(true)
              void loadHolidays()
            }}
            title="Refresh holidays"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-slow animate-spin' : ''} />
          </button>

          {canManage && (
            <button
              type="button"
              className="primary-action-btn inline-flex items-center gap-[6px] px-[16px] py-[8px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all border-0"
              onClick={() => handleOpenCreate()}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </header>

      {/* Filter & Selector Toolbar */}
      <section className="holidays-toolbar flex items-center justify-between gap-[14px] flex-wrap px-[16px] py-[12px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[12px]">
        <div className="toolbar-left flex items-center gap-[10px] flex-wrap">
          {/* Year selector */}
          <div className="toolbar-field">
            <label htmlFor="holiday-year-select" className="sr-only">Year</label>
            <select
              id="holiday-year-select"
              className="toolbar-select px-[12px] py-[7px] text-[12px] font-semibold text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month selector */}
          <div className="toolbar-field">
            <label htmlFor="holiday-month-select" className="sr-only">Month</label>
            <select
              id="holiday-month-select"
              className="toolbar-select px-[12px] py-[7px] text-[12px] font-semibold text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            >
              <option value="ALL">All Months</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="toolbar-field">
            <label htmlFor="holiday-type-select" className="sr-only">Holiday Type</label>
            <div className="select-with-icon relative flex items-center">
              <Filter size={14} className="select-prefix-icon absolute left-[10px] text-[#8a9c90] pointer-events-none" />
              <select
                id="holiday-type-select"
                className="toolbar-select with-prefix pl-[30px] pr-[12px] py-[7px] text-[12px] font-semibold text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none cursor-pointer"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="PUBLIC">Public</option>
                <option value="COMPANY">Company</option>
                <option value="OPTIONAL">Optional</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </div>
          </div>
        </div>

        <div className="toolbar-right flex items-center gap-[10px]">
          {/* Search box */}
          <div className="search-input-wrap relative flex items-center">
            <Search size={15} className="search-icon absolute left-[10px] text-[#8a9c90] pointer-events-none" />
            <input
              type="text"
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input pl-[34px] pr-[30px] py-[7px] text-[12px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none w-[200px] focus:w-[260px] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn absolute right-[8px] text-[#8a9c90] hover:text-[#193c33] cursor-pointer border-0 bg-transparent p-0"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Month Navigation for Calendar view */}
      {viewMode === 'calendar' && selectedMonth !== 'ALL' && (
        <div className="calendar-nav-bar flex items-center justify-between gap-[16px] flex-wrap px-[18px] py-[14px] bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#27372e] rounded-[12px]">
          <div className="calendar-month-heading">
            <h2 className="text-[18px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] m-0">{MONTH_NAMES[(selectedMonth as number) - 1]} {selectedYear}</h2>
            <span className="month-badge-count text-[11px] font-semibold text-[#708477] dark:text-[#8c9d92]">
              {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'} this month
            </span>
          </div>

          <div className="calendar-nav-buttons flex items-center gap-[8px]">
            <button
              type="button"
              className="calendar-nav-btn inline-flex items-center gap-[4px] px-[12px] py-[6px] text-[12px] font-bold rounded-[8px] border border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all"
              onClick={handlePrevMonth}
              title="Previous month"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              type="button"
              className="calendar-today-btn px-[14px] py-[6px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all border-0"
              onClick={handleJumpToday}
            >
              Today
            </button>
            <button
              type="button"
              className="calendar-nav-btn inline-flex items-center gap-[4px] px-[12px] py-[6px] text-[12px] font-bold rounded-[8px] border border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all"
              onClick={handleNextMonth}
              title="Next month"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="holidays-error-banner flex items-center gap-[8px] p-[12px_16px] bg-[#fff5f5] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] text-[#dc2626] dark:text-[#f87171] rounded-[10px] text-[13px]" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void loadHolidays()} className="text-link text-[12px] font-bold text-[#dc2626] dark:text-[#f87171] underline ml-[auto] cursor-pointer bg-transparent border-0">
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="holidays-loading-state">
          <div className="skeleton-line w-full bg-[#f0f4ee] dark:bg-[#233129] animate-pulse rounded-[12px] h-[300px]" />
        </div>
      ) : holidays.length === 0 && viewMode === 'list' ? (
        <div className="holidays-empty-card flex flex-col items-center justify-center text-center p-[56px_24px] bg-white dark:bg-[#1c2520] border border-[#e2e8df] dark:border-[#303b34] rounded-[14px]">
          <div className="empty-icon-box grid w-[64px] h-[64px] place-items-center rounded-[16px] bg-[#f3f6f0] dark:bg-[#27362e] text-[#517154] dark:text-[#a4b2a8] mb-[16px]">
            <Calendar size={36} />
          </div>
          <h3 className="m-0 text-[18px] font-bold text-[#193c33] dark:text-[#edf5ef]">No holidays added yet</h3>
          <p className="max-w-[440px] mt-[8px] mb-0 text-[14px] text-[#517154] dark:text-[#a4b2a8] leading-[1.5]">
            {searchQuery || selectedType !== 'ALL' || selectedMonth !== 'ALL'
              ? 'No holidays match your current filter settings. Try adjusting the search or filters.'
              : `There are currently no holidays scheduled for ${selectedYear}.`}
          </p>
          {canManage && (
            <button
              type="button"
              className="primary-action-btn inline-flex items-center gap-[8px] p-[10px_18px] rounded-[10px] bg-[#193c33] text-[#d9ed74] font-semibold text-[13px] hover:bg-[#142e27] transition-colors cursor-pointer border-0 mt-[16px]"
              onClick={() => handleOpenCreate()}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="calendar-grid-container bg-white dark:bg-[#1c2520] border border-[#e2e8df] dark:border-[#303b34] rounded-[14px] overflow-hidden shadow-[0_4px_16px_-2px_rgba(25,60,51,0.03)]">
          {selectedMonth === 'ALL' ? (
            <div className="calendar-all-months-notice flex items-center gap-[10px] p-[24px] text-[#517154] dark:text-[#a4b2a8] text-[14px]">
              <Info size={16} />
              <span>Please select a specific month to display the month grid, or switch to List view to see the full year agenda.</span>
            </div>
          ) : (
            <div className="calendar-table w-full flex flex-col" role="grid">
              {/* Day headers */}
              <div className="calendar-header-row grid grid-cols-7 bg-[#f8faf6] dark:bg-[#18211b] border-b border-[#e2e8df] dark:border-[#303b34]" role="row">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="calendar-col-header p-[10px_8px] text-center text-[12px] font-bold uppercase tracking-[0.04em] text-[#517154] dark:text-[#a4b2a8]" role="columnheader">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="calendar-body-grid grid grid-cols-7">
                {calendarDays.map(({ dateStr, dayNum, isCurrentMonth, holidays: dayHolidays }) => {
                  const isToday = dateStr === todayIso
                  const hasHolidays = dayHolidays.length > 0

                  return (
                    <div
                      key={dateStr}
                      className={`calendar-day-cell min-h-[72px] md:min-h-[108px] p-[4px] md:p-[8px] border-r border-b border-[#edf1eb] dark:border-[#27352d] [&:nth-child(7n)]:border-r-0 flex flex-col gap-[4px] transition-colors duration-150 cursor-pointer ${
                        !isCurrentMonth
                          ? 'is-outside-month bg-[#fafbf9] dark:bg-[#141a17] opacity-55 cursor-default'
                          : isToday
                            ? 'is-today bg-[rgba(237,107,79,0.03)] dark:bg-[rgba(239,128,104,0.08)] hover:bg-[#fbfdf9] dark:hover:bg-[#232f27]'
                            : 'bg-white dark:bg-[#1c2520] hover:bg-[#fbfdf9] dark:hover:bg-[#232f27]'
                      }${hasHolidays ? ' has-holiday' : ''}`}
                      onClick={() => {
                        if (hasHolidays) {
                          setSelectedDayHolidays({ date: dateStr, items: dayHolidays })
                        } else if (canManage && isCurrentMonth) {
                          handleOpenCreate(dateStr)
                        }
                      }}
                      role="gridcell"
                      tabIndex={0}
                    >
                      <div className="day-cell-header flex items-center justify-between">
                        <span className={`day-number inline-grid w-[24px] h-[24px] place-items-center text-[12px] rounded-full ${
                          isToday
                            ? 'today-pill bg-[#ed6b4f] text-white font-bold'
                            : 'font-semibold text-[#193c33] dark:text-[#edf5ef]'
                        }`}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="today-label text-[9px] font-bold px-[5px] py-[1px] rounded-[4px] bg-[rgba(237,107,79,0.15)] text-[#c94a2f] dark:text-[#f87171] tracking-[0.02em]">
                            TODAY
                          </span>
                        )}
                      </div>

                      <div className="day-holidays-container flex flex-col gap-[3px] overflow-y-auto max-h-[74px]">
                        {dayHolidays.map((h) => {
                          const isNext = h.id === nextUpcomingId
                          const chipColor = h.color || '#ed6b4f'

                          return (
                            <div
                              key={h.id}
                              className={`calendar-holiday-chip${isNext ? ' is-next-chip ring-1 ring-[#ed6b4f]' : ''} flex items-center justify-between gap-[4px] px-[6px] py-[3px] rounded-[4px] border-l-[3px] text-[11px] font-semibold leading-[1.25] cursor-pointer hover:translate-x-[1px] hover:opacity-90 transition-all duration-120 whitespace-nowrap overflow-hidden text-ellipsis`}
                              style={{
                                backgroundColor: `${chipColor}20`,
                                borderLeftColor: chipColor,
                                color: chipColor,
                              }}
                              title={`${h.name} (${h.type})`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDayHolidays({ date: dateStr, items: dayHolidays })
                              }}
                            >
                              <span className="chip-name overflow-hidden text-ellipsis text-[10px] md:text-[11px]">{h.name}</span>
                              {h.isRecurring && <Repeat size={10} className="chip-recurring-icon shrink-0 opacity-80" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="holidays-list-container w-full">
          <div className="holidays-list-grid grid gap-[14px]">
            {holidays.map((h) => {
              const remaining = getDaysRemaining(h.holidayDate)
              const isToday = remaining === 'Today'
              const isNext = h.id === nextUpcomingId
              const itemColor = h.color || '#ed6b4f'
              const typePillClass =
                h.type === 'PUBLIC'
                  ? 'bg-[rgba(16,185,129,0.12)] text-[#059669]'
                  : h.type === 'COMPANY'
                  ? 'bg-[rgba(237,107,79,0.12)] text-[#d9543a]'
                  : h.type === 'OPTIONAL'
                  ? 'bg-[rgba(245,158,11,0.12)] text-[#d97706]'
                  : 'bg-[rgba(139,92,246,0.12)] text-[#7c3aed]'

              return (
                <article
                  key={h.id}
                  className={`holiday-card flex flex-col md:flex-row md:items-stretch justify-between p-[16px_20px] rounded-[12px] border border-[#e2e8df] dark:border-[#303b34] border-l-[5px] bg-white dark:bg-[#1c2520] transition-all duration-150 hover:-translate-y-[1px] gap-[12px] md:gap-0 ${
                    isToday
                      ? 'is-today shadow-[0_0_0_2px_rgba(237,107,79,0.28),0_6px_18px_rgba(25,60,51,0.06)]'
                      : isNext
                      ? 'is-next shadow-[0_2px_8px_rgba(25,60,51,0.02)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_18px_rgba(25,60,51,0.06)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                      : 'shadow-[0_2px_8px_rgba(25,60,51,0.02)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_18px_rgba(25,60,51,0.06)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                  }`}
                  style={{ borderLeftColor: itemColor }}
                >
                  <div className="holiday-card-main flex items-center gap-[18px] flex-1">
                    <div className="holiday-date-column shrink-0">
                      <div
                        className="holiday-big-date-badge flex flex-col items-center justify-center w-[62px] h-[64px] rounded-[10px] shrink-0 text-center"
                        style={{ backgroundColor: `${itemColor}15`, color: itemColor }}
                      >
                        <span className="badge-month text-[11px] font-bold tracking-[0.04em] uppercase">
                          {new Date(`${h.holidayDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                        </span>
                        <strong className="badge-day text-[22px] font-extrabold leading-none">
                          {new Date(`${h.holidayDate}T00:00:00`).getDate()}
                        </strong>
                        <span className="badge-year text-[10px] font-medium opacity-80">
                          {new Date(`${h.holidayDate}T00:00:00`).getFullYear()}
                        </span>
                      </div>
                    </div>

                    <div className="holiday-content-column flex flex-col gap-[5px] flex-1">
                      <div className="holiday-card-head flex items-start justify-between gap-[12px]">
                        <div className="title-and-badges flex items-center gap-[10px] flex-wrap">
                          <h3 className="m-0 text-[16px] font-bold text-[#193c33] dark:text-[#edf5ef]">{h.name}</h3>
                          <div className="holiday-card-tags inline-flex items-center gap-[6px]">
                            <span className={`holiday-type-pill inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-bold uppercase tracking-[0.03em] ${typePillClass}`}>
                              {h.type}
                            </span>
                            {h.isRecurring && (
                              <span className="holiday-recurring-pill inline-flex items-center gap-[4px] px-[7px] py-[2px] rounded-full bg-[#f1f4ed] dark:bg-[#27362e] text-[#517154] dark:text-[#c9d6cc] text-[11px] font-semibold" title="Repeats yearly on this date">
                                <Repeat size={12} />
                                <span>Yearly</span>
                              </span>
                            )}
                            {isNext && (
                              <span className="holiday-next-pill inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-[rgba(237,107,79,0.16)] text-[#c94a2f] dark:text-[#f87171] text-[11px] font-bold">
                                <Sparkles size={11} />
                                <span>Next Upcoming</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="holiday-countdown-box">
                          <span className={`countdown-badge inline-flex items-center gap-[4px] px-[9px] py-[3px] rounded-[6px] text-[12px] ${
                            isToday
                              ? 'is-today bg-[#ed6b4f] text-white font-bold'
                              : isNext
                              ? 'is-next bg-[rgba(237,107,79,0.12)] text-[#c94a2f] dark:text-[#f87171] font-bold'
                              : 'bg-[#f2f5ee] dark:bg-[#27362e] text-[#517154] dark:text-[#c9d6cc] font-semibold'
                          }`}>
                            {remaining}
                          </span>
                        </div>
                      </div>

                      <div className="holiday-date-details flex items-center gap-[6px] text-[13px] text-[#517154] dark:text-[#a4b2a8]">
                        <Calendar size={14} className="calendar-detail-icon text-[#517154] dark:text-[#a4b2a8]" />
                        <span>{formatDisplayDate(h.holidayDate)}</span>
                        {h.endDate && h.endDate !== h.holidayDate && (
                          <span className="multi-day-span font-medium">
                            &nbsp;to {formatDisplayDate(h.endDate)} ({h.daysCount} days)
                          </span>
                        )}
                      </div>

                      {h.description && (
                        <p className="holiday-description mt-[4px] mb-0 text-[13px] leading-[1.5] text-[#193c33] dark:text-[#edf5ef] opacity-85">{h.description}</p>
                      )}

                      {h.createdByName && (
                        <div className="holiday-author-footnote mt-[4px] text-[11px] text-[#517154] dark:text-[#a4b2a8]">
                          <span>Added by {h.createdByName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="holiday-card-actions flex items-center justify-end md:justify-start gap-[6px] ml-0 md:ml-[14px] pt-[8px] md:pt-0 border-t md:border-t-0 border-[#edf1eb] dark:border-[#303b34]">
                      <button
                        type="button"
                        className="icon-action-btn edit-btn grid w-[32px] h-[32px] place-items-center border border-[#dfe5dc] dark:border-[#303b34] rounded-[6px] bg-white dark:bg-[#1c2520] text-[#517154] dark:text-[#a4b2a8] hover:bg-[#f7f9f5] dark:hover:bg-[#27362e] hover:text-[#193c33] dark:hover:text-[#edf2ec] transition-all duration-140 cursor-pointer"
                        onClick={() => handleOpenEdit(h)}
                        title="Edit holiday"
                        aria-label={`Edit ${h.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn delete-btn grid w-[32px] h-[32px] place-items-center border border-[#dfe5dc] dark:border-[#303b34] rounded-[6px] bg-white dark:bg-[#1c2520] text-[#517154] dark:text-[#a4b2a8] hover:border-[#fca5a5] hover:bg-[#fef2f2] dark:hover:bg-[#382323] hover:text-[#dc2626] transition-all duration-140 cursor-pointer"
                        onClick={() => {
                          setDeleteTarget(h)
                          setHardDelete(false)
                        }}
                        title="Delete or cancel holiday"
                        aria-label={`Delete ${h.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Day Popup in Calendar View */}
      {selectedDayHolidays && (
        <div className="modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]" onClick={() => setSelectedDayHolidays(null)}>
          <div className="modal-content holiday-day-popup bg-white dark:bg-[#19231e] rounded-[16px] border border-[#e2e8df] dark:border-[#27372e] p-[24px] w-[min(92vw,480px)] max-h-[90vh] overflow-y-auto shadow-2xl animate-[fadeIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between pb-4 border-b border-[#edf1eb] dark:border-[#27372e]">
              <div>
                <span className="dash-kicker text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#517154] dark:text-[#7f9f82]">DAY SCHEDULE</span>
                <h3 className="m-0 text-[18px] font-bold text-[#193c33] dark:text-[#edf5ef]">{formatDisplayDate(selectedDayHolidays.date)}</h3>
              </div>
              <button
                type="button"
                className="icon-button w-8 h-8 rounded-lg flex items-center justify-center text-[#517154] dark:text-[#a4b2a8] hover:bg-[#f0f4ee] dark:hover:bg-[#233129] hover:text-[#193c33] dark:hover:text-[#edf5ef] transition-colors border-0 bg-transparent cursor-pointer"
                onClick={() => setSelectedDayHolidays(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="day-popup-list flex flex-col gap-[10px] max-h-[380px] overflow-y-auto py-[10px]">
              {selectedDayHolidays.items.map((h) => {
                const typePillClass =
                  h.type === 'PUBLIC'
                    ? 'bg-[rgba(16,185,129,0.12)] text-[#059669]'
                    : h.type === 'COMPANY'
                    ? 'bg-[rgba(237,107,79,0.12)] text-[#d9543a]'
                    : h.type === 'OPTIONAL'
                    ? 'bg-[rgba(245,158,11,0.12)] text-[#d97706]'
                    : 'bg-[rgba(139,92,246,0.12)] text-[#7c3aed]'

                return (
                  <div key={h.id} className="day-popup-item p-[12px_14px] rounded-[8px] border border-[#e2e8df] dark:border-[#303b34] border-l-[4px] bg-[#fafbf9] dark:bg-[#141b17] flex flex-col gap-[6px]" style={{ borderLeftColor: h.color || '#ed6b4f' }}>
                    <div className="popup-item-header flex items-center justify-between gap-[10px]">
                      <strong className="text-[14px] font-bold text-[#193c33] dark:text-[#edf5ef]">{h.name}</strong>
                      <span className={`holiday-type-pill inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-bold uppercase tracking-[0.03em] ${typePillClass}`}>
                        {h.type}
                      </span>
                    </div>
                    {h.endDate && h.endDate !== h.holidayDate && (
                      <span className="popup-duration text-[12px] font-medium text-[#517154] dark:text-[#a4b2a8]">
                        Multi-day break: {h.holidayDate} to {h.endDate} ({h.daysCount} days)
                      </span>
                    )}
                    {h.description && <p className="popup-desc m-0 text-[13px] text-[#193c33] dark:text-[#edf5ef] leading-[1.45]">{h.description}</p>}
                    {h.isRecurring && (
                      <div className="popup-recurring flex items-center gap-[5px] text-[11px] text-[#517154] dark:text-[#a4b2a8]">
                        <Repeat size={12} />
                        <span>Repeats yearly</span>
                      </div>
                    )}

                    {canManage && (
                      <div className="popup-item-actions flex items-center gap-[8px] mt-[4px]">
                        <button
                          type="button"
                          className="btn-outline-sm inline-flex items-center gap-[4px] px-[10px] py-[4px] border border-[#dfe5dc] dark:border-[#303b34] rounded-[6px] bg-white dark:bg-[#1c2520] text-[#193c33] dark:text-[#edf2ec] text-[12px] font-semibold cursor-pointer hover:bg-[#f7f9f5] dark:hover:bg-[#27362e]"
                          onClick={() => handleOpenEdit(h)}
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-danger-sm inline-flex items-center gap-[4px] px-[10px] py-[4px] border border-[#fecaca] dark:border-[#7f1d1d] rounded-[6px] bg-[#fef2f2] dark:bg-[#2c1515] text-[#dc2626] dark:text-[#f87171] text-[12px] font-semibold cursor-pointer hover:bg-[#fee2e2] dark:hover:bg-[#381a1a]"
                          onClick={() => {
                            setDeleteTarget(h)
                            setHardDelete(false)
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {canManage && (
              <div className="modal-footer flex items-center justify-end pt-[12px] border-t border-[#edf1eb] dark:border-[#27372e]" style={{ borderTop: '1px solid #edf1eb', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="primary-action-btn inline-flex items-center gap-[8px] p-[10px_18px] rounded-[10px] bg-[#193c33] text-[#d9ed74] font-semibold text-[13px] hover:bg-[#142e27] transition-colors cursor-pointer border-0"
                  onClick={() => {
                    handleOpenCreate(selectedDayHolidays.date)
                    setSelectedDayHolidays(null)
                  }}
                >
                  <Plus size={15} />
                  <span>Add Another Holiday on This Date</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      {showModal && (
        <div className="modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content holiday-modal bg-white dark:bg-[#19231e] rounded-[16px] border border-[#e2e8df] dark:border-[#27372e] p-[24px] w-[min(92vw,540px)] max-h-[90vh] overflow-y-auto shadow-2xl animate-[fadeIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between pb-4 border-b border-[#edf1eb] dark:border-[#27372e]">
              <div>
                <span className="dash-kicker text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#517154] dark:text-[#7f9f82]">{editingHoliday ? 'EDIT RECORD' : 'NEW OBSERVANCE'}</span>
                <h2 className="m-0 text-[20px] font-bold text-[#193c33] dark:text-[#edf5ef]">{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h2>
              </div>
              <button
                type="button"
                className="icon-button w-8 h-8 rounded-lg flex items-center justify-center text-[#517154] dark:text-[#a4b2a8] hover:bg-[#f0f4ee] dark:hover:bg-[#233129] hover:text-[#193c33] dark:hover:text-[#edf5ef] transition-colors border-0 bg-transparent cursor-pointer"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="holiday-form flex flex-col gap-[16px] pt-[14px]">
              {/* Name */}
              <div className="field flex flex-col gap-[6px]">
                <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] flex items-center gap-1" htmlFor="holiday-name">
                  Holiday Name <span className="required-star text-[#ed6b4f]">*</span>
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  placeholder="e.g. Diwali, Independence Day, Annual Company Break"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`field-control w-full px-[14px] py-[10px] rounded-[10px] border border-[#e2e8df] dark:border-[#303b34] bg-white dark:bg-[#141b17] text-[#193c33] dark:text-[#edf5ef] text-[14px] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors ${formErrors.name ? 'has-error border-[#dc2626] dark:border-[#f87171]' : ''}`}
                  disabled={saving}
                  maxLength={100}
                  autoFocus
                />
                {formErrors.name && <span className="field-error-text text-[12px] font-medium text-[#dc2626] dark:text-[#f87171] mt-[2px]">{formErrors.name}</span>}
              </div>

              {/* Dates row */}
              <div className="field-row-grid grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                <div className="field flex flex-col gap-[6px]">
                  <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] flex items-center gap-1" htmlFor="holiday-date">
                    Start Date <span className="required-star text-[#ed6b4f]">*</span>
                  </label>
                  <input
                    id="holiday-date"
                    type="date"
                    value={formData.holidayDate}
                    onChange={(e) => {
                      const newStart = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        holidayDate: newStart,
                        endDate: prev.endDate && prev.endDate >= newStart ? prev.endDate : newStart,
                      }))
                    }}
                    className={`field-control w-full px-[14px] py-[10px] rounded-[10px] border border-[#e2e8df] dark:border-[#303b34] bg-white dark:bg-[#141b17] text-[#193c33] dark:text-[#edf5ef] text-[14px] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors ${formErrors.holidayDate ? 'has-error border-[#dc2626] dark:border-[#f87171]' : ''}`}
                    disabled={saving}
                  />
                  {formErrors.holidayDate && <span className="field-error-text text-[12px] font-medium text-[#dc2626] dark:text-[#f87171] mt-[2px]">{formErrors.holidayDate}</span>}
                </div>

                <div className="field flex flex-col gap-[6px]">
                  <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] flex items-center gap-1" htmlFor="holiday-end-date">
                    End Date <span className="field-hint-inline text-[11px] font-normal text-[#517154] dark:text-[#a4b2a8] ml-1">(optional for multi-day)</span>
                  </label>
                  <input
                    id="holiday-end-date"
                    type="date"
                    value={formData.endDate}
                    min={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`field-control w-full px-[14px] py-[10px] rounded-[10px] border border-[#e2e8df] dark:border-[#303b34] bg-white dark:bg-[#141b17] text-[#193c33] dark:text-[#edf5ef] text-[14px] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors ${formErrors.endDate ? 'has-error border-[#dc2626] dark:border-[#f87171]' : ''}`}
                    disabled={saving}
                  />
                  {formErrors.endDate && <span className="field-error-text text-[12px] font-medium text-[#dc2626] dark:text-[#f87171] mt-[2px]">{formErrors.endDate}</span>}
                </div>
              </div>

              {/* Type and Color row */}
              <div className="field-row-grid grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                <div className="field flex flex-col gap-[6px]">
                  <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef]" htmlFor="holiday-type">
                    Classification
                  </label>
                  <select
                    id="holiday-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as HolidayType })}
                    className="field-control w-full px-[14px] py-[10px] rounded-[10px] border border-[#e2e8df] dark:border-[#303b34] bg-white dark:bg-[#141b17] text-[#193c33] dark:text-[#edf5ef] text-[14px] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors"
                    disabled={saving}
                  >
                    <option value="PUBLIC">Public (National / Gazetted)</option>
                    <option value="COMPANY">Company (Official Corporate Break)</option>
                    <option value="OPTIONAL">Optional (Restricted / Floating)</option>
                    <option value="RESTRICTED">Restricted Observance</option>
                  </select>
                </div>

                <div className="field flex flex-col gap-[6px]">
                  <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef]">Calendar Accent Color</label>
                  <div className="color-swatches-wrap flex items-center gap-[8px] flex-wrap pt-[4px]">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`color-swatch-circle grid w-[26px] h-[26px] place-items-center rounded-full border-2 transition-transform duration-120 hover:scale-115 cursor-pointer ${
                          formData.color === col
                            ? 'is-selected border-[#193c33] dark:border-[#edf5ef] scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                        onClick={() => setFormData({ ...formData, color: col })}
                        aria-label={`Color ${col}`}
                      >
                        {formData.color === col && <Check size={12} color="#fff" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="custom-color-picker w-[28px] h-[28px] p-0 border border-[#dfe5dc] dark:border-[#303b34] rounded-full cursor-pointer bg-transparent"
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="field-checkbox-row flex items-center p-[10px_12px] border border-[#e2e8df] dark:border-[#303b34] rounded-[8px] bg-[#f8faf6] dark:bg-[#141b17]">
                <label className="checkbox-container flex items-start gap-[10px] cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    disabled={saving}
                  />
                  <span className="checkbox-checkmark" />
                  <span className="checkbox-label-text flex flex-col gap-[2px]">
                    <strong className="text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef]">Repeat yearly</strong>
                    <small className="text-[11px] text-[#517154] dark:text-[#a4b2a8]">Automatically display this holiday on the same month and day each year.</small>
                  </span>
                </label>
              </div>

              {/* Description */}
              <div className="field flex flex-col gap-[6px]">
                <label className="field-label text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] flex items-center gap-1" htmlFor="holiday-desc">
                  Description <span className="field-hint-inline text-[11px] font-normal text-[#517154] dark:text-[#a4b2a8] ml-1">(optional)</span>
                </label>
                <textarea
                  id="holiday-desc"
                  placeholder="Additional context, notes, or office closure information..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="field-control textarea-control w-full min-h-[70px] p-[10px_14px] resize-y rounded-[10px] border border-[#e2e8df] dark:border-[#303b34] bg-white dark:bg-[#141b17] text-[#193c33] dark:text-[#edf5ef] text-[14px] focus:outline-none focus:border-[#193c33] dark:focus:border-[#d9ed74] transition-colors"
                  disabled={saving}
                  maxLength={1000}
                />
              </div>

              <div className="modal-actions-bar flex items-center justify-end gap-[10px] mt-[10px] pt-[14px] border-t border-[#edf1eb] dark:border-[#303b34]">
                <button
                  type="button"
                  className="secondary-btn px-[16px] py-[10px] rounded-[10px] border border-[#dfe5dc] dark:border-[#303b34] bg-transparent text-[#193c33] dark:text-[#edf5ef] font-semibold text-[13px] hover:bg-[#f3f6f0] dark:hover:bg-[#233129] transition-colors cursor-pointer"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-action-btn inline-flex items-center gap-[8px] p-[10px_18px] rounded-[10px] bg-[#193c33] text-[#d9ed74] font-semibold text-[13px] hover:bg-[#142e27] transition-colors cursor-pointer border-0"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin-slow animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingHoliday ? 'Save Changes' : 'Create Holiday'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Cancel Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content delete-confirm-modal bg-white dark:bg-[#19231e] rounded-[16px] border border-[#e2e8df] dark:border-[#27372e] p-[24px] w-[min(92vw,440px)] text-center shadow-2xl animate-[fadeIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon grid w-[56px] h-[56px] place-items-center rounded-full bg-[#fef2f2] dark:bg-[#382323] text-[#dc2626] mx-auto mb-[12px]">
              <AlertTriangle size={32} />
            </div>
            <h3 className="m-0 text-[18px] font-bold text-[#193c33] dark:text-[#edf5ef]">Remove Holiday?</h3>
            <p className="mt-[10px] mb-0 text-[13px] text-[#517154] dark:text-[#a4b2a8] leading-[1.5]">
              Are you sure you want to remove <strong>"{deleteTarget.name}"</strong>?
              {hardDelete
                ? ' This record will be permanently deleted from the database.'
                : ' By default, this will mark the holiday as CANCELLED so historical records are maintained.'}
            </p>

            {isSuperAdmin && (
              <div className="hard-delete-toggle mt-[14px] p-[10px] rounded-[8px] bg-[#f8faf6] dark:bg-[#141b17] border border-[#e2e8df] dark:border-[#303b34] text-left">
                <label className="checkbox-container flex items-start gap-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardDelete}
                    onChange={(e) => setHardDelete(e.target.checked)}
                    disabled={deleting}
                  />
                  <span className="checkbox-checkmark" />
                  <span className="checkbox-label-text flex flex-col gap-[2px]">
                    <strong className="text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef]">Permanently delete record (SUPER_ADMIN)</strong>
                  </span>
                </label>
              </div>
            )}

            <div className="modal-actions-bar flex items-center justify-end gap-[10px] mt-[10px] pt-[14px] border-t border-[#edf1eb] dark:border-[#303b34]">
              <button
                type="button"
                className="secondary-btn px-[16px] py-[10px] rounded-[10px] border border-[#dfe5dc] dark:border-[#303b34] bg-transparent text-[#193c33] dark:text-[#edf5ef] font-semibold text-[13px] hover:bg-[#f3f6f0] dark:hover:bg-[#233129] transition-colors cursor-pointer"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep Holiday
              </button>
              <button
                type="button"
                className="danger-btn px-[16px] py-[8px] border border-[#dc2626] rounded-[8px] bg-[#dc2626] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#b91c1c] transition-colors"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Removing...' : hardDelete ? 'Delete Permanently' : 'Cancel Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
