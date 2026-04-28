'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, ListChecks, Lock, Stamp, AlertCircle } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import type { InspectionStage, ChecklistItem, ChecklistResponse, StageLockState } from '@/lib/inspections/access'
import type { LockMap } from './page'

const PHASE_NAMES: Record<number, string> = {
  1: 'Excavation & Foundation',
  2: 'Structure',
  3: 'Mechanical Rough-In',
  4: 'Envelope & Insulation',
  5: 'Interior & Life Safety',
  6: 'Final',
}

interface SchemaDependency {
  stageNumber: number
  title: string
}

interface StageStatus {
  status: string
  sealedAt: string | null
  sealedByName: string | null
}

interface Props {
  visibleStages: InspectionStage[]
  selectedStageNumber: number | null
  selectedStage: InspectionStage | null
  checklistItems: ChecklistItem[]
  checklistResponses: ChecklistResponse[]
  schemaDependencies: SchemaDependency[]
  isAdmin: boolean
  permitId: string | null
  lockMap: LockMap
  // undefined = no permit; null = fetch error; StageLockState = loaded
  selectedLockState: StageLockState | null | undefined
  sealAllowed: boolean
  sealBlockReason: string | null
  checklistProgress: { completed: number; total: number }
  stageStatus: StageStatus | null
}

// ── Checklist row ─────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  status,
  notes: savedNotes,
  permitId,
  stageId,
  onUpdate,
}: {
  item: ChecklistItem
  status: string | undefined
  notes: string | undefined
  permitId: string
  stageId: string
  onUpdate: (itemId: string, newStatus: string, newNotes: string) => void
}) {
  const isCompleted = status === 'completed' || status === 'approved'
  const [notes, setNotes] = useState(savedNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doSave(completed: boolean, noteText: string): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/inspections/checklist-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitId,
          stageId,
          itemId: item.id,
          completed,
          notes: noteText || null,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Save failed. Try again.')
        return false
      }
      return true
    } catch {
      setError('Network error. Try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    if (saving) return
    const newCompleted = !isCompleted
    const newStatus = newCompleted ? 'completed' : 'pending'
    onUpdate(item.id, newStatus, notes)  // optimistic
    const ok = await doSave(newCompleted, notes)
    if (!ok) {
      onUpdate(item.id, status ?? 'pending', savedNotes ?? '')  // revert
    }
  }

  const handleNotesBlur = async () => {
    if (!isCompleted || saving) return
    if (notes === (savedNotes ?? '')) return  // unchanged
    onUpdate(item.id, status ?? 'completed', notes)
    await doSave(true, notes)
  }

  return (
    <li className={`rounded-xl border px-4 py-3 transition-colors ${
      isCompleted
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-blue-800/20 bg-blue-900/10'
    }`}>
      <label className="flex cursor-pointer items-start gap-3">
        {/* Hidden real checkbox for accessibility */}
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => void handleToggle()}
          disabled={saving}
          aria-label={item.label}
          className="sr-only"
        />
        {/* Visual checkbox */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            isCompleted
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-blue-600 bg-transparent'
          } ${saving ? 'opacity-40' : ''}`}
        >
          {isCompleted && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          {/* Label + required badge */}
          <div className="flex flex-wrap items-start gap-2">
            <span className={`text-sm font-medium leading-snug ${
              isCompleted ? 'text-emerald-400/70 line-through' : 'text-blue-100'
            }`}>
              {item.label}
            </span>
            {item.isRequired && (
              <span className="rounded border border-blue-700/40 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-blue-500">
                Required
              </span>
            )}
          </div>

          {/* Requirement text */}
          {item.requirementText && (
            <p className="text-xs leading-snug text-blue-500">{item.requirementText}</p>
          )}

          {/* Legal reference — secondary muted text */}
          {item.legalReference && (
            <p className="text-[10px] text-blue-700">{item.legalReference}</p>
          )}

          {/* Notes input — visible when completed */}
          {isCompleted && (
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => void handleNotesBlur()}
              placeholder="Add inspection note…"
              className="mt-1 w-full rounded-lg border border-blue-700/30 bg-blue-900/30 px-3 py-1.5 text-xs text-blue-200 placeholder-blue-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
          )}

          {/* Per-row save error */}
          {error && (
            <p className="text-xs text-red-400" role="alert">{error}</p>
          )}
        </div>
      </label>
    </li>
  )
}

// ── Seal button ───────────────────────────────────────────────────────────────

function SealButton({
  permitId,
  stageId,
  stageName,
  allowed,
  blockReason,
}: {
  permitId: string
  stageId: string
  stageName: string
  allowed: boolean
  blockReason: string | null
}) {
  const router = useRouter()
  const [sealing, setSealing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSeal = async () => {
    if (!allowed || sealing) return
    setSealing(true)
    setResult(null)
    try {
      const res = await fetch('/api/inspections/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permitId, stageId }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        setResult({ ok: true, message: `${stageName} sealed successfully.` })
        router.refresh()
      } else {
        setResult({ ok: false, message: json.error ?? 'Seal failed. Please try again.' })
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' })
    } finally {
      setSealing(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{result.message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleSeal()}
        disabled={!allowed || sealing}
        aria-disabled={!allowed || sealing}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
          allowed && !sealing
            ? 'bg-[#FF5F15] text-white hover:bg-[#e55513]'
            : 'cursor-not-allowed bg-blue-900/20 text-blue-700'
        }`}
      >
        <Stamp className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{sealing ? 'Sealing…' : 'Approve & Seal'}</span>
      </button>

      {!allowed && blockReason && (
        <p className="text-center text-xs text-blue-600" role="status">
          {blockReason}
        </p>
      )}

      {result && !result.ok && (
        <p className="text-center text-xs text-red-400" role="alert">
          {result.message}
        </p>
      )}
    </div>
  )
}

// ── Sealed state badge ────────────────────────────────────────────────────────

function SealedBadge({ sealedAt, sealedByName }: { sealedAt: string | null; sealedByName: string | null }) {
  const formattedDate = sealedAt
    ? new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(sealedAt))
    : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <Stamp className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-emerald-300">Stage Sealed</p>
        {formattedDate && (
          <p className="text-xs text-emerald-500">
            {formattedDate}{sealedByName ? ` · ${sealedByName}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Lock status panel ─────────────────────────────────────────────────────────

function LockPanel({ lockState }: { lockState: StageLockState | null | undefined }) {
  if (lockState === undefined) return null

  if (lockState === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-blue-800/30 bg-blue-900/10 px-3 py-2.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
        <span className="text-xs text-blue-600">Prerequisite status unavailable.</span>
      </div>
    )
  }

  if (!lockState.isLocked) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span className="text-xs text-emerald-400">All prerequisites sealed.</span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-blue-700/40 bg-blue-900/20 px-4 py-3"
      role="status"
      aria-label="Stage locked"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
        <span className="text-xs font-semibold text-blue-300">
          Locked until prerequisite seals are complete.
        </span>
      </div>
      {lockState.missingDependencies.length > 0 && (
        <ul className="space-y-1 pl-5" aria-label="Missing prerequisites">
          {lockState.missingDependencies.map(dep => (
            <li key={dep.stageId} className="text-xs text-blue-500">
              {dep.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Sidebar stage row ─────────────────────────────────────────────────────────

function StageSidebarRow({
  stage,
  isSelected,
  lockEntry,
  permitId,
}: {
  stage: InspectionStage
  isSelected: boolean
  lockEntry: StageLockState | null | undefined
  permitId: string | null
}) {
  const href = permitId
    ? `?permitId=${permitId}&stage=${stage.stageNumber}`
    : `?stage=${stage.stageNumber}`

  const isLocked = lockEntry?.isLocked

  return (
    <Link
      href={href}
      aria-current={isSelected ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
        isSelected
          ? 'border border-[#FF5F15]/30 bg-[#FF5F15]/10 text-white'
          : 'text-blue-300 hover:bg-blue-900/30 hover:text-white'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
          isSelected ? 'bg-[#FF5F15] text-white' : 'bg-blue-900/50 text-blue-500'
        }`}
        aria-hidden="true"
      >
        {stage.stageNumber}
      </span>

      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
        {stage.title}
      </span>

      {/* Lock indicator — only when permit context present */}
      {permitId && lockEntry !== undefined && (
        <span
          aria-label={lockEntry === null ? 'Status unavailable' : lockEntry.isLocked ? 'Locked' : 'Unlocked'}
          className="shrink-0"
        >
          {lockEntry === null ? (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-800" aria-hidden="true" />
          ) : isLocked ? (
            <Lock className="h-3 w-3 text-blue-600" aria-hidden="true" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          )}
        </span>
      )}
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StagesClient({
  visibleStages,
  selectedStageNumber,
  selectedStage,
  checklistItems,
  checklistResponses,
  schemaDependencies,
  isAdmin,
  permitId,
  lockMap,
  selectedLockState,
  sealAllowed,
  sealBlockReason,
  stageStatus,
}: Props) {
  const isOutOfScope = selectedStageNumber !== null && selectedStage === null

  // ── Client-side response state ────────────────────────────────────────────
  // Initialized from server-fetched responses; updated optimistically on toggle.
  const [localResponses, setLocalResponses] = useState<Record<string, { status: string; notes: string }>>(() => {
    const init: Record<string, { status: string; notes: string }> = {}
    for (const r of checklistResponses) {
      init[r.itemId] = { status: r.status, notes: r.notes ?? '' }
    }
    return init
  })

  function handleResponseUpdate(itemId: string, newStatus: string, newNotes: string) {
    setLocalResponses(prev => ({ ...prev, [itemId]: { status: newStatus, notes: newNotes } }))
  }

  // ── Client-side seal gate override ───────────────────────────────────────
  // If the server blocked only because of checklist, unlock once all required
  // items are locally marked complete (server validates again on submit).
  const requiredItems = checklistItems.filter(i => i.isRequired)
  const allRequiredComplete = requiredItems.length === 0 || requiredItems.every(i => {
    const s = localResponses[i.id]?.status
    return s === 'completed' || s === 'approved'
  })
  const effectiveSealAllowed = sealAllowed || (
    sealBlockReason === 'Complete all required checklist items first.' && allRequiredComplete
  )
  const effectiveSealBlockReason = effectiveSealAllowed ? null : sealBlockReason

  // ── Live progress from local state ───────────────────────────────────────
  const localCompleted = requiredItems.filter(i => {
    const s = localResponses[i.id]?.status
    return s === 'completed' || s === 'approved'
  }).length

  // Group visible stages by phase
  const phases: Record<number, InspectionStage[]> = {}
  for (const s of visibleStages) {
    if (!phases[s.phaseNumber]) phases[s.phaseNumber] = []
    phases[s.phaseNumber].push(s)
  }
  const sortedPhaseNumbers = Object.keys(phases).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-[#060B15] text-white">
      <Navbar role="inspector" />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-6 md:flex-row">

          {/* ── Sidebar ── */}
          <aside className="md:w-64 md:shrink-0" aria-label="Inspection stages">
            <div className="md:sticky md:top-6">

              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Your Stages
                </span>
                {isAdmin && (
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    Full inspection scope
                  </span>
                )}
              </div>

              {visibleStages.length === 0 ? (
                <p className="px-1 text-xs text-blue-700">No stages assigned to your specialty.</p>
              ) : (
                <div className="space-y-4">
                  {sortedPhaseNumbers.map(phaseNum => (
                    <div key={phaseNum}>
                      <div className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">
                        Phase {phaseNum} — {PHASE_NAMES[phaseNum] ?? ''}
                      </div>
                      <div className="space-y-0.5">
                        {phases[phaseNum].map(stage => (
                          <StageSidebarRow
                            key={stage.id}
                            stage={stage}
                            isSelected={selectedStage?.id === stage.id}
                            lockEntry={permitId ? lockMap[stage.id] : undefined}
                            permitId={permitId}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── Main viewer ── */}
          <main className="min-w-0 flex-1">

            {/* Out of scope */}
            {isOutOfScope && (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-blue-800/40 bg-blue-900/30">
                  <Lock className="h-5 w-5 text-blue-600" aria-hidden="true" />
                </div>
                <p className="font-semibold text-blue-400">
                  This stage is outside your inspection scope.
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Select a stage from the sidebar to continue.
                </p>
              </div>
            )}

            {/* Nothing selected */}
            {!isOutOfScope && !selectedStage && (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <ListChecks className="mb-3 h-8 w-8 text-blue-800" aria-hidden="true" />
                <p className="text-sm text-blue-600">Select a stage from the sidebar.</p>
              </div>
            )}

            {/* Stage detail */}
            {selectedStage && (
              <div>
                {/* Stage header card */}
                <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-900/10 p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#FF5F15]/30 bg-[#FF5F15]/10"
                      aria-hidden="true"
                    >
                      <span className="text-lg font-black text-[#FF5F15]">{selectedStage.stageNumber}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="mb-2 text-xl font-black">{selectedStage.title}</h1>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-md border border-blue-700/30 bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                          Phase {selectedStage.phaseNumber}
                        </span>
                        {selectedStage.discipline && (
                          <span className="rounded-md border border-slate-600/30 bg-slate-700/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                            {selectedStage.discipline.replace(/_/g, ' ')}
                          </span>
                        )}
                        {selectedStage.requiresMasterSeal && (
                          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                            All disciplines
                          </span>
                        )}
                        <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lock status (permit context) OR schema prerequisites (reference view) */}
                  <div className="mt-4 border-t border-blue-800/30 pt-4 space-y-3">
                    {permitId ? (
                      <LockPanel lockState={selectedLockState} />
                    ) : (
                      schemaDependencies.length > 0 && (
                        <>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                            Prerequisites
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {schemaDependencies.map(dep => (
                              <span
                                key={dep.stageNumber}
                                className="rounded-lg border border-blue-700/30 bg-blue-900/30 px-2.5 py-1 text-xs text-blue-300"
                              >
                                {dep.stageNumber}. {dep.title}
                              </span>
                            ))}
                          </div>
                        </>
                      )
                    )}

                    {/* Seal action — only when permit context is present */}
                    {permitId && (
                      stageStatus?.status === 'sealed' ? (
                        <SealedBadge
                          sealedAt={stageStatus.sealedAt}
                          sealedByName={stageStatus.sealedByName}
                        />
                      ) : (
                        <SealButton
                          permitId={permitId}
                          stageId={selectedStage.id}
                          stageName={selectedStage.title}
                          allowed={effectiveSealAllowed}
                          blockReason={effectiveSealBlockReason}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" aria-hidden="true" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                        Checklist{checklistItems.length > 0 ? ` (${checklistItems.length})` : ''}
                      </span>
                    </div>
                    {/* Progress counter — live from local state */}
                    {permitId && requiredItems.length > 0 && (
                      <span className={`text-[10px] ${
                        allRequiredComplete ? 'text-emerald-500' : 'text-blue-600'
                      }`}>
                        {localCompleted} / {requiredItems.length} required complete
                      </span>
                    )}
                  </div>

                  {checklistItems.length === 0 ? (
                    <p className="py-8 text-center text-xs text-blue-700">
                      No checklist template assigned for this stage.
                    </p>
                  ) : (
                    <ul className="space-y-2" aria-label="Checklist items">
                      {checklistItems.map(item => (
                        permitId ? (
                          <ChecklistRow
                            key={item.id}
                            item={item}
                            status={localResponses[item.id]?.status}
                            notes={localResponses[item.id]?.notes}
                            permitId={permitId}
                            stageId={selectedStage.id}
                            onUpdate={handleResponseUpdate}
                          />
                        ) : (
                          // Reference view (no permit): static display
                          <li
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl border border-blue-800/20 bg-blue-900/10 px-4 py-3"
                          >
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-blue-700/40" aria-hidden="true" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-start gap-2">
                                <span className="text-sm font-medium text-blue-100">{item.label}</span>
                                {item.isRequired && (
                                  <span className="rounded border border-blue-700/40 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-blue-500">
                                    Required
                                  </span>
                                )}
                              </div>
                              {item.requirementText && (
                                <p className="text-xs leading-snug text-blue-500">{item.requirementText}</p>
                              )}
                              {item.legalReference && (
                                <p className="text-[10px] text-blue-700">{item.legalReference}</p>
                              )}
                            </div>
                          </li>
                        )
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
