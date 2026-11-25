import { useEffect, useState } from 'react'
import { Calendar, Clock, Loader2, Users, Video, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { fetchContacts, type ChatContact } from '../../lib/chat-api'
import { createMeetingApi } from '../../lib/meeting-api'
import { useMeeting } from '../../context/MeetingContext'

interface StartMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  chatId: number
  otherUser: {
    id: number
    fullName: string
  }
}

export default function StartMeetingModal({
  isOpen,
  onClose,
  chatId,
  otherUser,
}: StartMeetingModalProps) {
  const { openPreJoin } = useMeeting()

  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant')
  const [title, setTitle] = useState(`Sync with ${otherUser.fullName}`)
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([otherUser.id])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setTitle(`Sync with ${otherUser.fullName}`)
    setDescription('')
    setSelectedUserIds([otherUser.id])

    const now = new Date(Date.now() + 30 * 60 * 1000)
    setScheduledDate(now.toISOString().slice(0, 10))
    setScheduledTime(now.toTimeString().slice(0, 5))

    fetchContacts()
      .then((list) => setContacts(list))
      .catch(() => {})
  }, [isOpen, otherUser.id, otherUser.fullName])

  if (!isOpen) return null

  const toggleInvite = (userId: number) => {
    if (userId === otherUser.id) return
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a meeting title.')
      return
    }

    let scheduledAt: string | null = null
    if (mode === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please pick a date and time for the scheduled meeting.')
        return
      }
      const dt = new Date(`${scheduledDate}T${scheduledTime}`)
      if (isNaN(dt.getTime()) || dt.getTime() < Date.now() - 60_000) {
        toast.error('Please choose a future date and time.')
        return
      }
      scheduledAt = dt.toISOString()
    }

    setSubmitting(true)
    try {
      const meeting = await createMeetingApi({
        title: title.trim(),
        description: description.trim(),
        chatId,
        invitedUserIds: selectedUserIds,
        scheduledAt,
      })

      onClose()
      if (mode === 'instant') {
        await openPreJoin(meeting.meetingCode)
      } else {
        toast.success('Meeting scheduled! Reminder will be sent 10 minutes before.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1250] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Start or schedule a meeting"
    >
      <div className="w-full max-w-[460px] rounded-2xl bg-white dark:bg-[#16201a] border border-[#dce5d9] dark:border-[#2a3b31] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5ebe2] dark:border-[#26362c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#edf5ea] dark:bg-[#1f3226] text-[#193c33] dark:text-[#d9ed74] grid place-items-center">
              <Video size={17} />
            </div>
            <div>
              <h3 className="m-0 text-[15px] font-bold text-[#193c33] dark:text-[#edf5ef]">
                Team Meeting
              </h3>
              <p className="m-0 text-[11px] text-[#6d7f74] dark:text-[#8ea195]">
                Start instantly or schedule with a 10-min reminder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-0 bg-transparent hover:bg-[#f1f5ee] dark:hover:bg-[#223027] text-[#5c7063] dark:text-[#9eb0a4] grid place-items-center cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Instant vs Scheduled Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f1f5ee] dark:bg-[#111914] border border-[#e1e8de] dark:border-[#24342a]">
            <button
              type="button"
              onClick={() => setMode('instant')}
              className={`py-2 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                mode === 'instant'
                  ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                  : 'bg-transparent text-[#5e7265] dark:text-[#96a89c]'
              }`}
            >
              Start Now (Instant)
            </button>
            <button
              type="button"
              onClick={() => setMode('scheduled')}
              className={`py-2 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                mode === 'scheduled'
                  ? 'bg-[#193c33] text-[#d9ed74] shadow-sm'
                  : 'bg-transparent text-[#5e7265] dark:text-[#96a89c]'
              }`}
            >
              Schedule Meeting
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#2b4437] dark:text-[#c7d6cc]">
              Meeting Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Standup"
              maxLength={200}
              required
              className="px-3 py-2 rounded-lg text-xs border border-[#d6e0d2] dark:border-[#2a3c31] bg-white dark:bg-[#111914] text-[#193c33] dark:text-[#edf5ef] focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {mode === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2b4437] dark:text-[#c7d6cc] flex items-center gap-1">
                  <Calendar size={12} /> Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="px-3 py-2 rounded-lg text-xs border border-[#d6e0d2] dark:border-[#2a3c31] bg-white dark:bg-[#111914] text-[#193c33] dark:text-[#edf5ef]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2b4437] dark:text-[#c7d6cc] flex items-center gap-1">
                  <Clock size={12} /> Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="px-3 py-2 rounded-lg text-xs border border-[#d6e0d2] dark:border-[#2a3c31] bg-white dark:bg-[#111914] text-[#193c33] dark:text-[#edf5ef]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#2b4437] dark:text-[#c7d6cc]">
              Agenda / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topics to cover..."
              maxLength={1000}
              className="px-3 py-2 rounded-lg text-xs border border-[#d6e0d2] dark:border-[#2a3c31] bg-white dark:bg-[#111914] text-[#193c33] dark:text-[#edf5ef] resize-none focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {contacts.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#2b4437] dark:text-[#c7d6cc] flex items-center gap-1">
                <Users size={12} /> Invite Additional Colleagues ({selectedUserIds.length} selected)
              </label>
              <div className="max-h-[110px] overflow-y-auto rounded-lg border border-[#e1e8de] dark:border-[#27382e] p-1.5 flex flex-col gap-1 bg-[#fafcf9] dark:bg-[#111914]">
                {contacts.map((c) => {
                  const checked = selectedUserIds.includes(c.id)
                  const locked = c.id === otherUser.id
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer ${
                        checked ? 'bg-[#eaf3e7] dark:bg-[#1c2c22]' : 'hover:bg-[#f2f6f0] dark:hover:bg-[#17231c]'
                      }`}
                    >
                      <span className="truncate font-medium text-[#193c33] dark:text-[#e2ece5]">
                        {c.fullName} <span className="text-[10px] opacity-65">({c.role})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleInvite(c.id)}
                        className="accent-[#10b981]"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5ebe2] dark:border-[#26362c]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-[#d6e0d2] dark:border-[#2a3c31] bg-transparent text-[#4b5e52] dark:text-[#9eb0a4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border-0 bg-[#193c33] hover:bg-[#245447] text-[#d9ed74] cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
              <span>{mode === 'instant' ? 'Start Meeting Now' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

