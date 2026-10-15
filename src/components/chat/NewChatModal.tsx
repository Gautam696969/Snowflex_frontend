import { useEffect, useState, useMemo } from 'react'
import { Search, X, Loader2, MessageSquarePlus, UserCheck } from 'lucide-react'
import UserAvatar from '../UserAvatar'
import RoleBadge from './RoleBadge'
import { fetchContacts, type ChatContact } from '../../lib/chat-api'

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (participantId: number) => void
}

export default function NewChatModal({ isOpen, onClose, onSelectUser }: NewChatModalProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    fetchContacts()
      .then((data) => setContacts(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [isOpen])

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
    )
  }, [contacts, search])

  // Group contacts by role
  const groupedContacts = useMemo(() => {
    const groups: Record<string, ChatContact[]> = {}
    for (const contact of filteredContacts) {
      const r = contact.role
      if (!groups[r]) groups[r] = []
      groups[r].push(contact)
    }
    return groups
  }, [filteredContacts])

  const roleOrder = ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']
  const sortedRoleKeys = useMemo(() => {
    return Object.keys(groupedContacts).sort(
      (a, b) => (roleOrder.indexOf(a) === -1 ? 99 : roleOrder.indexOf(a)) - (roleOrder.indexOf(b) === -1 ? 99 : roleOrder.indexOf(b))
    )
  }, [groupedContacts])

  if (!isOpen) return null

  return (
    <div className="chat-modal-overlay fixed inset-0 z-[100] bg-[rgba(15,23,20,0.5)] backdrop-blur-[4px] flex items-center justify-center p-[20px] animate-[fadeIn_0.15s_ease]" onClick={onClose} role="dialog" aria-modal="true" aria-label="Start new conversation">
      <div className="chat-modal-card w-[min(100%,460px)] max-h-[82vh] flex flex-col bg-white dark:bg-[#18201c] rounded-[12px] shadow-[0_20px_45px_rgba(0,0,0,0.16)] border border-[#dfe5dc] dark:border-[#2e3d35] overflow-hidden animate-[fadeInModal_0.2s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header flex items-center justify-between p-[16px_20px] border-b border-[#e5ebe2] dark:border-[#27342d]">
          <div className="chat-modal-title-row flex items-center gap-[12px]">
            <div className="chat-modal-icon-wrap grid place-items-center w-[36px] h-[36px] rounded-[8px] bg-[#edf3e9] dark:bg-[#222d27] text-[#193c33] dark:text-[#d9ed74]">
              <MessageSquarePlus size={18} />
            </div>
            <div>
              <h3 className="m-0 text-[15.5px] font-bold text-[#193c33] dark:text-[#e3ebe5]">Start a Conversation</h3>
              <p className="mt-[2px] mb-0 text-[11.5px] text-[#8c988e]">Select a contact permitted by role permissions</p>
            </div>
          </div>
          <button
            type="button"
            className="chat-modal-close-btn grid place-items-center w-[30px] h-[30px] rounded-[6px] border-0 bg-transparent text-[#728175] dark:text-[#9caaa0] cursor-pointer hover:bg-[#f1f5ee] dark:hover:bg-[#222d27] hover:text-[#193c33] dark:hover:text-[#e3ebe5] transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-search-wrap relative flex items-center p-[12px_20px] border-b border-[#e5ebe2] dark:border-[#27342d]">
          <Search size={15} className="chat-modal-search-icon absolute left-[32px] text-[#8c988e] pointer-events-none" />
          <input
            type="text"
            className="chat-modal-search-input w-full h-[38px] pl-[34px] pr-[32px] py-0 border border-[#d4ded1] dark:border-[#2e3d35] rounded-[7px] bg-[#f8faf7] dark:bg-[#1d2722] text-[#193c33] dark:text-[#e3ebe5] text-[13px] outline-none focus:border-[#193c33] dark:focus:border-[#4b6255] focus:bg-white dark:focus:bg-[#23302a] transition-all"
            placeholder="Search by name, role or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Search contacts"
          />
          {search && (
            <button
              type="button"
              className="chat-search-clear-btn absolute right-[28px] grid place-items-center border-0 bg-transparent text-[#8c988e] cursor-pointer hover:text-[#193c33] dark:hover:text-[#e3ebe5]"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="chat-modal-body flex-1 overflow-y-auto p-[14px_20px_20px]">
          {loading ? (
            <div className="chat-modal-loading flex flex-col items-center justify-center p-[30px_16px] gap-[10px] text-center text-[#8c988e] text-[13px]">
              <Loader2 className="chat-spinner animate-spin" size={24} />
              <span>Loading permitted contacts...</span>
            </div>
          ) : error ? (
            <div className="chat-modal-error flex flex-col items-center justify-center p-[30px_16px] gap-[10px] text-center text-[#dc2626] text-[13px]">
              <p>{error}</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="chat-modal-empty flex flex-col items-center justify-center p-[30px_16px] gap-[10px] text-center text-[#8c988e] text-[13px]">
              <UserCheck size={32} />
              <p>{search ? 'No matching contacts found' : 'No available contacts for your role'}</p>
            </div>
          ) : (
            <div className="chat-modal-groups flex flex-col gap-[16px]">
              {sortedRoleKeys.map((role) => (
                <div key={role} className="chat-modal-group">
                  <div className="chat-modal-group-label flex items-center gap-[6px] mb-[8px]">
                    <RoleBadge role={role} />
                    <span className="chat-modal-group-count text-[11px] text-[#8c988e]">({groupedContacts[role].length})</span>
                  </div>
                  <div className="chat-modal-contact-list flex flex-col gap-[4px]">
                    {groupedContacts[role].map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className="chat-modal-contact-item flex items-center gap-[12px] p-[8px_12px] border border-transparent rounded-[7px] bg-transparent cursor-pointer text-left hover:bg-[#f1f6ef] dark:hover:bg-[#222d27] hover:border-[#e2ebe0] dark:hover:border-[#2e3d35] transition-all duration-130 w-full"
                        onClick={() => {
                          onSelectUser(contact.id)
                          onClose()
                        }}
                      >
                        <div className="chat-contact-avatar-wrap relative shrink-0">
                          <UserAvatar
                            name={contact.fullName}
                            avatarUrl={contact.avatarUrl}
                            size={36}
                            className="chat-contact-avatar"
                          />
                          <span
                            className={`chat-online-indicator absolute -bottom-[1px] -right-[1px] w-[10px] h-[10px] rounded-full border-2 border-white dark:border-[#18201c] ${contact.isOnline ? 'is-online bg-[#10b981]' : 'is-offline bg-[#9ca3af]'}`}
                            title={contact.isOnline ? 'Online' : 'Offline'}
                          />
                        </div>
                        <div className="chat-contact-info flex flex-col min-w-0">
                          <strong className="chat-contact-name text-[13px] font-semibold text-[#193c33] dark:text-[#e3ebe5] truncate">{contact.fullName}</strong>
                          <span className="chat-contact-email text-[11.5px] text-[#8c988e] truncate">{contact.email}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
