import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Save, RotateCcw, User, Phone, MapPin, Briefcase, Calendar,
  Lock, AlertCircle, Loader2, Sparkles
} from 'lucide-react'
import { toast } from 'react-hot-toast'
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
        <div className="skeleton-bar title-skeleton" />
        <div className="skeleton-grid">
          <div className="skeleton-box" />
          <div className="skeleton-box" />
          <div className="skeleton-box" />
          <div className="skeleton-box" />
        </div>
      </div>
    )
  }

  return (
    <form className="profile-form-card" onSubmit={handleSubmit} noValidate>
      <div className="profile-form-header">
        <div>
          <span className="dash-kicker">PERSONAL INFORMATION</span>
          <h2 className="profile-card-title">Employee Details & Contact</h2>
          <p className="profile-card-sub">
            Update your public personal profile and verified contact coordinates.
          </p>
        </div>

        <div className="profile-form-actions-top">
          <button
            type="button"
            className="secondary-action btn-sm"
            onClick={handleCancel}
            disabled={!isDirty || saving}
            title="Reset form fields"
          >
            <RotateCcw size={14} />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="primary-action btn-sm"
            disabled={!isDirty || saving}
            title="Save changes to Snowflake"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="spinning" />
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

      <div className="profile-fields-grid">
        {/* Full Name */}
        <div className="profile-field-group">
          <label htmlFor="profile-fullName" className="profile-field-label">
            <User size={14} />
            <span>Full Name <strong className="required-star">*</strong></span>
          </label>
          <input
            id="profile-fullName"
            type="text"
            className={`profile-field-input ${errors.fullName ? 'has-error' : ''}`}
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }))
            }}
            required
          />
          {errors.fullName && (
            <span className="profile-field-error">
              <AlertCircle size={12} /> {errors.fullName}
            </span>
          )}
        </div>

        {/* Email */}
        <div className="profile-field-group">
          <label htmlFor="profile-email" className="profile-field-label">
            <span>Work Email</span>
            {!isAdmin && (
              <span className="readonly-badge" title="Only administrators can edit work emails">
                <Lock size={11} /> Read-only
              </span>
            )}
          </label>
          <input
            id="profile-email"
            type="email"
            className={`profile-field-input ${!isAdmin ? 'is-readonly' : ''} ${errors.email ? 'has-error' : ''}`}
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
            <span className="profile-field-error">
              <AlertCircle size={12} /> {errors.email}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="profile-field-group">
          <label htmlFor="profile-phone" className="profile-field-label">
            <Phone size={14} />
            <span>Phone Number</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            className={`profile-field-input ${errors.phone ? 'has-error' : ''}`}
            placeholder="+1 555-0199"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
            }}
          />
          {errors.phone && (
            <span className="profile-field-error">
              <AlertCircle size={12} /> {errors.phone}
            </span>
          )}
        </div>

        {/* Designation / Job Title */}
        <div className="profile-field-group">
          <label htmlFor="profile-designation" className="profile-field-label">
            <Briefcase size={14} />
            <span>Job Title / Designation</span>
          </label>
          <input
            id="profile-designation"
            type="text"
            className="profile-field-input"
            placeholder="e.g. Senior People Operations Analyst"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </div>

        {/* Employee Code */}
        <div className="profile-field-group">
          <label htmlFor="profile-empCode" className="profile-field-label">
            <span>Employee Code</span>
            {!isAdmin && (
              <span className="readonly-badge" title="Assigned by organizational registry">
                <Lock size={11} /> Read-only
              </span>
            )}
          </label>
          <input
            id="profile-empCode"
            type="text"
            className={`profile-field-input ${!isAdmin ? 'is-readonly' : ''}`}
            value={employeeCode}
            readOnly={!isAdmin}
            onChange={(e) => {
              if (isAdmin) setEmployeeCode(e.target.value)
            }}
          />
        </div>

        {/* Department Name */}
        <div className="profile-field-group">
          <label htmlFor="profile-dept" className="profile-field-label">
            <span>Department</span>
            <span className="readonly-badge">
              <Lock size={11} /> Read-only
            </span>
          </label>
          <input
            id="profile-dept"
            type="text"
            className="profile-field-input is-readonly"
            value={profile.departmentName || 'General Staff'}
            readOnly
          />
        </div>

        {/* Date of Birth */}
        <div className="profile-field-group">
          <label htmlFor="profile-dob" className="profile-field-label">
            <Calendar size={14} />
            <span>Date of Birth</span>
          </label>
          <input
            id="profile-dob"
            type="date"
            className="profile-field-input"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {/* Gender */}
        <div className="profile-field-group">
          <label htmlFor="profile-gender" className="profile-field-label">
            <span>Gender</span>
          </label>
          <select
            id="profile-gender"
            className="profile-field-select"
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
        <div className="profile-field-group full-width">
          <label htmlFor="profile-address" className="profile-field-label">
            <MapPin size={14} />
            <span>Residential / Mailing Address</span>
          </label>
          <textarea
            id="profile-address"
            rows={2}
            className="profile-field-textarea"
            placeholder="Street address, city, state, postal code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {isDirty && (
        <div className="profile-dirty-banner">
          <Sparkles size={16} />
          <span>You have unsaved edits. Click <strong>Save Changes</strong> to synchronize your record to Snowflake.</span>
        </div>
      )}
    </form>
  )
}
