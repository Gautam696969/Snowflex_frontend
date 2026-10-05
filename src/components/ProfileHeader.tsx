import { Shield, Users, Briefcase, User, Mail, Hash, Building2, Calendar, CheckCircle2 } from 'lucide-react'
import AvatarUploader from './AvatarUploader'
import LogoutButton from './LogoutButton'
import type { UserProfile } from '../lib/profile-api'

interface ProfileHeaderProps {
  profile: UserProfile
  onUploadAvatar: (file: File) => Promise<string>
  onRemoveAvatar: () => Promise<void>
}

export default function ProfileHeader({
  profile,
  onUploadAvatar,
  onRemoveAvatar,
}: ProfileHeaderProps) {
  const role = profile.role || 'EMPLOYEE'
  const RoleIcon =
    role === 'ADMIN'
      ? Shield
      : role === 'HR'
        ? Users
        : role === 'MANAGER'
          ? Briefcase
          : User

  return (
    <article className="profile-header-card">
      <div className="profile-header-cover">
        <div className="cover-glow" />
        <div className="cover-badge">
          <span className="cover-dot" />
          <span>SNOWFLAKE VERIFIED IDENTITY</span>
        </div>
      </div>

      <div className="profile-header-main">
        <div className="profile-header-avatar-col">
          <AvatarUploader
            fullName={profile.fullName}
            avatarUrl={profile.avatarUrl}
            onUpload={onUploadAvatar}
            onRemove={onRemoveAvatar}
          />
        </div>

        <div className="profile-header-details">
          <div className="profile-name-row">
            <div>
              <div className="profile-hero-topline">
                <span className="dash-kicker">PERSONAL IDENTITY</span>
                <span className={`dash-role-badge role-${role.toLowerCase()}`}>
                  <RoleIcon size={13} />
                  {role}
                </span>
                <span className="status-pill status-active">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  {profile.status || 'ACTIVE'}
                </span>
              </div>
              <h1 className="profile-full-name">{profile.fullName}</h1>
              <p className="profile-designation-text">
                {profile.designation || 'Staff Member'}
              </p>
            </div>

            <div className="profile-quick-actions">
              <LogoutButton variant="danger" />
            </div>
          </div>

          {/* Quick attribute meta pills grid */}
          <div className="profile-meta-grid">
            <div className="profile-meta-item" title="Work Email">
              <Mail size={15} className="meta-icon" />
              <div className="meta-copy">
                <small>EMAIL ADDRESS</small>
                <strong>{profile.email}</strong>
              </div>
            </div>

            <div className="profile-meta-item" title="Employee ID Code">
              <Hash size={15} className="meta-icon" />
              <div className="meta-copy">
                <small>EMPLOYEE CODE</small>
                <strong>{profile.employeeCode || `EMP-${String(profile.id).padStart(6, '0')}`}</strong>
              </div>
            </div>

            <div className="profile-meta-item" title="Department">
              <Building2 size={15} className="meta-icon" />
              <div className="meta-copy">
                <small>ORGANIZATION TEAM</small>
                <strong>{profile.departmentName || 'General Staff'}</strong>
              </div>
            </div>

            <div className="profile-meta-item" title="Date of Onboarding">
              <Calendar size={15} className="meta-icon" />
              <div className="meta-copy">
                <small>JOINED DATE</small>
                <strong>
                  {profile.joiningDate
                    ? new Date(profile.joiningDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recently'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
