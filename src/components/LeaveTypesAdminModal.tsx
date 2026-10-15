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
    <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-[16px] z-[9999]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal leave-settings-modal bg-white dark:bg-[#19231e] rounded-[16px] border border-[#dce2d7] dark:border-[#27372e] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-[780px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex items-center justify-between px-[24px] py-[18px] border-b border-[#edf1eb] dark:border-[#25352c]">
          <div>
            <div className="section-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">WORKFORCE GOVERNANCE</div>
            <h3 className="text-[18px] font-bold text-[#14241d] dark:text-[#f1f7f2] m-0">Leave Types & Quota Configuration</h3>
          </div>
          <button className="modal-close bg-transparent border-0 text-[#7b8f83] dark:text-[#8c9d92] hover:text-[#193c33] dark:hover:text-[#d9ed74] cursor-pointer p-[4px] rounded-[6px]" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body p-[24px] max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="notice error-notice flex items-center gap-[8px] p-[10px_14px] bg-[#fef2f2] dark:bg-[#3b1c1c] border border-[#fecaca] dark:border-[#7f1d1d] text-[#dc2626] dark:text-[#f87171] rounded-[8px] text-[12px] mb-[16px]">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form for Creating / Editing a Leave Type */}
          {(isCreating || editingType) && (
            <div className="leave-type-form-box p-[16px_18px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[12px] mb-[20px]">
              <h4 className="m-0 mb-[12px] text-[14px] font-bold text-[#193c33] dark:text-[#edf5ef]">
                {editingType ? `Edit Leave Type: ${editingType.name}` : 'Create New Leave Type'}
              </h4>
              <form onSubmit={handleSave} className="modal-form flex flex-col gap-[12px]">
                <div className="modal-form-grid grid grid-cols-2 max-[600px]:grid-cols-1 gap-[12px]">
                  <label className="flex flex-col gap-[4px] text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                    <span>Type Name <span className="text-[#ef4444]">*</span></span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sabbatical Leave"
                      className="px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-[4px] text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                    <span>Short Code <span className="text-[#ef4444]">*</span></span>
                    <input
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAB"
                      maxLength={10}
                      className="px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none"
                    />
                  </label>
                </div>

                <div className="modal-form-grid grid grid-cols-2 max-[600px]:grid-cols-1 gap-[12px]">
                  <label className="flex flex-col gap-[4px] text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                    <span>Yearly Quota (Days)</span>
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
                      className="px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-[4px] text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                    <span>Compensation Type</span>
                    <select
                      value={form.isPaid ? 'PAID' : 'UNPAID'}
                      onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'PAID' })}
                      className="px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none"
                    >
                      <option value="PAID">Paid Leave</option>
                      <option value="UNPAID">Unpaid (Without Pay)</option>
                    </select>
                  </label>
                </div>

                <div className="form-group w-full flex flex-col gap-[4px] text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc]">
                  <label>Description</label>
                  <input
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of when this leave can be taken"
                    className="w-full px-[12px] py-[8px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none box-border"
                  />
                </div>

                <div className="flex gap-[20px] w-full py-[6px] flex-wrap">
                  <label className="inline-flex items-center gap-[8px] cursor-pointer text-[13px] text-[#2b3f34] dark:text-[#d8e5dc]">
                    <input
                      type="checkbox"
                      checked={form.requiresDocument}
                      onChange={(e) => setForm({ ...form, requiresDocument: e.target.checked })}
                    />
                    <span>Requires Supporting Document</span>
                  </label>

                  <label className="inline-flex items-center gap-[8px] cursor-pointer text-[13px] text-[#2b3f34] dark:text-[#d8e5dc]">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span>Is Active for Employees</span>
                  </label>
                </div>

                <div className="flex justify-end gap-[8px] w-full mt-[10px]">
                  <button type="button" className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[7px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all" onClick={handleCancelForm}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-action inline-flex items-center gap-[6px] px-[16px] py-[7px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all disabled:opacity-50" disabled={saving}>
                    {saving ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action Row */}
          {!isCreating && !editingType && (
            <div className="flex justify-between items-center mb-[16px]">
              <span className="text-[13px] text-[#4b5e52] dark:text-[#8ea596] font-semibold">
                {leaveTypes.length} Configured Leave Types
              </span>
              <button
                type="button"
                className="primary-action inline-flex items-center gap-[6px] px-[14px] py-[6px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all"
                onClick={handleStartCreate}
              >
                <Plus size={14} />
                <span>Add Leave Type</span>
              </button>
            </div>
          )}

          {/* Table of Types */}
          <div className="leave-types-table-container overflow-x-auto">
            {loading && leaveTypes.length === 0 ? (
              <SkeletonTable columns={6} rows={4} />
            ) : (
              <table className="saas-grid-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#edf1eb] dark:border-[#25352c] text-[10px] font-extrabold text-[#708477] dark:text-[#8c9d92] uppercase tracking-[0.06em]">
                  <th className="py-[10px] px-[12px]">TYPE & CODE</th>
                  <th className="py-[10px] px-[12px]">ANNUAL QUOTA</th>
                  <th className="py-[10px] px-[12px]">PAY STATUS</th>
                  <th className="py-[10px] px-[12px]">DOCS</th>
                  <th className="py-[10px] px-[12px]">STATUS</th>
                  <th className="py-[10px] px-[12px] text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1eb] dark:divide-[#25352c]">
                {leaveTypes.map((t) => (
                  <tr key={t.id} style={{ opacity: t.isActive ? 1 : 0.6 }} className="hover:bg-[#f7faf6] dark:hover:bg-[#17221c] transition-colors">
                    <td className="py-[10px] px-[12px]">
                      <div className="flex flex-col gap-[2px]">
                        <strong className="text-[13px] text-[#193c33] dark:text-[#edf5ef]">{t.name}</strong>
                        <small className="text-[11px] text-[#6b7280] dark:text-[#8c9d92]">{t.description || 'No description'}</small>
                      </div>
                    </td>
                    <td className="py-[10px] px-[12px]">
                      <strong className="text-[13px] text-[#193c33] dark:text-[#edf5ef]">{t.yearlyQuota !== null ? `${t.yearlyQuota} days` : 'Unlimited'}</strong>
                    </td>
                    <td className="py-[10px] px-[12px]">
                      <span className={`balance-paid-pill text-[10px] font-bold px-[7px] py-[2px] rounded-[4px] ${
                        t.isPaid
                          ? 'paid bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399]'
                          : 'unpaid bg-[#fef3c7] dark:bg-[#3b2d14] text-[#92400e] dark:text-[#fbbf24]'
                      }`}>
                        {t.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="py-[10px] px-[12px]">
                      {t.requiresDocument ? (
                        <span className="text-[#047857] dark:text-[#34d399] text-[11px] font-semibold inline-flex items-center gap-[3px]">
                          <Check size={12} /> Required
                        </span>
                      ) : (
                        <span className="text-[#9ca3af] dark:text-[#6b7280] text-[11px]">Optional</span>
                      )}
                    </td>
                    <td className="py-[10px] px-[12px]">
                      <button
                        type="button"
                        className={`status-toggle-btn inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold cursor-pointer border transition-all ${
                          t.isActive
                            ? 'active bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399] border-[#a7f3d0] dark:border-[#065f46]'
                            : 'inactive bg-[#f3f4f6] dark:bg-[#202923] text-[#6b7280] dark:text-[#9ca3af] border-[#d1d5db] dark:border-[#374151]'
                        }`}
                        onClick={() => handleToggle(t)}
                        title={t.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <Power size={11} />
                        <span>{t.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-[10px] px-[12px] text-right">
                      <div className="inline-flex gap-[6px]">
                        <button
                          type="button"
                          className="action-chip-btn w-[28px] h-[28px] inline-flex items-center justify-center rounded-[6px] border border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:bg-[#edf1eb] dark:hover:bg-[#25352c] cursor-pointer transition-all"
                          onClick={() => handleStartEdit(t)}
                          title="Edit leave type"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="action-chip-btn action-delete w-[28px] h-[28px] inline-flex items-center justify-center rounded-[6px] border border-[#dce2d7] dark:border-[#2a3d31] bg-white dark:bg-[#19231e] text-[#55675c] dark:text-[#c4d6cb] hover:text-[#dc2626] hover:border-[#fca5a5] hover:bg-[#fee2e2] dark:hover:bg-[#3b1c1c] cursor-pointer transition-all"
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

        <div className="modal-footer flex items-center justify-end px-[24px] py-[16px] border-t border-[#edf1eb] dark:border-[#25352c] bg-[#f7faf6] dark:bg-[#141c18]">
          <button type="button" className="secondary-action inline-flex items-center gap-[6px] px-[14px] py-[7px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
