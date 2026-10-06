import { useState, type FormEvent } from 'react'
import {
  X, Plus, Edit2, Check, AlertCircle, Trash2, Power
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  createLeaveType, updateLeaveType, toggleLeaveType, deleteLeaveType,
  type LeaveType, type CreateLeaveTypePayload
} from '../lib/leave-api'
import { SkeletonTable } from './Skeleton'

interface LeaveTypesAdminModalProps {
  isOpen: boolean
  onClose: () => void
  leaveTypes: LeaveType[]
  onRefresh: () => void
  loading?: boolean
}

export default function LeaveTypesAdminModal({
  isOpen,
  onClose,
  leaveTypes,
  onRefresh,
  loading = false,
}: LeaveTypesAdminModalProps) {
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<CreateLeaveTypePayload>({
    name: '',
    code: '',
    description: '',
    isPaid: true,
    yearlyQuota: 12,
    requiresDocument: false,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartCreate = () => {
    setIsCreating(true)
    setEditingType(null)
    setErrorMsg(null)
    setForm({
      name: '',
      code: '',
      description: '',
      isPaid: true,
      yearlyQuota: 10,
      requiresDocument: false,
      isActive: true,
    })
  }

  const handleStartEdit = (t: LeaveType) => {
    setEditingType(t)
    setIsCreating(false)
    setErrorMsg(null)
    setForm({
      name: t.name,
      code: t.code,
      description: t.description || '',
      isPaid: t.isPaid,
      yearlyQuota: t.yearlyQuota,
      requiresDocument: t.requiresDocument,
      isActive: t.isActive,
    })
  }

  const handleCancelForm = () => {
    setIsCreating(false)
    setEditingType(null)
    setErrorMsg(null)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!form.name.trim() || !form.code.trim()) {
      setErrorMsg('Name and Code are required.')
      return
    }

    setSaving(true)
    try {
      if (editingType) {
        await updateLeaveType(editingType.id, {
          ...form,
          yearlyQuota: form.yearlyQuota ? Number(form.yearlyQuota) : null,
        })
        toast.success(`Updated ${form.name} successfully`)
      } else {
        await createLeaveType({
          ...form,
          yearlyQuota: form.yearlyQuota ? Number(form.yearlyQuota) : null,
        })
        toast.success(`Created ${form.name} successfully`)
      }
      handleCancelForm()
      onRefresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t: LeaveType) => {
    try {
      const nextState = !t.isActive
      await toggleLeaveType(t.id, nextState)
      toast.success(`${t.name} is now ${nextState ? 'Active' : 'Deactivated'}`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleDelete = async (t: LeaveType) => {
    if (!window.confirm(`Are you sure you want to delete ${t.name}? If it has existing leave requests, deactivate it instead.`)) {
      return
    }
    try {
      await deleteLeaveType(t.id)
      toast.success(`Deleted ${t.name}`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Cannot delete leave type')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal leave-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-kicker">WORKFORCE GOVERNANCE</div>
            <h3>Leave Types & Quota Configuration</h3>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div className="notice error-notice" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form for Creating / Editing a Leave Type */}
          {(isCreating || editingType) && (
            <div className="leave-type-form-box">
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-main, #193c33)' }}>
                {editingType ? `Edit Leave Type: ${editingType.name}` : 'Create New Leave Type'}
              </h4>
              <form onSubmit={handleSave} className="modal-form">
                <div className="modal-form-grid">
                  <label>
                    Type Name <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sabbatical Leave"
                    />
                  </label>
                  <label>
                    Short Code <span style={{ color: '#ef4444' }}>*</span>
                    <input
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAB"
                      maxLength={10}
                    />
                  </label>
                </div>

                <div className="modal-form-grid">
                  <label>
                    Yearly Quota (Days)
                    <input
                      type="number"
                      min="0"
                      value={form.yearlyQuota ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          yearlyQuota: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Leave empty for Unlimited"
                    />
                  </label>
                  <label>
                    Compensation Type
                    <select
                      value={form.isPaid ? 'PAID' : 'UNPAID'}
                      onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'PAID' })}
                    >
                      <option value="PAID">Paid Leave</option>
                      <option value="UNPAID">Unpaid (Without Pay)</option>
                    </select>
                  </label>
                </div>

                <div className="form-group" style={{ width: '100%' }}>
                  <label>Description</label>
                  <input
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of when this leave can be taken"
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px', width: '100%', padding: '6px 0' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.requiresDocument}
                      onChange={(e) => setForm({ ...form, requiresDocument: e.target.checked })}
                    />
                    <span style={{ fontSize: '13px' }}>Requires Supporting Document</span>
                  </label>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '13px' }}>Is Active for Employees</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%', marginTop: '10px' }}>
                  <button type="button" className="secondary-action" onClick={handleCancelForm}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-action" disabled={saving}>
                    {saving ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action Row */}
          {!isCreating && !editingType && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#4b5e52', fontWeight: 600 }}>
                {leaveTypes.length} Configured Leave Types
              </span>
              <button
                type="button"
                className="primary-action"
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={handleStartCreate}
              >
                <Plus size={14} />
                <span>Add Leave Type</span>
              </button>
            </div>
          )}

          {/* Table of Types */}
          <div className="leave-types-table-container">
            {loading && leaveTypes.length === 0 ? (
              <SkeletonTable columns={6} rows={4} />
            ) : (
              <table className="saas-grid-table">
              <thead>
                <tr>
                  <th>TYPE & CODE</th>
                  <th>ANNUAL QUOTA</th>
                  <th>PAY STATUS</th>
                  <th>DOCS</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((t) => (
                  <tr key={t.id} style={{ opacity: t.isActive ? 1 : 0.6 }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main, #193c33)' }}>{t.name}</strong>
                        <small style={{ color: '#6b7280', fontSize: '11px' }}>{t.description || 'No description'}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{t.yearlyQuota !== null ? `${t.yearlyQuota} days` : 'Unlimited'}</strong>
                    </td>
                    <td>
                      <span className={`balance-paid-pill ${t.isPaid ? 'paid' : 'unpaid'}`}>
                        {t.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td>
                      {t.requiresDocument ? (
                        <span style={{ color: '#047857', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={12} /> Required
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>Optional</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-btn ${t.isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggle(t)}
                        title={t.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <Power size={11} />
                        <span>{t.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="action-chip-btn"
                          onClick={() => handleStartEdit(t)}
                          title="Edit leave type"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="action-chip-btn action-delete"
                          onClick={() => handleDelete(t)}
                          title="Delete leave type"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="secondary-action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
