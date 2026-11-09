import { AdminShell } from '@/components/admin/AdminShell'
import { ChecklistMappingAuditClient } from '@/components/admin/ChecklistMappingAuditClient'
import { buildChecklistMappingAudit } from '@/lib/checklistMappingAudit'
import { requireAdmin } from '@/lib/adminGuard'

export const dynamic = 'force-dynamic'

export default async function ChecklistMappingAuditPage() {
  await requireAdmin()
  const audit = await buildChecklistMappingAudit()

  return (
    <AdminShell
      title="Checklist Mapping Audit"
      subtitle="Read-only comparison between the production TypeScript completion checklist and the DB-based jurisdiction template engine."
    >
      <ChecklistMappingAuditClient audit={audit} />
    </AdminShell>
  )
}
