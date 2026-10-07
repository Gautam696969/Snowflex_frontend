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
    <div className="holidays-view-root">
      {/* Top Header & Action Bar */}
      <header className="holidays-header">
        <div className="holidays-title-area">
          <div className="holidays-title-row">
            <div className="holidays-icon-badge">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1>Holidays & Observances</h1>
              <p>Organization calendar schedule, public holidays, and official breaks.</p>
            </div>
          </div>
        </div>

        <div className="holidays-top-actions">
          {/* View mode toggle */}
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
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
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
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
            className="icon-button"
            onClick={() => {
              setRefreshing(true)
              void loadHolidays()
            }}
            title="Refresh holidays"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-slow' : ''} />
          </button>

          {canManage && (
            <button
              type="button"
              className="primary-action-btn"
              onClick={() => handleOpenCreate()}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </header>

      {/* Filter & Selector Toolbar */}
      <section className="holidays-toolbar">
        <div className="toolbar-left">
          {/* Year selector */}
          <div className="toolbar-field">
            <label htmlFor="holiday-year-select" className="sr-only">Year</label>
            <select
              id="holiday-year-select"
              className="toolbar-select"
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
              className="toolbar-select"
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
            <div className="select-with-icon">
              <Filter size={14} className="select-prefix-icon" />
              <select
                id="holiday-type-select"
                className="toolbar-select with-prefix"
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

        <div className="toolbar-right">
          {/* Search box */}
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
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
        <div className="calendar-nav-bar">
          <div className="calendar-month-heading">
            <h2>{MONTH_NAMES[(selectedMonth as number) - 1]} {selectedYear}</h2>
            <span className="month-badge-count">
              {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'} this month
            </span>
          </div>

          <div className="calendar-nav-buttons">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrevMonth}
              title="Previous month"
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              type="button"
              className="calendar-today-btn"
              onClick={handleJumpToday}
            >
              Today
            </button>
            <button
              type="button"
              className="calendar-nav-btn"
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
        <div className="holidays-error-banner" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void loadHolidays()} className="text-link">
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="holidays-loading-state">
          <div className="skeleton-line" style={{ height: '300px', borderRadius: '12px' }} />
        </div>
      ) : holidays.length === 0 && viewMode === 'list' ? (
        <div className="holidays-empty-card">
          <div className="empty-icon-box">
            <Calendar size={36} />
          </div>
          <h3>No holidays added yet</h3>
          <p>
            {searchQuery || selectedType !== 'ALL' || selectedMonth !== 'ALL'
              ? 'No holidays match your current filter settings. Try adjusting the search or filters.'
              : `There are currently no holidays scheduled for ${selectedYear}.`}
          </p>
          {canManage && (
            <button
              type="button"
              className="primary-action-btn"
              onClick={() => handleOpenCreate()}
              style={{ marginTop: '16px' }}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="calendar-grid-container">
          {selectedMonth === 'ALL' ? (
            <div className="calendar-all-months-notice">
              <Info size={16} />
              <span>Please select a specific month to display the month grid, or switch to List view to see the full year agenda.</span>
            </div>
          ) : (
            <div className="calendar-table" role="grid">
              {/* Day headers */}
              <div className="calendar-header-row" role="row">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="calendar-col-header" role="columnheader">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="calendar-body-grid">
                {calendarDays.map(({ dateStr, dayNum, isCurrentMonth, holidays: dayHolidays }) => {
                  const isToday = dateStr === todayIso
                  const hasHolidays = dayHolidays.length > 0

                  return (
                    <div
                      key={dateStr}
                      className={`calendar-day-cell${!isCurrentMonth ? ' is-outside-month' : ''}${isToday ? ' is-today' : ''}${hasHolidays ? ' has-holiday' : ''}`}
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
                      <div className="day-cell-header">
                        <span className={`day-number${isToday ? ' today-pill' : ''}`}>
                          {dayNum}
                        </span>
                        {isToday && <span className="today-label">TODAY</span>}
                      </div>

                      <div className="day-holidays-container">
                        {dayHolidays.map((h) => {
                          const isNext = h.id === nextUpcomingId
                          const chipColor = h.color || '#ed6b4f'

                          return (
                            <div
                              key={h.id}
                              className={`calendar-holiday-chip${isNext ? ' is-next-chip' : ''}`}
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
                              <span className="chip-name">{h.name}</span>
                              {h.isRecurring && <Repeat size={10} className="chip-recurring-icon" />}
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
        <div className="holidays-list-container">
          <div className="holidays-list-grid">
            {holidays.map((h) => {
              const remaining = getDaysRemaining(h.holidayDate)
              const isToday = remaining === 'Today'
              const isNext = h.id === nextUpcomingId
              const itemColor = h.color || '#ed6b4f'

              return (
                <article
                  key={h.id}
                  className={`holiday-card${isToday ? ' is-today' : ''}${isNext ? ' is-next' : ''}`}
                  style={{ borderLeftColor: itemColor }}
                >
                  <div className="holiday-card-main">
                    <div className="holiday-date-column">
                      <div
                        className="holiday-big-date-badge"
                        style={{ backgroundColor: `${itemColor}15`, color: itemColor }}
                      >
                        <span className="badge-month">
                          {new Date(`${h.holidayDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                        </span>
                        <strong className="badge-day">
                          {new Date(`${h.holidayDate}T00:00:00`).getDate()}
                        </strong>
                        <span className="badge-year">
                          {new Date(`${h.holidayDate}T00:00:00`).getFullYear()}
                        </span>
                      </div>
                    </div>

                    <div className="holiday-content-column">
                      <div className="holiday-card-head">
                        <div className="title-and-badges">
                          <h3>{h.name}</h3>
                          <div className="holiday-card-tags">
                            <span className={`holiday-type-pill type-${h.type.toLowerCase()}`}>
                              {h.type}
                            </span>
                            {h.isRecurring && (
                              <span className="holiday-recurring-pill" title="Repeats yearly on this date">
                                <Repeat size={12} />
                                <span>Yearly</span>
                              </span>
                            )}
                            {isNext && (
                              <span className="holiday-next-pill">
                                <Sparkles size={11} />
                                <span>Next Upcoming</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="holiday-countdown-box">
                          <span className={`countdown-badge${isToday ? ' is-today' : isNext ? ' is-next' : ''}`}>
                            {remaining}
                          </span>
                        </div>
                      </div>

                      <div className="holiday-date-details">
                        <Calendar size={14} className="calendar-detail-icon" />
                        <span>{formatDisplayDate(h.holidayDate)}</span>
                        {h.endDate && h.endDate !== h.holidayDate && (
                          <span className="multi-day-span">
                            &nbsp;to {formatDisplayDate(h.endDate)} ({h.daysCount} days)
                          </span>
                        )}
                      </div>

                      {h.description && (
                        <p className="holiday-description">{h.description}</p>
                      )}

                      {h.createdByName && (
                        <div className="holiday-author-footnote">
                          <span>Added by {h.createdByName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="holiday-card-actions">
                      <button
                        type="button"
                        className="icon-action-btn edit-btn"
                        onClick={() => handleOpenEdit(h)}
                        title="Edit holiday"
                        aria-label={`Edit ${h.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn delete-btn"
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
        <div className="modal-backdrop" onClick={() => setSelectedDayHolidays(null)}>
          <div className="modal-content holiday-day-popup" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="dash-kicker">DAY SCHEDULE</span>
                <h3>{formatDisplayDate(selectedDayHolidays.date)}</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedDayHolidays(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="day-popup-list">
              {selectedDayHolidays.items.map((h) => (
                <div key={h.id} className="day-popup-item" style={{ borderLeftColor: h.color || '#ed6b4f' }}>
                  <div className="popup-item-header">
                    <strong>{h.name}</strong>
                    <span className={`holiday-type-pill type-${h.type.toLowerCase()}`}>
                      {h.type}
                    </span>
                  </div>
                  {h.endDate && h.endDate !== h.holidayDate && (
                    <span className="popup-duration">
                      Multi-day break: {h.holidayDate} to {h.endDate} ({h.daysCount} days)
                    </span>
                  )}
                  {h.description && <p className="popup-desc">{h.description}</p>}
                  {h.isRecurring && (
                    <div className="popup-recurring">
                      <Repeat size={12} />
                      <span>Repeats yearly</span>
                    </div>
                  )}

                  {canManage && (
                    <div className="popup-item-actions">
                      <button
                        type="button"
                        className="btn-outline-sm"
                        onClick={() => handleOpenEdit(h)}
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-danger-sm"
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
              ))}
            </div>

            {canManage && (
              <div className="modal-footer" style={{ borderTop: '1px solid #edf1eb', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="primary-action-btn"
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
        <div className="modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content holiday-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="dash-kicker">{editingHoliday ? 'EDIT RECORD' : 'NEW OBSERVANCE'}</span>
                <h2>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="holiday-form">
              {/* Name */}
              <div className="field">
                <label className="field-label" htmlFor="holiday-name">
                  Holiday Name <span className="required-star">*</span>
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  placeholder="e.g. Diwali, Independence Day, Annual Company Break"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`field-control ${formErrors.name ? 'has-error' : ''}`}
                  disabled={saving}
                  maxLength={100}
                  autoFocus
                />
                {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
              </div>

              {/* Dates row */}
              <div className="field-row-grid">
                <div className="field">
                  <label className="field-label" htmlFor="holiday-date">
                    Start Date <span className="required-star">*</span>
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
                    className={`field-control ${formErrors.holidayDate ? 'has-error' : ''}`}
                    disabled={saving}
                  />
                  {formErrors.holidayDate && <span className="field-error-text">{formErrors.holidayDate}</span>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="holiday-end-date">
                    End Date <span className="field-hint-inline">(optional for multi-day)</span>
                  </label>
                  <input
                    id="holiday-end-date"
                    type="date"
                    value={formData.endDate}
                    min={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`field-control ${formErrors.endDate ? 'has-error' : ''}`}
                    disabled={saving}
                  />
                  {formErrors.endDate && <span className="field-error-text">{formErrors.endDate}</span>}
                </div>
              </div>

              {/* Type and Color row */}
              <div className="field-row-grid">
                <div className="field">
                  <label className="field-label" htmlFor="holiday-type">
                    Classification
                  </label>
                  <select
                    id="holiday-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as HolidayType })}
                    className="field-control"
                    disabled={saving}
                  >
                    <option value="PUBLIC">Public (National / Gazetted)</option>
                    <option value="COMPANY">Company (Official Corporate Break)</option>
                    <option value="OPTIONAL">Optional (Restricted / Floating)</option>
                    <option value="RESTRICTED">Restricted Observance</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Calendar Accent Color</label>
                  <div className="color-swatches-wrap">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`color-swatch-circle ${formData.color === col ? 'is-selected' : ''}`}
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
                      className="custom-color-picker"
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="field-checkbox-row">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    disabled={saving}
                  />
                  <span className="checkbox-checkmark" />
                  <span className="checkbox-label-text">
                    <strong>Repeat yearly</strong>
                    <small>Automatically display this holiday on the same month and day each year.</small>
                  </span>
                </label>
              </div>

              {/* Description */}
              <div className="field">
                <label className="field-label" htmlFor="holiday-desc">
                  Description <span className="field-hint-inline">(optional)</span>
                </label>
                <textarea
                  id="holiday-desc"
                  placeholder="Additional context, notes, or office closure information..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="field-control textarea-control"
                  disabled={saving}
                  maxLength={1000}
                />
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-action-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin-slow" />
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
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Remove Holiday?</h3>
            <p>
              Are you sure you want to remove <strong>"{deleteTarget.name}"</strong>?
              {hardDelete
                ? ' This record will be permanently deleted from the database.'
                : ' By default, this will mark the holiday as CANCELLED so historical records are maintained.'}
            </p>

            {isSuperAdmin && (
              <div className="hard-delete-toggle">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={hardDelete}
                    onChange={(e) => setHardDelete(e.target.checked)}
                    disabled={deleting}
                  />
                  <span className="checkbox-checkmark" />
                  <span className="checkbox-label-text">
                    <strong>Permanently delete record (SUPER_ADMIN)</strong>
                  </span>
                </label>
              </div>
            )}

            <div className="modal-actions-bar">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep Holiday
              </button>
              <button
                type="button"
                className="danger-btn"
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
