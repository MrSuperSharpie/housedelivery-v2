'use client'
export const dynamic = 'force-dynamic'

import React from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { DepartureInterventionsClient } from '@/components/admin/DepartureInterventionsClient'

export default function AdminInterventionsPage() {
  return (
    <AdminShell
      title="Departure Triage"
      subtitle="Resolve active hard pings, protected issues, standby recovery, and builder schedule risk without exposing internal penalty details."
    >
      <DepartureInterventionsClient />
    </AdminShell>
  )
}

