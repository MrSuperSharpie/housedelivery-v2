import type { ReactNode } from 'react'
import { RoleGuard } from '@/lib/roleGuard'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRole="admin">
      <div className="admin-theme-scope">{children}</div>
    </RoleGuard>
  )
}
