'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import {
  listGovernanceAuditEvents,
  type GovernanceAuditEventRow,
} from '@/lib/supabase/governance'

export default function AdminAuditPage() {
  const [rows, setRows] = useState<GovernanceAuditEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    void listGovernanceAuditEvents(150).then(data => {
      if (!mounted) return
      setRows(data)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <AdminShell title="Audit Log" subtitle="Immutable record of all admin decisions and system events">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <ScrollText className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No audit events found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-4 font-semibold text-muted">When</th>
                <th className="py-2 pr-4 font-semibold text-muted">Action</th>
                <th className="py-2 pr-4 font-semibold text-muted">Entity</th>
                <th className="py-2 pr-4 font-semibold text-muted">Actor</th>
                <th className="py-2 pr-4 font-semibold text-muted">Rules</th>
                <th className="py-2 font-semibold text-muted">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-white/5 align-top">
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted">
                    {new Date(row.createdAt).toLocaleString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-ink">{row.action}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.entityType}:{row.entityId}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.actorRole ?? 'system'}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-flame">
                    {row.ruleIds.length > 0 ? row.ruleIds.join(', ') : '—'}
                  </td>
                  <td className="py-2.5 text-muted">{row.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
