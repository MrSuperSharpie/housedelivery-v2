import type { ReactNode } from 'react'
import { RoleGuard } from '@/lib/roleGuard'

// /builder/onboarding is the pre-approval flow — accessible to unapproved builders
const PUBLIC_PATHS = ['/builder/onboarding']

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRole="builder" publicPaths={PUBLIC_PATHS}>
      {children}
    </RoleGuard>
  )
}
