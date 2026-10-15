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
    <article className="overview-card holiday-widget-card w-full">
      <div className="overview-card-header flex items-start justify-between mb-[16px]">
        <div>
          <span className="dash-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">CALENDAR SNAPSHOT</span>
          <h2 className="text-[18px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] m-0 my-[2px]">Upcoming Holidays</h2>
          <p className="text-[13px] text-[#65776d] dark:text-[#8c9d92] m-0">Official organization & public observances.</p>
        </div>
        <button
          className="icon-button p-[6px] rounded-[8px] border border-[#dce2d7] dark:border-[#27372e] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all"
          type="button"
          onClick={onNavigate}
          title="Open holidays calendar"
          aria-label="Open holidays calendar"
        >
          <Calendar size={17} />
        </button>
      </div>

      {loading ? (
        <div className="holiday-widget-loading flex flex-col gap-[8px]">
          <div className="skeleton-line h-[48px] rounded-[8px] bg-[#eef3eb] dark:bg-[#202d26] animate-pulse" />
          <div className="skeleton-line h-[48px] rounded-[8px] bg-[#eef3eb] dark:bg-[#202d26] animate-pulse" />
          <div className="skeleton-line h-[48px] rounded-[8px] bg-[#eef3eb] dark:bg-[#202d26] animate-pulse" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="holiday-widget-empty flex flex-col items-center justify-center p-[32px_16px] text-center gap-[8px]">
          <Calendar size={28} className="empty-icon text-[#8a9c90] opacity-60" />
          <p className="m-0 text-[13px] text-[#8a9c90]">No upcoming holidays found.</p>
          <button type="button" className="text-link text-[12px] font-semibold text-[#10b981] dark:text-[#d9ed74] hover:underline cursor-pointer bg-transparent border-0 p-0" onClick={onNavigate}>
            View full holiday schedule
          </button>
        </div>
      ) : (
        <div className="holiday-widget-list grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[12px] mt-[16px]">
          {holidays.map((h, index) => {
            const { month, day, weekday } = formatHolidayDate(h.holidayDate)
            const remaining = getDaysRemaining(h.holidayDate)
            const isToday = remaining === 'Today'
            const isFirst = index === 0

            return (
              <div
                key={`${h.id}-${h.holidayDate}`}
                className={`holiday-widget-item flex items-center gap-[12px] px-[14px] py-[12px] rounded-[10px] border border-[#e2e8df] dark:border-[#27372e] border-l-4 border-l-[#ed6b4f] bg-white dark:bg-[#19231e] cursor-pointer transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(25,60,51,0.05)] ${
                  isToday ? 'is-today shadow-[0_0_0_2px_rgba(237,107,79,0.25)]' : ''
                }${isFirst ? ' is-next-up' : ''}`}
                style={h.color ? { borderLeftColor: h.color } : undefined}
                onClick={onNavigate}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onNavigate()
                }}
              >
                <div className="holiday-date-badge flex flex-col items-center justify-center w-[44px] h-[48px] rounded-[8px] bg-[#f3f6f0] dark:bg-[#141c18] text-[#14241d] dark:text-[#f1f7f2] shrink-0 text-center" style={h.color ? { backgroundColor: `${h.color}15`, color: h.color } : undefined}>
                  <span className="badge-month text-[9px] font-bold">{month}</span>
                  <strong className="badge-day text-[16px] font-extrabold leading-none">{day}</strong>
                  <span className="badge-weekday text-[9px] opacity-75">{weekday}</span>
                </div>

                <div className="holiday-info flex flex-col gap-[3px] flex-1 min-w-0">
                  <div className="holiday-name-row flex items-center gap-[6px]">
                    <strong className="holiday-title text-[13px] font-bold text-[#14241d] dark:text-[#f1f7f2] whitespace-nowrap overflow-hidden text-ellipsis">{h.name}</strong>
                    {h.isRecurring && (
                      <span className="holiday-recurring-icon text-[#8a9c90] shrink-0" title="Repeats yearly">
                        <Repeat size={12} />
                      </span>
                    )}
                  </div>
                  <div className="holiday-meta-row flex items-center gap-[6px]">
                    <span className={`holiday-type-pill type-${h.type.toLowerCase()} text-[10px] font-bold px-[6px] py-[2px] rounded-full uppercase bg-[#f0f4ee] dark:bg-[#202d26] text-[#55675c] dark:text-[#c4d6cb]`}>
                      {h.type}
                    </span>
                    {h.daysCount && h.daysCount > 1 && (
                      <span className="holiday-duration-text text-[11px] font-medium text-[#8a9c90]">
                        {h.daysCount} days
                      </span>
                    )}
                  </div>
                </div>

                <div className="holiday-remaining-col shrink-0">
                  <span className={`holiday-countdown-pill inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-semibold whitespace-nowrap ${
                    isToday
                      ? 'pill-today bg-[#ed6b4f] text-white font-bold'
                      : isFirst
                        ? 'pill-next bg-[rgba(237,107,79,0.12)] text-[#c4492f] dark:text-[#ff896e] font-bold'
                        : 'bg-[#f1f4ed] dark:bg-[#202d26] text-[#65776d] dark:text-[#8c9d92]'
                  }`}>
                    {isToday && <Sparkles size={11} className="spin-slow animate-spin" />}
                    {remaining}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="holiday-widget-footer flex justify-end mt-[14px] pt-[10px] border-t border-[#edf1eb] dark:border-[#25352c]">
        <button type="button" className="holiday-view-all-btn inline-flex items-center gap-[4px] bg-transparent border-0 text-[#c4492f] dark:text-[#ff896e] text-[12px] font-semibold cursor-pointer px-[6px] py-[4px] rounded-[4px] hover:bg-[rgba(237,107,79,0.08)] transition-all" onClick={onNavigate}>
          <span>View all holidays</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  )
}
