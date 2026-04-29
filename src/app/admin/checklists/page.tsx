'use client'
export const dynamic = 'force-dynamic'

import React, { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Jurisdiction {
  id: string
  slug: string
  name: string
  codeVersion: string | null
  effectiveDate: string | null
}

interface Stage {
  id: string
  stageNumber: number
  slug: string
  title: string
}

interface Template {
  id: string
  stageId: string
  jurisdictionId: string
  title: string
  version: number
  isActive: boolean
  effectiveFrom: string | null
}

interface Item {
  id: string
  templateId: string
  sortOrder: number
  label: string
  requirementText: string
  itemType: string
  isRequired: boolean
  legalReference: string | null
  sourceTitle: string | null
  sourceUrl: string | null
  adminNotes: string | null
  isActive: boolean
}

type ItemDraft = Omit<Item, 'id' | 'templateId' | 'itemType' | 'isActive'>

const EMPTY_DRAFT: ItemDraft = {
  sortOrder: 1,
  label: '',
  requirementText: '',
  isRequired: true,
  legalReference: '',
  sourceTitle: '',
  sourceUrl: '',
  adminNotes: '',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminChecklistsPage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [template, setTemplate] = useState<Template | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [responseCount, setResponseCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ItemDraft>(EMPTY_DRAFT)
  const [addingNew, setAddingNew] = useState(false)
  const [newDraft, setNewDraft] = useState<ItemDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Initial load: fetch jurisdictions + stages
  useEffect(() => {
    void fetch('/api/admin/checklists')
      .then(r => r.json() as Promise<{ ok: boolean; jurisdictions: Jurisdiction[]; stages: Stage[] }>)
      .then(payload => {
        if (payload.ok) {
          setJurisdictions(payload.jurisdictions)
          setStages(payload.stages)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Fetch template + items when both selectors are set
  const fetchTemplate = useCallback(async (jId: string, sId: string) => {
    if (!jId || !sId) return
    setTemplateLoading(true)
    setEditingId(null)
    setAddingNew(false)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/checklists?jurisdictionId=${jId}&stageId=${sId}`)
      const payload = await r.json() as { ok: boolean; template: Template | null; items: Item[]; responseCount: number }
      if (payload.ok) {
        setTemplate(payload.template)
        setItems(payload.items)
        setResponseCount(payload.responseCount)
      }
    } finally {
      setTemplateLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedJurisdictionId && selectedStageId) {
      void fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setTemplate(null)
      setItems([])
      setResponseCount(0)
    }
  }, [selectedJurisdictionId, selectedStageId, fetchTemplate])

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditDraft({
      sortOrder: item.sortOrder,
      label: item.label,
      requirementText: item.requirementText,
      isRequired: item.isRequired,
      legalReference: item.legalReference ?? '',
      sourceTitle: item.sourceTitle ?? '',
      sourceUrl: item.sourceUrl ?? '',
      adminNotes: item.adminNotes ?? '',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setMsg(null)
    const r = await fetch(`/api/admin/checklists/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sortOrder: editDraft.sortOrder,
        label: editDraft.label,
        requirementText: editDraft.requirementText,
        isRequired: editDraft.isRequired,
        legalReference: editDraft.legalReference || null,
        sourceTitle: editDraft.sourceTitle || null,
        sourceUrl: editDraft.sourceUrl || null,
        adminNotes: editDraft.adminNotes || null,
      }),
    })
    const payload = await r.json() as { ok: boolean; error?: string }
    setSaving(false)
    if (payload.ok) {
      setEditingId(null)
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Save failed.')
    }
  }

  async function deactivateItem(id: string) {
    if (!confirm('Deactivate this checklist item? It will no longer appear for new inspections.')) return
    setSaving(true)
    const r = await fetch(`/api/admin/checklists/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    const payload = await r.json() as { ok: boolean; error?: string }
    setSaving(false)
    if (payload.ok) {
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Deactivation failed.')
    }
  }

  async function reactivateItem(id: string) {
    setSaving(true)
    const r = await fetch(`/api/admin/checklists/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    const payload = await r.json() as { ok: boolean; error?: string }
    setSaving(false)
    if (payload.ok) {
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Reactivation failed.')
    }
  }

  async function addItem() {
    if (!template || !newDraft.label.trim() || !newDraft.requirementText.trim()) {
      setMsg('Label and Requirement Text are required.')
      return
    }
    setSaving(true)
    setMsg(null)
    const r = await fetch('/api/admin/checklists/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        sortOrder: newDraft.sortOrder,
        label: newDraft.label,
        requirementText: newDraft.requirementText,
        isRequired: newDraft.isRequired,
        legalReference: newDraft.legalReference || null,
        sourceTitle: newDraft.sourceTitle || null,
        sourceUrl: newDraft.sourceUrl || null,
        adminNotes: newDraft.adminNotes || null,
      }),
    })
    const payload = await r.json() as { ok: boolean; error?: string }
    setSaving(false)
    if (payload.ok) {
      setAddingNew(false)
      setNewDraft(EMPTY_DRAFT)
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Add item failed.')
    }
  }

  async function deactivateTemplate() {
    if (!template) return
    if (!confirm('Deactivate this template? Inspectors will no longer see a checklist for this stage/jurisdiction until a new version is activated.')) return
    setSaving(true)
    const r = await fetch(`/api/admin/checklists/templates/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    const payload = await r.json() as { ok: boolean; error?: string }
    setSaving(false)
    if (payload.ok) {
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Deactivation failed.')
    }
  }

  async function createNewVersion() {
    if (!template) return
    if (!confirm(`Create Version ${template.version + 1}? Active checklist items will be copied from Version ${template.version}.`)) return
    setSaving(true)
    setMsg(null)
    const r = await fetch(`/api/admin/checklists/templates/${template.id}/new-version`, {
      method: 'POST',
    })
    const payload = await r.json() as { ok: boolean; newVersion?: number; error?: string }
    setSaving(false)
    if (payload.ok) {
      setMsg(`Version ${payload.newVersion} created. Showing new version.`)
      fetchTemplate(selectedJurisdictionId, selectedStageId)
    } else {
      setMsg(payload.error ?? 'Failed to create new version.')
    }
  }

  const selectedJurisdiction = jurisdictions.find(j => j.id === selectedJurisdictionId)
  const selectedStage = stages.find(s => s.id === selectedStageId)

  return (
    <AdminShell
      title="Checklist Templates"
      subtitle="Edit inspection stage checklists by jurisdiction. Create new versions when permit responses already exist to preserve audit history."
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">

          {/* Selectors */}
          <section className="rounded-xl border border-white/8 bg-white/5 p-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-subtle mb-3">
              Select Template
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="jurisdiction-select">
                  Jurisdiction
                </label>
                <select
                  id="jurisdiction-select"
                  value={selectedJurisdictionId}
                  onChange={e => setSelectedJurisdictionId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2.5 text-sm text-ink focus:border-flame/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-flame/40"
                >
                  <option value="">— Select jurisdiction —</option>
                  {jurisdictions.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="stage-select">
                  Stage
                </label>
                <select
                  id="stage-select"
                  value={selectedStageId}
                  onChange={e => setSelectedStageId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2.5 text-sm text-ink focus:border-flame/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-flame/40"
                >
                  <option value="">— Select stage —</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>Stage {s.stageNumber} — {s.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Template panel */}
          {selectedJurisdictionId && selectedStageId && (
            templateLoading ? (
              <Spinner />
            ) : template ? (
              <div className="space-y-6">

                {/* Template header */}
                <section className="rounded-xl border border-white/8 bg-white/5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black text-ink">{template.title}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${template.isActive ? 'border-success-green/25 bg-success-green/10 text-success-green' : 'border-white/10 bg-white/5 text-muted'}`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                        <span className="text-subtle">Jurisdiction <span className="text-ink/70">{selectedJurisdiction?.name}</span></span>
                        {selectedJurisdiction?.codeVersion && (
                          <span className="text-subtle">Code Version <span className="text-ink/70">{selectedJurisdiction.codeVersion}</span></span>
                        )}
                        <span className="text-subtle">Version <span className="text-ink/70">{template.version}</span></span>
                        {template.effectiveFrom && (
                          <span className="text-subtle">From <span className="text-ink/70">{formatDate(template.effectiveFrom)}</span></span>
                        )}
                        {selectedStage && (
                          <span className="text-subtle">Stage <span className="text-ink/70">{selectedStage.stageNumber} — {selectedStage.title}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminBtn onClick={createNewVersion} disabled={saving}>
                        Create New Version
                      </AdminBtn>
                      {template.isActive ? (
                        <AdminBtn variant="warn" onClick={deactivateTemplate} disabled={saving}>
                          Deactivate Template
                        </AdminBtn>
                      ) : (
                        <AdminBtn onClick={async () => {
                          setSaving(true)
                          const r = await fetch(`/api/admin/checklists/templates/${template.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isActive: true }),
                          })
                          const payload = await r.json() as { ok: boolean; error?: string }
                          setSaving(false)
                          if (payload.ok) fetchTemplate(selectedJurisdictionId, selectedStageId)
                          else setMsg(payload.error ?? 'Failed.')
                        }} disabled={saving}>
                          Reactivate Template
                        </AdminBtn>
                      )}
                    </div>
                  </div>

                  {responseCount > 0 && (
                    <div className="mt-4 rounded-xl border border-warning-amber/25 bg-warning-amber/10 px-4 py-3 text-xs text-warning-amber">
                      <span className="font-black">{responseCount} permit response{responseCount !== 1 ? 's' : ''} exist</span> for this template.
                      Use <strong>Create New Version</strong> to preserve audit history before making changes.
                    </div>
                  )}
                </section>

                {/* Action message */}
                {msg && (
                  <div role="alert" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted">
                    {msg}
                  </div>
                )}

                {/* Items list */}
                <section className="rounded-xl border border-white/8 bg-white/5 p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-ink">Checklist Items</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {items.filter(i => i.isActive).length} active · {items.filter(i => !i.isActive).length} inactive
                      </p>
                    </div>
                    {template.isActive && (
                      <button
                        onClick={() => { setAddingNew(true); setNewDraft({ ...EMPTY_DRAFT, sortOrder: (items.filter(i => i.isActive).length + 1) }) }}
                        disabled={saving || addingNew}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-muted transition-all hover:border-white/15 hover:bg-white/10 hover:text-ink disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Checklist Item
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {items.length === 0 && !addingNew && (
                      <EmptyState text={template.isActive ? 'No checklist items yet. Use the button to add the first item.' : 'No checklist items on this template.'} />
                    )}

                    {items.map(item => (
                      editingId === item.id ? (
                        <ItemEditForm
                          key={item.id}
                          draft={editDraft}
                          onChange={setEditDraft}
                          onSave={() => void saveEdit(item.id)}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                        />
                      ) : (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onEdit={() => startEdit(item)}
                          onDeactivate={() => void deactivateItem(item.id)}
                          onReactivate={() => void reactivateItem(item.id)}
                          canEdit={template.isActive}
                        />
                      )
                    ))}

                    {addingNew && (
                      <div className="mt-2 border-t border-white/8 pt-5">
                        <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-flame/70">
                          New Checklist Item
                        </div>
                        <ItemEditForm
                          draft={newDraft}
                          onChange={setNewDraft}
                          onSave={() => void addItem()}
                          onCancel={() => { setAddingNew(false); setMsg(null) }}
                          saving={saving}
                          submitLabel="Add Item"
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <section className="rounded-xl border border-white/8 bg-white/5 p-10 text-center">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 text-subtle" />
                <div className="text-sm font-bold text-ink">No Checklist Template Assigned</div>
                <p className="mt-1 text-xs text-muted">
                  No template exists for this stage and jurisdiction. Add one via a database migration or the seeds file.
                </p>
              </section>
            )
          )}
        </div>
      )}
    </AdminShell>
  )
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onDeactivate,
  onReactivate,
  canEdit,
}: {
  item: Item
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
  canEdit: boolean
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${item.isActive ? 'border-white/8 bg-surface/50' : 'border-white/5 bg-white/2 opacity-50'}`}>
      <div className="flex items-start gap-4">
        <div className="w-7 shrink-0 pt-0.5 text-right">
          <span className="font-mono text-xs font-bold text-subtle">{String(item.sortOrder).padStart(2, '0')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink">{item.label}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${item.isRequired ? 'border-electric/25 bg-electric/10 text-electric' : 'border-white/10 bg-white/5 text-muted'}`}>
              {item.isRequired ? 'Required' : 'Optional'}
            </span>
            {!item.isActive && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted">{item.requirementText}</p>
          {item.legalReference && (
            <p className="mt-1.5 text-[11px] text-subtle">{item.legalReference}</p>
          )}
          {item.sourceTitle && (
            <p className="mt-0.5 text-[11px] text-subtle">
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted">
                  {item.sourceTitle}
                </a>
              ) : item.sourceTitle}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1.5">
            {item.isActive ? (
              <>
                <AdminBtn size="xs" onClick={onEdit} aria-label={`Edit ${item.label}`}>Edit</AdminBtn>
                <AdminBtn size="xs" variant="warn" onClick={onDeactivate} aria-label={`Deactivate ${item.label}`}>Deactivate</AdminBtn>
              </>
            ) : (
              <AdminBtn size="xs" onClick={onReactivate} aria-label={`Reactivate ${item.label}`}>Reactivate</AdminBtn>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Item edit form ───────────────────────────────────────────────────────────

function ItemEditForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  submitLabel = 'Save Changes',
}: {
  draft: ItemDraft
  onChange: (d: ItemDraft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  submitLabel?: string
}) {
  function set<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    onChange({ ...draft, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sort Order">
          <input
            type="number"
            value={draft.sortOrder}
            onChange={e => set('sortOrder', parseInt(e.target.value, 10) || 1)}
            className={fieldClass}
          />
        </Field>
        <Field label="Required">
          <select
            value={draft.isRequired ? 'yes' : 'no'}
            onChange={e => set('isRequired', e.target.value === 'yes')}
            className={fieldClass}
          >
            <option value="yes">Required</option>
            <option value="no">Optional</option>
          </select>
        </Field>
      </div>
      <Field label="Label">
        <input
          type="text"
          value={draft.label}
          onChange={e => set('label', e.target.value)}
          placeholder="Short item name shown in the checklist"
          className={fieldClass}
          autoFocus
        />
      </Field>
      <Field label="Requirement Text">
        <textarea
          value={draft.requirementText}
          onChange={e => set('requirementText', e.target.value)}
          placeholder="Full compliance requirement text displayed to inspectors"
          rows={3}
          className={`${fieldClass} resize-y`}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Legal Reference">
          <input
            type="text"
            value={draft.legalReference ?? ''}
            onChange={e => set('legalReference', e.target.value)}
            placeholder="e.g. BCBC 2024 Schedule B, Electrical 6.1"
            className={fieldClass}
          />
        </Field>
        <Field label="Source Title">
          <input
            type="text"
            value={draft.sourceTitle ?? ''}
            onChange={e => set('sourceTitle', e.target.value)}
            placeholder="e.g. BC Building Code 2024 — Schedule B"
            className={fieldClass}
          />
        </Field>
      </div>
      <Field label="Source URL">
        <input
          type="url"
          value={draft.sourceUrl ?? ''}
          onChange={e => set('sourceUrl', e.target.value)}
          placeholder="https://..."
          className={fieldClass}
        />
      </Field>
      <Field label="Admin Notes">
        <textarea
          value={draft.adminNotes ?? ''}
          onChange={e => set('adminNotes', e.target.value)}
          placeholder="Internal notes — not shown to inspectors"
          rows={2}
          className={`${fieldClass} resize-y`}
        />
      </Field>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !draft.label.trim() || !draft.requirementText.trim()}
          className="rounded-xl border border-flame/30 bg-flame/15 px-4 py-2 text-xs font-bold text-flame transition-all hover:bg-flame/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-muted transition-all hover:bg-white/10 hover:text-ink disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────

const fieldClass = 'w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-flame/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-flame/40'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      {children}
    </div>
  )
}

function AdminBtn({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'sm',
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'warn'
  size?: 'sm' | 'xs'
  'aria-label'?: string
}) {
  const sizeClass = size === 'xs'
    ? 'px-2.5 py-1.5 text-[10px]'
    : 'px-3.5 py-2 text-xs'

  const colorClass = variant === 'warn'
    ? 'border-warning-amber/25 bg-warning-amber/10 text-warning-amber hover:bg-warning-amber/15'
    : 'border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-ink'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`rounded-xl border font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${sizeClass} ${colorClass}`}
    >
      {children}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-surface/40 px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
    </div>
  )
}

function formatDate(value: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}
