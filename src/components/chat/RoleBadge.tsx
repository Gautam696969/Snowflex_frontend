import { Shield, ShieldCheck, Users, Briefcase, User } from 'lucide-react'

interface RoleBadgeProps {
  role: string
  className?: string
  showIcon?: boolean
}

export default function RoleBadge({ role, className = '', showIcon = true }: RoleBadgeProps) {
  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, '_')
  const canonical = normalized === 'USER' ? 'EMPLOYEE' : normalized

  let icon = <User size={11} strokeWidth={2} />
  let badgeClass = 'chat-role-employee'

  switch (canonical) {
    case 'SUPER_ADMIN':
      icon = <ShieldCheck size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-super-admin bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'
      break
    case 'ADMIN':
      icon = <Shield size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-admin bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]'
      break
    case 'HR':
      icon = <Users size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-hr bg-[#fce7f3] text-[#9d174d] border border-[#fbcfe8]'
      break
    case 'MANAGER':
      icon = <Briefcase size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-manager bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
      break
    default:
      icon = <User size={11} strokeWidth={2} />
      badgeClass = 'chat-role-employee bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]'
      break
  }

  return (
    <span className={`chat-role-badge inline-flex items-center gap-[4px] px-[6px] py-[1px] rounded-[4px] text-[9.5px] font-bold font-['DM_Mono',monospace] tracking-[0.03em] uppercase ${badgeClass} ${className}`.trim()}>
      {showIcon && icon}
      <span>{canonical}</span>
    </span>
  )
}
