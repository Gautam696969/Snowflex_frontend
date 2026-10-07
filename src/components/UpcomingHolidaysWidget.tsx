import { useEffect, useState, useCallback } from 'react'
import { Calendar, ChevronRight, Sparkles, Repeat } from 'lucide-react'
import { fetchUpcomingHolidays } from '../lib/holiday-api'
import type { Holiday } from '../lib/holiday-api'
import { useChat } from '../context/ChatContext'

interface UpcomingHolidaysWidgetProps {
  onNavigate: () => void
  limit?: number
}

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

function formatHolidayDate(dateStr: string): { month: string; day: string; weekday: string } {
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return { month: '—', day: '—', weekday: '—' }
  const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
  const day = String(d.getDate())
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
  return { month, day, weekday }
}

export default function UpcomingHolidaysWidget({ onNavigate, limit = 4 }: UpcomingHolidaysWidgetProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const { socket } = useChat()

  const loadUpcoming = useCallback(async () => {
    try {
      const data = await fetchUpcomingHolidays(limit)
      setHolidays(data)
    } catch {
      // Non-blocking in dashboard
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    void loadUpcoming()

    // Real-time synchronization via Socket.IO
    if (socket) {
      socket.on('holiday:changed', loadUpcoming)
    }

    const handleLocalUpdate = () => void loadUpcoming()
    window.addEventListener('holidays-updated', handleLocalUpdate)

    return () => {
      if (socket) {
        socket.off('holiday:changed', loadUpcoming)
      }
      window.removeEventListener('holidays-updated', handleLocalUpdate)
    }
  }, [socket, loadUpcoming])

  return (
    <article className="overview-card holiday-widget-card">
      <div className="overview-card-header">
        <div>
          <span className="dash-kicker">CALENDAR SNAPSHOT</span>
          <h2>Upcoming Holidays</h2>
          <p>Official organization & public observances.</p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onNavigate}
          title="Open holidays calendar"
          aria-label="Open holidays calendar"
        >
          <Calendar size={17} />
        </button>
      </div>

      {loading ? (
        <div className="holiday-widget-loading">
          <div className="skeleton-line" style={{ height: '48px', borderRadius: '8px' }} />
          <div className="skeleton-line" style={{ height: '48px', borderRadius: '8px' }} />
          <div className="skeleton-line" style={{ height: '48px', borderRadius: '8px' }} />
        </div>
      ) : holidays.length === 0 ? (
        <div className="holiday-widget-empty">
          <Calendar size={28} className="empty-icon" />
          <p>No upcoming holidays found.</p>
          <button type="button" className="text-link" onClick={onNavigate}>
            View full holiday schedule
          </button>
        </div>
      ) : (
        <div className="holiday-widget-list">
          {holidays.map((h, index) => {
            const { month, day, weekday } = formatHolidayDate(h.holidayDate)
            const remaining = getDaysRemaining(h.holidayDate)
            const isToday = remaining === 'Today'
            const isFirst = index === 0

            return (
              <div
                key={`${h.id}-${h.holidayDate}`}
                className={`holiday-widget-item${isToday ? ' is-today' : ''}${isFirst ? ' is-next-up' : ''}`}
                style={h.color ? { borderLeftColor: h.color } : undefined}
                onClick={onNavigate}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onNavigate()
                }}
              >
                <div className="holiday-date-badge" style={h.color ? { backgroundColor: `${h.color}15`, color: h.color } : undefined}>
                  <span className="badge-month">{month}</span>
                  <strong className="badge-day">{day}</strong>
                  <span className="badge-weekday">{weekday}</span>
                </div>

                <div className="holiday-info">
                  <div className="holiday-name-row">
                    <strong className="holiday-title">{h.name}</strong>
                    {h.isRecurring && (
                      <span className="holiday-recurring-icon" title="Repeats yearly">
                        <Repeat size={12} />
                      </span>
                    )}
                  </div>
                  <div className="holiday-meta-row">
                    <span className={`holiday-type-pill type-${h.type.toLowerCase()}`}>
                      {h.type}
                    </span>
                    {h.daysCount && h.daysCount > 1 && (
                      <span className="holiday-duration-text">
                        {h.daysCount} days
                      </span>
                    )}
                  </div>
                </div>

                <div className="holiday-remaining-col">
                  <span className={`holiday-countdown-pill${isToday ? ' pill-today' : isFirst ? ' pill-next' : ''}`}>
                    {isToday && <Sparkles size={11} className="spin-slow" />}
                    {remaining}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="holiday-widget-footer">
        <button type="button" className="holiday-view-all-btn" onClick={onNavigate}>
          <span>View all holidays</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  )
}
