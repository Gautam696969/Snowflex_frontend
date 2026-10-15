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
    <article className="profile-header-card relative bg-white dark:bg-[#19231e] border border-[#dce2d7] dark:border-[#27372e] rounded-[16px] overflow-hidden shadow-[0_4px_20px_rgba(20,36,29,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] mb-[24px]">
      <div className="profile-header-cover relative h-[120px] bg-gradient-to-br from-[#14241d] via-[#1c362a] to-[#294d3c] overflow-hidden flex items-start justify-end px-[20px] py-[16px]">
        <div className="cover-glow absolute top-[-40px] left-[20%] w-[320px] h-[180px] bg-[radial-gradient(circle,rgba(217,237,116,0.25)_0%,transparent_70%)] blur-[40px] pointer-events-none" />
        <div className="cover-badge inline-flex items-center gap-[7px] px-[12px] py-[5px] bg-[rgba(20,36,29,0.65)] backdrop-blur-[8px] border border-[rgba(217,237,116,0.3)] rounded-full text-[#d9ed74] text-[10px] font-bold tracking-[0.08em]">
          <span className="cover-dot w-[6px] h-[6px] rounded-full bg-[#d9ed74] shadow-[0_0_8px_#d9ed74]" />
          <span>SNOWFLAKE VERIFIED IDENTITY</span>
        </div>
      </div>

      <div className="profile-header-main relative px-[28px] pb-[28px] pt-0 flex gap-[28px] items-start">
        <div className="profile-header-avatar-col mt-[-50px] shrink-0 z-[2]">
          <AvatarUploader
            fullName={profile.fullName}
            avatarUrl={profile.avatarUrl}
            onUpload={onUploadAvatar}
            onRemove={onRemoveAvatar}
          />
        </div>

        <div className="profile-header-details flex-1 pt-[14px] min-w-0">
          <div className="profile-name-row flex items-start justify-between gap-[16px] flex-wrap mb-[20px]">
            <div>
              <div className="profile-hero-topline flex items-center gap-[10px] flex-wrap mb-[6px]">
                <span className="dash-kicker text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#698571] dark:text-[#8ea596]">PERSONAL IDENTITY</span>
                <span className={`dash-role-badge role-${role.toLowerCase()} inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full text-[11px] font-bold`}>
                  <RoleIcon size={13} />
                  {role}
                </span>
                <span className="status-pill status-active inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-[#e8f7ee] dark:bg-[#1a3826] text-[#0f766e] dark:text-[#34d399] border border-[#a7f3d0] dark:border-[#065f46]">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  {profile.status || 'ACTIVE'}
                </span>
              </div>
              <h1 className="profile-full-name text-[26px] font-extrabold text-[#14241d] dark:text-[#f1f7f2] tracking-[-0.02em] m-0 mb-[4px]">{profile.fullName}</h1>
              <p className="profile-designation-text text-[14px] text-[#517154] dark:text-[#8c9d92] font-medium m-0">
                {profile.designation || 'Staff Member'}
              </p>
            </div>

            <div className="profile-quick-actions flex items-center gap-[10px]">
              <LogoutButton variant="danger" />
            </div>
          </div>

          {/* Quick attribute meta pills grid */}
          <div className="profile-meta-grid grid grid-cols-4 gap-[12px] pt-[16px] border-t border-[#edf1eb] dark:border-[#25352c]">
            <div className="profile-meta-item flex items-center gap-[10px] px-[14px] py-[10px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] min-w-0" title="Work Email">
              <Mail size={15} className="meta-icon text-[#3b5c42] dark:text-[#d9ed74] shrink-0" />
              <div className="meta-copy flex flex-col min-w-0">
                <small className="text-[9px] font-bold text-[#708477] tracking-[0.06em]">EMAIL ADDRESS</small>
                <strong className="text-[12px] text-[#193c33] dark:text-[#e2ede5] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{profile.email}</strong>
              </div>
            </div>

            <div className="profile-meta-item flex items-center gap-[10px] px-[14px] py-[10px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] min-w-0" title="Employee ID Code">
              <Hash size={15} className="meta-icon text-[#3b5c42] dark:text-[#d9ed74] shrink-0" />
              <div className="meta-copy flex flex-col min-w-0">
                <small className="text-[9px] font-bold text-[#708477] tracking-[0.06em]">EMPLOYEE CODE</small>
                <strong className="text-[12px] text-[#193c33] dark:text-[#e2ede5] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{profile.employeeCode || `EMP-${String(profile.id).padStart(6, '0')}`}</strong>
              </div>
            </div>

            <div className="profile-meta-item flex items-center gap-[10px] px-[14px] py-[10px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] min-w-0" title="Department">
              <Building2 size={15} className="meta-icon text-[#3b5c42] dark:text-[#d9ed74] shrink-0" />
              <div className="meta-copy flex flex-col min-w-0">
                <small className="text-[9px] font-bold text-[#708477] tracking-[0.06em]">ORGANIZATION TEAM</small>
                <strong className="text-[12px] text-[#193c33] dark:text-[#e2ede5] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{profile.departmentName || 'General Staff'}</strong>
              </div>
            </div>

            <div className="profile-meta-item flex items-center gap-[10px] px-[14px] py-[10px] bg-[#f7faf6] dark:bg-[#141c18] border border-[#e2ebd0] dark:border-[#25362b] rounded-[10px] min-w-0" title="Date of Onboarding">
              <Calendar size={15} className="meta-icon text-[#3b5c42] dark:text-[#d9ed74] shrink-0" />
              <div className="meta-copy flex flex-col min-w-0">
                <small className="text-[9px] font-bold text-[#708477] tracking-[0.06em]">JOINED DATE</small>
                <strong className="text-[12px] text-[#193c33] dark:text-[#e2ede5] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
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
