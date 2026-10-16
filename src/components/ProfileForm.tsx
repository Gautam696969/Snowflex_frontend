import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Save, RotateCcw, User, Phone, MapPin, Briefcase, Calendar,
  Lock, AlertCircle, Loader2, Sparkles
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from './Skeleton'
import type { UserProfile, UpdateProfilePayload } from '../lib/profile-api'

interface ProfileFormProps {
  profile: UserProfile
  onSave: (payload: UpdateProfilePayload) => Promise<UserProfile>
  loading?: boolean
}

export default function ProfileForm({ profile, onSave, loading = false }: ProfileFormProps) {
  const isAdmin = profile.role === 'ADMIN'

  // Form state
  const [fullName, setFullName] = useState(profile.fullName || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [designation, setDesignation] = useState(profile.designation || '')
  const [address, setAddress] = useState(profile.address || '')
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '')
  const [gender, setGender] = useState(profile.gender || '')

  // Admin editable fields
  const [email, setEmail] = useState(profile.email || '')
  const [employeeCode, setEmployeeCode] = useState(profile.employeeCode || '')

  // Validation and saving states
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Reset local state when profile prop changes
  useEffect(() => {
    setFullName(profile.fullName || '')
    setPhone(profile.phone || '')
    setDesignation(profile.designation || '')
    setAddress(profile.address || '')
    setDateOfBirth(profile.dateOfBirth || '')
    setGender(profile.gender || '')
    setEmail(profile.email || '')
    setEmployeeCode(profile.employeeCode || '')
    setErrors({})
  }, [profile])

  // Compute dirty check
  const isDirty = useMemo(() => {
    return (
      fullName !== (profile.fullName || '') ||
      phone !== (profile.phone || '') ||
      designation !== (profile.designation || '') ||
      address !== (profile.address || '') ||
      dateOfBirth !== (profile.dateOfBirth || '') ||
      gender !== (profile.gender || '') ||
      (isAdmin && email !== (profile.email || '')) ||
      (isAdmin && employeeCode !== (profile.employeeCode || ''))
    )
  }, [fullName, phone, designation, address, dateOfBirth, gender, email, employeeCode, profile, isAdmin])

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required'
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Full name must contain at least 2 characters'
    }

    if (phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-().]{7,25}$/
      if (!phoneRegex.test(phone.trim())) {
        nextErrors.phone = 'Please enter a valid phone number format'
      }
    }

    if (isAdmin && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        nextErrors.email = 'Please enter a valid email address'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCancel = () => {
    setFullName(profile.fullName || '')
    setPhone(profile.phone || '')
    setDesignation(profile.designation || '')
    setAddress(profile.address || '')
    setDateOfBirth(profile.dateOfBirth || '')
    setGender(profile.gender || '')
    setEmail(profile.email || '')
    setEmployeeCode(profile.employeeCode || '')
    setErrors({})
    toast('Changes discarded', { icon: '↩️' })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate() || !isDirty || saving) return

    setSaving(true)
    try {
      const payload: UpdateProfilePayload = {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        designation: designation.trim() || null,
        address: address.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
      }

      if (isAdmin) {
        if (email.trim() && email.trim() !== profile.email) {
          payload.email = email.trim()
        }
        if (employeeCode.trim() && employeeCode.trim() !== profile.employeeCode) {
          payload.employeeCode = employeeCode.trim()
        }
      }

      await onSave(payload)
      toast.success('Profile saved successfully!')
      setErrors({})
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-form-skeleton">
        <Skeleton variant="rounded" width="240px" height="24px" className="mb-[20px]" />
        <div className="skeleton-grid">
          <Skeleton variant="rounded" width="100%" height="48px" />
          <Skeleton variant="rounded" width="100%" height="48px" />
          <Skeleton variant="rounded" width="100%" height="48px" />
          <Skeleton variant="rounded" width="100%" height="48px" />
        </div>
      </div>
    )
  }

  return (
    <form className="profile-form-card bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#27372e] rounded-[16px] p-[28px] shadow-[0_4px_20px_rgba(20,36,29,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] mb-[24px]" onSubmit={handleSubmit} noValidate>
      <div className="profile-form-header flex items-start justify-between gap-[16px] mb-[24px] pb-[18px] border-b border-[#edf1eb] dark:border-[#25352c] flex-wrap">
        <div>
          <span className="dash-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">PERSONAL INFORMATION</span>
          <h2 className="profile-card-title text-[18px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] my-[4px] tracking-[-0.01em]">Employee Details & Contact</h2>
          <p className="profile-card-sub text-[13px] text-[#65776d] dark:text-[#8c9d92] m-0">
            Update your public personal profile and verified contact coordinates.
          </p>
        </div>

        <div className="profile-form-actions-top flex items-center gap-[10px]">
          <button
            type="button"
            className="secondary-action btn-sm inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all disabled:opacity-50"
            onClick={handleCancel}
            disabled={!isDirty || saving}
            title="Reset form fields"
          >
            <RotateCcw size={14} />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="primary-action btn-sm inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all disabled:opacity-50"
            disabled={!isDirty || saving}
            title="Save changes to Snowflake"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="spinning animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="profile-fields-grid grid grid-cols-2 max-[760px]:grid-cols-1 gap-[20px]">
        {/* Full Name */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-fullName" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><User size={14} />Full Name <strong className="required-star text-[#dc2626]">*</strong></span>
          </label>
          <input
            id="profile-fullName"
            type="text"
            className={`profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)] ${errors.fullName ? 'has-error border-[#dc2626] bg-[#fffafa] dark:bg-[#201414]' : ''}`}
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }))
            }}
            required
          />
          {errors.fullName && (
            <span className="profile-field-error inline-flex items-center gap-[4px] text-[11px] text-[#dc2626] font-semibold mt-[2px]">
              <AlertCircle size={12} /> {errors.fullName}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-email" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span>Work Email</span>
            {!isAdmin && (
              <span className="readonly-badge inline-flex items-center gap-[4px] text-[10px] font-semibold text-[#7b8f83] dark:text-[#8c9d92] bg-[#f1f4ef] dark:bg-[#24352b] px-[7px] py-[2px] rounded-[4px]" title="Only administrators can edit work emails">
                <Lock size={11} /> Read-only
              </span>
            )}
          </label>
          <input
            id="profile-email"
            type="email"
            className={`profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)] ${!isAdmin ? 'is-readonly bg-[#f7faf6] dark:bg-[#17221c] text-[#65776d] dark:text-[#8c9d92] cursor-not-allowed border-[#e4ebe2] dark:border-[#25362b]' : ''} ${errors.email ? 'has-error border-[#dc2626] bg-[#fffafa] dark:bg-[#201414]' : ''}`}
            value={email}
            readOnly={!isAdmin}
            onChange={(e) => {
              if (isAdmin) {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
              }
            }}
          />
          {errors.email && (
            <span className="profile-field-error inline-flex items-center gap-[4px] text-[11px] text-[#dc2626] font-semibold mt-[2px]">
              <AlertCircle size={12} /> {errors.email}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-phone" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><Phone size={14} />Phone Number</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            className={`profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)] ${errors.phone ? 'has-error border-[#dc2626] bg-[#fffafa] dark:bg-[#201414]' : ''}`}
            placeholder="+1 555-0199"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
            }}
          />
          {errors.phone && (
            <span className="profile-field-error inline-flex items-center gap-[4px] text-[11px] text-[#dc2626] font-semibold mt-[2px]">
              <AlertCircle size={12} /> {errors.phone}
            </span>
          )}
        </div>

        {/* Designation / Job Title */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-designation" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><Briefcase size={14} />Job Title / Designation</span>
          </label>
          <input
            id="profile-designation"
            type="text"
            className="profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
            placeholder="e.g. Senior People Operations Analyst"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </div>

        {/* Employee Code */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-empCode" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span>Employee Code</span>
            {!isAdmin && (
              <span className="readonly-badge inline-flex items-center gap-[4px] text-[10px] font-semibold text-[#7b8f83] dark:text-[#8c9d92] bg-[#f1f4ef] dark:bg-[#24352b] px-[7px] py-[2px] rounded-[4px]" title="Assigned by organizational registry">
                <Lock size={11} /> Read-only
              </span>
            )}
          </label>
          <input
            id="profile-empCode"
            type="text"
            className={`profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)] ${!isAdmin ? 'is-readonly bg-[#f7faf6] dark:bg-[#17221c] text-[#65776d] dark:text-[#8c9d92] cursor-not-allowed border-[#e4ebe2] dark:border-[#25362b]' : ''}`}
            value={employeeCode}
            readOnly={!isAdmin}
            onChange={(e) => {
              if (isAdmin) setEmployeeCode(e.target.value)
            }}
          />
        </div>

        {/* Department Name */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-dept" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span>Department</span>
            <span className="readonly-badge inline-flex items-center gap-[4px] text-[10px] font-semibold text-[#7b8f83] dark:text-[#8c9d92] bg-[#f1f4ef] dark:bg-[#24352b] px-[7px] py-[2px] rounded-[4px]">
              <Lock size={11} /> Read-only
            </span>
          </label>
          <input
            id="profile-dept"
            type="text"
            className="profile-field-input is-readonly w-full px-[14px] py-[10px] text-[13px] text-[#65776d] dark:text-[#8c9d92] bg-[#f7faf6] dark:bg-[#17221c] border border-[#e4ebe2] dark:border-[#25362b] rounded-[8px] outline-none font-inherit cursor-not-allowed box-border"
            value={profile.departmentName || 'General Staff'}
            readOnly
          />
        </div>

        {/* Date of Birth */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-dob" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><Calendar size={14} />Date of Birth</span>
          </label>
          <input
            id="profile-dob"
            type="date"
            className="profile-field-input w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {/* Gender */}
        <div className="profile-field-group flex flex-col gap-[6px]">
          <label htmlFor="profile-gender" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span>Gender</span>
          </label>
          <select
            id="profile-gender"
            className="profile-field-select w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Physical Address */}
        <div className="profile-field-group full-width col-span-full flex flex-col gap-[6px]">
          <label htmlFor="profile-address" className="profile-field-label flex items-center justify-between text-[12px] font-bold text-[#2b3f34] dark:text-[#d8e5dc] tracking-[0.01em]">
            <span className="inline-flex items-center gap-[6px]"><MapPin size={14} />Residential / Mailing Address</span>
          </label>
          <textarea
            id="profile-address"
            rows={2}
            className="profile-field-textarea w-full px-[14px] py-[10px] text-[13px] text-[#193c33] dark:text-[#edf5ef] bg-white dark:bg-[#131a16] border border-[#dce2d7] dark:border-[#2a3d31] rounded-[8px] outline-none font-inherit transition-all duration-150 box-border focus:border-[#193c33] dark:focus:border-[#d9ed74] focus:ring-2 focus:ring-[rgba(25,60,51,0.12)] dark:focus:ring-[rgba(217,237,116,0.15)]"
            placeholder="Street address, city, state, postal code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {isDirty && (
        <div className="profile-dirty-banner mt-[24px] px-[18px] py-[12px] bg-[#f4faeb] dark:bg-[#1a251b] border border-[#cce89a] dark:border-[#344d2d] rounded-[10px] text-[#2e4a1a] dark:text-[#d9ed74] text-[13px] flex items-center gap-[10px] animate-[fadeIn_0.2s_ease]">
          <Sparkles size={16} />
          <span>You have unsaved edits. Click <strong>Save Changes</strong> to synchronize your record to Snowflake.</span>
        </div>
      )}
    </form>
  )
}
