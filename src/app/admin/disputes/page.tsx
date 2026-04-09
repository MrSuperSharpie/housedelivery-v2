'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { listDisputes, type DisputeRow } from '@/lib/supabase/governance'

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void listDisputes().then(data => {
      if (!mounted) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <AdminShell
      title="Disputes"
      subtitle={`${rows.filter(row => row.status === 'open').length} active · ${rows.length} total`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <ShieldAlert className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No disputes found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-4 font-semibold text-muted">Job</th>
                <th className="py-2 pr-4 font-semibold text-muted">Reason</th>
                <th className="py-2 pr-4 font-semibold text-muted">Status</th>
                <th className="py-2 pr-4 font-semibold text-muted">Commercial Block</th>
                <th className="py-2 font-semibold text-muted">Opened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink">{row.jobId}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.reason}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.status}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.commercialBlock ? 'Yes' : 'No'}</td>
                  <td className="py-2.5 text-muted">
                    {new Date(row.openedAt).toLocaleString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
