'use client'
export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import {
  Settings, DollarSign, MapPin, FileText, Shield,
  CheckCircle2, Save, RotateCcw, ChevronDown, ChevronRight,
  AlertTriangle, Zap, Clock,
} from 'lucide-react'
import { AdminShell, ActionButton } from '@/components/admin/AdminShell'

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-panel border border-white/8 rounded-2xl overflow-hidden mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-colors text-left">
        <Icon className="w-4 h-4 text-flame shrink-0" />
        <span className="font-bold text-ink flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="border-t border-white/5 px-5 py-4">{children}</div>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-subtle mt-1">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, mono }: { value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      className={`w-full bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs text-ink focus:outline-none focus:border-flame transition-colors ${mono ? 'font-mono' : ''}`} />
  )
}

function NumberInput({ value, onChange, prefix, suffix }: { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-xs text-muted">{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-32 bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs text-ink font-mono focus:outline-none focus:border-flame transition-colors" />
      {suffix && <span className="text-xs text-muted">{suffix}</span>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-all relative ${checked ? 'bg-flame' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
      <span className="text-xs text-ink">{label}</span>
    </label>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // Finance
  const [standardFee, setStandardFee]   = useState(185)
  const [priorityFee, setPriorityFee]   = useState(385)
  const [emergencyFee, setEmergencyFee] = useState(695)
  const [escrowPct, setEscrowPct]       = useState(3)
  const [retentionRate, setRetentionRate] = useState(85)
  const [platformFee, setPlatformFee]   = useState(12)

  // Permit rules
  const [permitFamilies, setPermitFamilies] = useState([
    { id: 'building', label: 'Building Permit', enabled: true, disciplines: 'Structural, Geotechnical, Mechanical, Electrical' },
    { id: 'electrical', label: 'Electrical Permit', enabled: true, disciplines: 'Electrical (TSBC)' },
    { id: 'plumbing', label: 'Plumbing Permit', enabled: false, disciplines: 'Plumbing, Gas' },
  ])

  // Jurisdictions
  const [jurisdictions, setJurisdictions] = useState([
    { name: 'City of Vancouver', active: true, notifyEmail: 'permits@vancouver.ca' },
    { name: 'District of North Vancouver', active: true, notifyEmail: 'permits@dnv.org' },
    { name: 'City of Surrey', active: true, notifyEmail: 'permits@surrey.ca' },
    { name: 'City of Richmond', active: false, notifyEmail: '' },
    { name: 'City of Burnaby', active: true, notifyEmail: 'permits@burnaby.ca' },
  ])

  // Notifications
  const [emailOnBuilderSubmit, setEmailOnBuilderSubmit] = useState(true)
  const [emailOnApproval, setEmailOnApproval]           = useState(true)
  const [emailOnSeal, setEmailOnSeal]                   = useState(true)
  const [emailOnDispute, setEmailOnDispute]             = useState(true)
  const [slackWebhook, setSlackWebhook]                 = useState('')

  // Compliance
  const [holdAutoEscalate, setHoldAutoEscalate]     = useState(true)
  const [holdEscalateHours, setHoldEscalateHours]   = useState(48)
  const [requireBcHousing, setRequireBcHousing]     = useState(true)
  const [requireWorksafe, setRequireWorksafe]        = useState(true)

  const [saved, setSaved] = useState(false)
  const save = async () => {
    await new Promise(r => setTimeout(r, 600))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AdminShell title="Platform Settings" subtitle="Permit rules, jurisdiction config, finance, and notification settings">

      {/* Finance */}
      <Section title="Dispatch fee schedule" icon={DollarSign}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Field label="Standard tier fee" hint="24–48 hr window">
            <NumberInput value={standardFee} onChange={setStandardFee} prefix="$" suffix="CAD" />
          </Field>
          <Field label="Priority tier fee" hint="Same-day / 4–8 hr window">
            <NumberInput value={priorityFee} onChange={setPriorityFee} prefix="$" suffix="CAD" />
          </Field>
          <Field label="Emergency tier fee" hint="≤2 hr response">
            <NumberInput value={emergencyFee} onChange={setEmergencyFee} prefix="$" suffix="CAD" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Escrow processing fee" hint="Deducted from gross at release">
            <NumberInput value={escrowPct} onChange={setEscrowPct} suffix="%" />
          </Field>
          <Field label="Retention hourly rate" hint="Charged to builder during inspector hold">
            <NumberInput value={retentionRate} onChange={setRetentionRate} prefix="$" suffix="/hr" />
          </Field>
          <Field label="SiteLine platform fee" hint="Taken from inspector payout">
            <NumberInput value={platformFee} onChange={setPlatformFee} suffix="%" />
          </Field>
        </div>
      </Section>

      {/* Permit families */}
      <Section title="Permit families & disciplines" icon={FileText}>
        <div className="space-y-3">
          {permitFamilies.map((pf, i) => (
            <div key={pf.id} className="flex items-start gap-3 p-3 bg-surface border border-white/8 rounded-xl">
              <button onClick={() => setPermitFamilies(prev => prev.map((p, j) => j===i ? {...p, enabled: !p.enabled} : p))}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${pf.enabled ? 'bg-flame border-flame' : 'border-white/20 bg-transparent'}`}>
                {pf.enabled && <CheckCircle2 className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1">
                <div className="text-xs font-bold text-ink">{pf.label}</div>
                <div className="text-[11px] text-muted mt-0.5">Disciplines: {pf.disciplines}</div>
              </div>
              {!pf.enabled && <span className="text-[10px] text-subtle bg-white/5 px-2 py-1 rounded">Disabled</span>}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-subtle mt-3">Disabled permit families will not appear in inspector dispatch or builder job posting.</p>
      </Section>

      {/* Jurisdictions */}
      <Section title="Active jurisdictions" icon={MapPin}>
        <div className="space-y-2">
          {jurisdictions.map((j, i) => (
            <div key={j.name} className="flex items-center gap-3 p-3 bg-surface border border-white/8 rounded-xl">
              <button onClick={() => setJurisdictions(prev => prev.map((jj, k) => k===i ? {...jj, active: !jj.active} : jj))}
                className={`w-8 h-4.5 rounded-full transition-all relative shrink-0 ${j.active ? 'bg-flame' : 'bg-white/15'}`}
                style={{ height: '18px' }}>
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${j.active ? 'left-4' : 'left-0.5'}`} style={{ width: '14px', height: '14px' }} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink">{j.name}</div>
                {j.notifyEmail && <div className="text-[10px] text-muted font-mono">{j.notifyEmail}</div>}
              </div>
              {!j.active && <span className="text-[10px] text-subtle">Inactive</span>}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-subtle mt-3">Only active jurisdictions are available in builder dispatch and inspector job board filters.</p>
      </Section>

      {/* Compliance rules */}
      <Section title="Compliance & hold rules" icon={Shield}>
        <div className="space-y-4">
          <Toggle checked={requireBcHousing} onChange={setRequireBcHousing}
            label="Require BC Housing Residential Builder Licence for residential builders" />
          <Toggle checked={requireWorksafe} onChange={setRequireWorksafe}
            label="Require WorkSafeBC clearance or exemption declaration" />
          <Toggle checked={holdAutoEscalate} onChange={setHoldAutoEscalate}
            label="Auto-escalate unresolved Holds to admin after timeout" />
          {holdAutoEscalate && (
            <Field label="Hold escalation timeout" hint="Hours before unresolved Hold auto-escalates to admin">
              <NumberInput value={holdEscalateHours} onChange={setHoldEscalateHours} suffix="hours" />
            </Field>
          )}
        </div>
      </Section>

      {/* Notification settings */}
      <Section title="Notification & webhook settings" icon={Settings}>
        <div className="space-y-4">
          <Toggle checked={emailOnBuilderSubmit} onChange={setEmailOnBuilderSubmit}
            label="Email admin when builder submits for verification" />
          <Toggle checked={emailOnApproval} onChange={setEmailOnApproval}
            label="Email builder / inspector when approval decision is made" />
          <Toggle checked={emailOnSeal} onChange={setEmailOnSeal}
            label="Email builder when submission is sealed" />
          <Toggle checked={emailOnDispute} onChange={setEmailOnDispute}
            label="Email admin when a dispute is opened" />
          <Field label="Slack webhook URL" hint="Optional — posts admin alerts to a Slack channel">
            <TextInput value={slackWebhook} onChange={setSlackWebhook} mono />
          </Field>
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-xl border-t border-white/8 px-0 py-4 flex items-center gap-3 -mx-6 px-6 mt-2">
        <div className="flex-1">
          {saved && (
            <div className="flex items-center gap-2 text-success-green text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved — changes will take effect immediately
            </div>
          )}
          {!saved && (
            <div className="flex items-center gap-2 text-warning-amber text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fee changes apply to new dispatches only — existing escrowed jobs are not affected
            </div>
          )}
        </div>
        <ActionButton variant="ghost" onClick={() => {}}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </ActionButton>
        <ActionButton variant="approve" onClick={save}>
          <Save className="w-3.5 h-3.5" /> Save changes
        </ActionButton>
      </div>
    </AdminShell>
  )
}
