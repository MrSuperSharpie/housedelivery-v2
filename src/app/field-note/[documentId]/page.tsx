import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'
import { formatCoordinates, formatDisplayTimestamp } from '@/lib/pdf/scheduleCBPacketHelpers'
import { PrintButton } from './PrintButton'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Field Note Record',
  robots: { index: false, follow: false },
}

const EVIDENCE_BUCKET = 'inspection-evidence'
// Short-lived link to the original raw evidence object — long enough to open,
// short enough not to leak. The private evidence is never made public.
const SIGNED_URL_TTL_SECONDS = 300
// Defensive cap so a malformed/oversized object never floods the record view.
const MAX_NOTE_BODY_CHARS = 20_000

const NOT_RECORDED = 'Not recorded'

// Mirrors DISCIPLINE_DISPLAY in the Schedule C-B route — readable labels for the
// onboarding discipline codes.
const DISCIPLINE_DISPLAY: Record<string, string> = {
  structural: 'Structural Engineering',
  mechanical: 'Mechanical Engineering',
  electrical: 'Electrical / Field Safety',
  architectural: 'Architectural',
  geotech: 'Geotechnical',
  plumbing: 'Plumbing',
  fire_protection: 'Fire Protection',
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatStageCode(stageNumber: number | null): string {
  if (stageNumber === null) return ''
  return `S${String(stageNumber).padStart(2, '0')}`
}

function resolveDiscipline(disciplines: unknown): string {
  if (!Array.isArray(disciplines)) return ''
  const codes = disciplines.filter((d): d is string => typeof d === 'string')
  if (codes.length === 0) return ''
  return codes.map(code => DISCIPLINE_DISPLAY[code] ?? code).join(', ')
}

interface MetaRow {
  label: string
  value: string
  mono?: boolean
}

/**
 * Formal, printable Vero Permit Field Note Record.
 *
 * Renders the human-facing record for one text/field-note evidence object. The
 * original raw .txt is preserved as the source artifact and remains reachable
 * via a short-lived signed link; this page never deletes or replaces it.
 *
 * Access is gated to the inspector who authored the report, the builder who owns
 * the job, or an admin — verified server-side with the service-role client.
 */
export default async function FieldNoteRecordPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId: rawDocumentId } = await params
  const documentId = str(rawDocumentId)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/field-note/${documentId}`)}`)
  }

  const service = getServiceClient()
  if (!service) {
    return <RecordUnavailable message="The record service is temporarily unavailable. Please try again shortly." />
  }
  if (!documentId) {
    return <RecordUnavailable message="No field note was specified." />
  }

  // 1. Evidence document → report linkage. The storage path is read from the DB,
  //    never trusted from the client.
  const { data: docData } = await service
    .from('inspector_completion_documents')
    .select('id, report_id, item_code, file_name, storage_path, mime_type, created_at, original_captured_at, capture_geo')
    .eq('id', documentId)
    .maybeSingle()

  if (!docData) {
    return <RecordUnavailable message="This field note record could not be found." />
  }
  const doc = docData as Record<string, unknown>
  const reportId = str(doc.report_id)

  // 2. Report (project + inspector + job linkage).
  const { data: reportData } = reportId
    ? await service
        .from('inspector_completion_reports')
        .select('id, job_id, assignment_id, inspector_id, project_name, address, city, region, current_stage, jurisdiction_name, ahj_overlay_label, seal_reference')
        .eq('id', reportId)
        .maybeSingle()
    : { data: null }

  const report = (reportData as Record<string, unknown> | null) ?? {}
  const inspectorId = str(report.inspector_id)
  const jobId = str(report.job_id)

  // 3. Job (builder owner + permit number + builder-facing stage label).
  const { data: jobData } = jobId
    ? await service
        .from('job_opportunities')
        .select('id, builder_id, permit_number, stage_name')
        .eq('id', jobId)
        .maybeSingle()
    : { data: null }
  const job = (jobData as Record<string, unknown> | null) ?? {}
  const builderId = str(job.builder_id)

  // ── Authorization: inspector of record, owning builder, or admin only ───────
  const { data: viewerProfile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const viewerRole = (viewerProfile as { role?: unknown } | null)?.role ?? user.user_metadata?.role
  const isAdmin = isAdminLikeRole(viewerRole)
  const isInspectorOfRecord = inspectorId !== '' && user.id === inspectorId
  const isOwningBuilder = builderId !== '' && user.id === builderId

  if (!isAdmin && !isInspectorOfRecord && !isOwningBuilder) {
    return <RecordUnavailable message="You do not have access to this field note record." />
  }

  // 4. Checklist context (requirement + section) for the note's item.
  const itemCode = str(doc.item_code)
  const { data: itemData } = reportId && itemCode
    ? await service
        .from('inspector_completion_stage_items')
        .select('item_code, item_label, stage_number, stage_name')
        .eq('report_id', reportId)
        .eq('item_code', itemCode)
        .maybeSingle()
    : { data: null }
  const item = (itemData as Record<string, unknown> | null) ?? {}

  // 5. Identities (service-role reads — RLS would otherwise hide cross-user rows).
  const [{ data: inspectorProfile }, { data: inspectorOnboarding }, { data: builderProfile }] = await Promise.all([
    inspectorId
      ? service.from('profiles').select('first_name, last_name, firm_name').eq('id', inspectorId).maybeSingle()
      : Promise.resolve({ data: null }),
    inspectorId
      ? service.from('inspector_onboarding_status').select('disciplines, license_number').eq('user_id', inspectorId).maybeSingle()
      : Promise.resolve({ data: null }),
    builderId
      ? service.from('profiles').select('first_name, last_name, firm_name').eq('id', builderId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const inspName = [str((inspectorProfile as Record<string, unknown> | null)?.first_name), str((inspectorProfile as Record<string, unknown> | null)?.last_name)]
    .filter(Boolean)
    .join(' ')
  const inspectorName = inspName || str((inspectorProfile as Record<string, unknown> | null)?.firm_name)
  const discipline = resolveDiscipline((inspectorOnboarding as Record<string, unknown> | null)?.disciplines)
  const license = str((inspectorOnboarding as Record<string, unknown> | null)?.license_number)
  const inspectorCredential = [discipline, license].filter(Boolean).join(' · ')

  const builderName = [str((builderProfile as Record<string, unknown> | null)?.first_name), str((builderProfile as Record<string, unknown> | null)?.last_name)]
    .filter(Boolean)
    .join(' ') || str((builderProfile as Record<string, unknown> | null)?.firm_name)

  // 6. The note body lives in the raw .txt object content. Download it for display
  //    (the original file is preserved, not modified).
  const storagePath = str(doc.storage_path)
  const mimeType = str(doc.mime_type)
  const fileName = str(doc.file_name)
  const isTextNote = mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')

  let noteBody = ''
  let noteBodyError = false
  let originalFileUrl = ''
  if (storagePath) {
    const { data: signed } = await service.storage.from(EVIDENCE_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
    originalFileUrl = signed?.signedUrl ?? ''

    if (isTextNote) {
      const { data: blob, error: downloadError } = await service.storage.from(EVIDENCE_BUCKET).download(storagePath)
      if (downloadError || !blob) {
        noteBodyError = true
      } else {
        const text = await blob.text()
        noteBody = text.length > MAX_NOTE_BODY_CHARS ? `${text.slice(0, MAX_NOTE_BODY_CHARS)}…` : text
      }
    }
  }

  // ── Assemble display values ─────────────────────────────────────────────────
  const stageNumber = num(item.stage_number) ?? num(report.current_stage)
  const stageName = str(item.stage_name)
  const itemLabel = str(item.item_label)
  const requirement = itemCode
    ? `Checklist ${formatStageCode(stageNumber)} · ${itemCode}${itemLabel ? ` — ${itemLabel}` : ''}`
    : ''
  const inspectionStage = [stageNumber !== null ? `Stage ${stageNumber}` : '', stageName].filter(Boolean).join(' — ')

  const captureGeo = (doc.capture_geo as Record<string, unknown> | null) ?? null
  const capturedAtIso = str(doc.original_captured_at) || str(doc.created_at)

  const addressParts = [str(report.address), str(report.city), str(report.region)].filter(Boolean)

  const metaRows: MetaRow[] = [
    { label: 'Project name', value: str(report.project_name) || NOT_RECORDED },
    { label: 'Project address', value: addressParts.join(', ') || NOT_RECORDED },
    { label: 'Permit / municipal file', value: str(job.permit_number) || NOT_RECORDED, mono: Boolean(str(job.permit_number)) },
    { label: 'Authority having jurisdiction', value: str(report.jurisdiction_name) || str(report.ahj_overlay_label) || NOT_RECORDED },
    { label: 'Builder', value: builderName || NOT_RECORDED },
    { label: 'Inspector', value: inspectorName || NOT_RECORDED },
    { label: 'Inspector discipline / credential', value: inspectorCredential || NOT_RECORDED },
    { label: 'Inspection stage', value: inspectionStage || NOT_RECORDED },
    { label: 'Checklist section', value: stageName || NOT_RECORDED },
    { label: 'Checklist requirement', value: requirement || NOT_RECORDED },
    { label: 'Captured', value: capturedAtIso ? formatDisplayTimestamp(capturedAtIso) : NOT_RECORDED },
    { label: 'Coordinates', value: captureGeo ? formatCoordinates(num(captureGeo.latitude), num(captureGeo.longitude)) : NOT_RECORDED, mono: true },
    { label: 'Original file name', value: fileName || NOT_RECORDED, mono: Boolean(fileName) },
    { label: 'Evidence file ID', value: documentId, mono: true },
    { label: 'Verification ID', value: str(report.seal_reference) || NOT_RECORDED, mono: Boolean(str(report.seal_reference)) },
    { label: 'Report packet ID', value: reportId || NOT_RECORDED, mono: Boolean(reportId) },
  ]

  return (
    <main className="field-note-record min-h-screen bg-[#f4f1ea] px-4 py-10 text-zinc-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .field-note-record { background: #ffffff !important; padding: 0 !important; }
          .field-note-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="mx-auto mb-5 flex max-w-3xl items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Vero Permit · Inspection Evidence File
        </span>
        <PrintButton />
      </div>

      <article className="field-note-sheet mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <header className="border-b border-zinc-200 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5F15]/30 bg-[#FF5F15]/[0.07] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F15]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c24d12]">Vero Permit</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-900">Field Note Record</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            Formal record of an inspector field note captured as part of the Vero Permit inspection evidence file.
          </p>
        </header>

        <section className="mt-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Field Note</h2>
          <div className="mt-3 rounded-xl border border-zinc-200 bg-[#faf9f6] p-5">
            {noteBody ? (
              <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-zinc-900">{noteBody}</p>
            ) : (
              <p className="text-sm italic text-zinc-500">
                {noteBodyError
                  ? 'The original field note text could not be loaded at this time.'
                  : isTextNote
                    ? 'This field note has no recorded message.'
                    : 'The linked evidence is not a text field note. Use the original evidence link below to view it.'}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Record Metadata</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <tbody>
              {metaRows.map(row => (
                <tr key={row.label} className="border-b border-zinc-100 align-top last:border-b-0">
                  <td className="w-[42%] py-2.5 pr-4 font-semibold text-zinc-500">{row.label}</td>
                  <td className={`py-2.5 text-zinc-900 ${row.mono ? 'font-mono text-[13px] break-all' : ''}`}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {originalFileUrl && (
          <section className="mt-7 no-print">
            <a
              href={originalFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#c24d12] hover:text-[#FF5F15]"
            >
              View original evidence file ({fileName || 'source object'})
            </a>
          </section>
        )}

        <footer className="mt-8 border-t border-zinc-200 pt-5 text-xs leading-relaxed text-zinc-400">
          This Field Note Record is part of the Vero Permit inspection evidence file. The original captured
          file is preserved unaltered as the source audit artifact. This document is a platform record and is
          not a building permit, occupancy authorization, or authority decision.
        </footer>
      </article>
    </main>
  )
}

function RecordUnavailable({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-4 py-10 text-zinc-900">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5F15]/30 bg-[#FF5F15]/[0.07] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F15]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c24d12]">Vero Permit</span>
        </div>
        <h1 className="mt-4 text-xl font-black text-zinc-900">Field Note Record</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{message}</p>
      </div>
    </main>
  )
}
