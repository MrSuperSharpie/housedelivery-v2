import type { ReactNode } from 'react'
import { RoleGuard } from '@/lib/roleGuard'

export default function AuditorLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRole="auditor">{children}</RoleGuard>
}
