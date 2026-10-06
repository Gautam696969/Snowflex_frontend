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
    <div className="chat-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Start new conversation">
      <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <div className="chat-modal-title-row">
            <div className="chat-modal-icon-wrap">
              <MessageSquarePlus size={18} />
            </div>
            <div>
              <h3>Start a Conversation</h3>
              <p>Select a contact permitted by role permissions</p>
            </div>
          </div>
          <button
            type="button"
            className="chat-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-modal-search-wrap">
          <Search size={15} className="chat-modal-search-icon" />
          <input
            type="text"
            className="chat-modal-search-input"
            placeholder="Search by name, role or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Search contacts"
          />
          {search && (
            <button
              type="button"
              className="chat-search-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="chat-modal-body">
          {loading ? (
            <div className="chat-modal-loading">
              <Loader2 className="chat-spinner" size={24} />
              <span>Loading permitted contacts...</span>
            </div>
          ) : error ? (
            <div className="chat-modal-error">
              <p>{error}</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="chat-modal-empty">
              <UserCheck size={32} />
              <p>{search ? 'No matching contacts found' : 'No available contacts for your role'}</p>
            </div>
          ) : (
            <div className="chat-modal-groups">
              {sortedRoleKeys.map((role) => (
                <div key={role} className="chat-modal-group">
                  <div className="chat-modal-group-label">
                    <RoleBadge role={role} />
                    <span className="chat-modal-group-count">({groupedContacts[role].length})</span>
                  </div>
                  <div className="chat-modal-contact-list">
                    {groupedContacts[role].map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className="chat-modal-contact-item"
                        onClick={() => {
                          onSelectUser(contact.id)
                          onClose()
                        }}
                      >
                        <div className="chat-contact-avatar-wrap">
                          <UserAvatar
                            name={contact.fullName}
                            avatarUrl={contact.avatarUrl}
                            size={36}
                            className="chat-contact-avatar"
                          />
                          <span
                            className={`chat-online-indicator ${contact.isOnline ? 'is-online' : 'is-offline'}`}
                            title={contact.isOnline ? 'Online' : 'Offline'}
                          />
                        </div>
                        <div className="chat-contact-info">
                          <strong className="chat-contact-name">{contact.fullName}</strong>
                          <span className="chat-contact-email">{contact.email}</span>
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
