'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { DollarSign } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { listPaymentDecisions, type PaymentDecisionRow } from '@/lib/supabase/governance'

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentDecisionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void listPaymentDecisions().then(data => {
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
      title="Payment & Escrow"
      subtitle={`${rows.length} governed payment decision${rows.length === 1 ? '' : 's'}`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <DollarSign className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No payments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-4 font-semibold text-muted">Job</th>
                <th className="py-2 pr-4 font-semibold text-muted">Payment</th>
                <th className="py-2 pr-4 font-semibold text-muted">Payout</th>
                <th className="py-2 pr-4 font-semibold text-muted">Base Fee</th>
                <th className="py-2 pr-4 font-semibold text-muted">Hold Premium</th>
                <th className="py-2 font-semibold text-muted">Blocked Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink">{row.jobId}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.paymentStatus}</td>
                  <td className="py-2.5 pr-4 text-muted">{row.payoutStatus}</td>
                  <td className="py-2.5 pr-4 text-muted">${row.baseFeeAmount.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-muted">${row.holdPremiumAmount.toFixed(2)}</td>
                  <td className="py-2.5 text-muted">{row.blockedReason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
