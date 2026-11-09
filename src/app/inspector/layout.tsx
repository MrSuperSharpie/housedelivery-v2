import type { ReactNode } from 'react'
import { RoleGuard } from '@/lib/roleGuard'

// These sub-paths are pre-approval flows accessible without a confirmed inspector session
const PUBLIC_PATHS = [
  '/inspector/signup',
  '/inspector/onboarding',
  '/inspector/onboarding-status',
]

export default function InspectorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRole="inspector" publicPaths={PUBLIC_PATHS}>
      {children}
    </RoleGuard>
  )
}
