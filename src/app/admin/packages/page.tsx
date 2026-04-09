'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { listPackageSeals, type PackageSealRow } from '@/lib/supabase/governance'

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageSealRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void listPackageSeals().then(data => {
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
      title="Package Approvals"
      subtitle={`${rows.length} governed package${rows.length === 1 ? '' : 's'} tracked`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <Package className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No packages found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-4 font-semibold text-muted">Record</th>
                <th className="py-2 pr-4 font-semibold text-muted">Verification</th>
                <th className="py-2 pr-4 font-semibold text-muted">Hash</th>
                <th className="py-2 pr-4 font-semibold text-muted">Version</th>
                <th className="py-2 pr-4 font-semibold text-muted">Status</th>
                <th className="py-2 font-semibold text-muted">Sealed At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink">{row.recordId}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-flame">{row.verificationCode}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-muted">{row.packageHash.slice(0, 16)}…</td>
                  <td className="py-2.5 pr-4 text-muted">v{row.versionNumber}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.sealStatus}</td>
                  <td className="py-2.5 text-muted">
                    {new Date(row.sealedAt).toLocaleString('en-CA', {
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
