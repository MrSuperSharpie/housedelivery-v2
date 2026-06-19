import type { ReactNode } from 'react'
import { RoleGuard } from '@/lib/roleGuard'

// /builder/onboarding is the pre-approval flow — accessible to unapproved builders.
// /builder/payment-success is the public post-Stripe confirmation page; it renders
// without auth so the payment landing never depends on session hydration.
const PUBLIC_PATHS = ['/builder/onboarding', '/builder/payment-success']

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowedRole="builder" publicPaths={PUBLIC_PATHS}>
      {children}
    </RoleGuard>
  )
}
