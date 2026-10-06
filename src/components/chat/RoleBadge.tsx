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
      badgeClass = 'chat-role-super-admin'
      break
    case 'ADMIN':
      icon = <Shield size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-admin'
      break
    case 'HR':
      icon = <Users size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-hr'
      break
    case 'MANAGER':
      icon = <Briefcase size={11} strokeWidth={2.2} />
      badgeClass = 'chat-role-manager'
      break
    default:
      icon = <User size={11} strokeWidth={2} />
      badgeClass = 'chat-role-employee'
      break
  }

  return (
    <span className={`chat-role-badge ${badgeClass} ${className}`.trim()}>
      {showIcon && icon}
      <span>{canonical}</span>
    </span>
  )
}
