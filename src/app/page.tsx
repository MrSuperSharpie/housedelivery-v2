import React from 'react'
import Link from 'next/link'
import {
  ArrowRight, Zap, Clock, Shield, FileText,
  Radio, Lock, CheckCircle2, ChevronRight,
  HardHat, Building2, Eye
} from 'lucide-react'

/* ─── Micro-components ───────────────────────────────────────────────────── */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-flame border border-flame/30 bg-flame/8 px-3 py-1.5 rounded-full">
      {children}
    </span>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-4 border-r border-white/5 last:border-0">
      <span className="text-2xl font-black text-ink">{value}</span>
      <span className="text-xs text-muted mt-0.5 text-center">{label}</span>
    </div>
  )
}

function AudienceCard({
  icon: Icon, eyebrow, title, body, href, cta, accent
}: {
  icon: React.ElementType
  eyebrow: string
  title: string
  body: string
  href: string
  cta: string
  accent: string
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden card-dark border-flame-gradient hover:border-flame/20 transition-all duration-300 hover:translate-y-[-2px]">
      {/* Top accent bar */}
      <div className={`h-px w-full ${accent}`} />
      <div className="p-7 flex flex-col flex-1">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-flame/10 border border-flame/20 flex items-center justify-center mb-5">
          <Icon className="w-5 h-5 text-flame" />
        </div>
        <div className="label-mono mb-2">{eyebrow}</div>
        <h3 className="text-lg font-black text-ink mb-3 leading-snug">{title}</h3>
        <p className="text-sm text-muted leading-relaxed flex-1">{body}</p>
        <Link href={href}
          className="inline-flex items-center gap-2 text-sm font-bold text-flame mt-6 group-hover:gap-3 transition-all">
          {cta} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

function StepRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="w-8 h-8 rounded-lg bg-flame/10 border border-flame/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-black text-flame font-mono">{n}</span>
      </div>
      <div>
        <div className="font-bold text-ink text-sm">{title}</div>
        <div className="text-sm text-muted mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  )
}

function FeatureTile({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="card-dark rounded-2xl p-5 hover:bg-raised transition-colors duration-200">
      <div className="w-9 h-9 rounded-xl bg-flame/10 border border-flame/20 flex items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-flame" />
      </div>
      <div className="font-bold text-ink text-sm mb-1.5">{title}</div>
      <div className="text-xs text-muted leading-relaxed">{body}</div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="dark">
      <div className="min-h-screen overflow-x-hidden bg-[#080D18] text-white [--color-surface:#080D18] [--color-panel:#0E1727] [--color-raised:#162133] [--color-hover:#1C2940] [--color-rim:#475569] [--color-ink:#FFFFFF] [--color-muted:#D1D5DB] [--color-subtle:#94A3B8]">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* NAVBAR                                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-surface/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-flame flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-black text-ink tracking-tight">
              Vero
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/builder',             label: 'For Builders' },
              { href: '/inspector/signup',    label: 'For Inspectors' },
              { href: '/sign-in?role=auditor', label: 'City Auditors' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-raised transition-all">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <Link href="/inspector/signup"
              className="hidden md:inline-flex text-sm font-semibold text-muted hover:text-ink px-3 py-2 rounded-xl hover:bg-raised transition-all">
              Join as Inspector
            </Link>
            <Link href="/get-started"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-flame text-white px-4 py-2.5 rounded-xl hover:bg-flame-light transition-all glow-flame-sm">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col justify-center pt-16 bg-dot bg-dot-sm overflow-hidden">
        {/* Radial glow */}
        <div className="hero-glow" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-surface to-transparent" />

        <div className="relative max-w-7xl mx-auto px-5 py-28 md:py-40">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <Chip><Zap className="w-3 h-3" /> BC&apos;s First On-Demand Inspection Platform</Chip>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted">
                <div className="w-1.5 h-1.5 bg-success-green rounded-full animate-pulse" />
                Live in Metro Vancouver
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight mb-6">
              <span className="text-ink">Stop paying your</span>
              <br />
              <span className="text-ink">crew to </span>
              <span className="text-shimmer">stand still.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted max-w-2xl leading-relaxed mb-10">
              Vero connects builders with licensed engineers and architects for rapid private building inspections.
              Legally binding BC Schedule&nbsp;C-B delivered the same day.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap gap-3 mb-16">
              <Link href="/get-started?role=builder"
                className="inline-flex items-center gap-2.5 bg-flame text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-flame-light transition-all glow-flame shadow-flame">
                I&apos;m a Builder <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/sign-in?role=inspector"
                className="inline-flex items-center gap-2.5 border border-white/10 bg-raised text-ink font-bold text-base px-8 py-4 rounded-2xl hover:bg-hover transition-all">
                Login as Certified Inspector
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-4 text-xs text-subtle">
              {['No subscription fees', 'Stripe-secured escrow', 'Schedule C-B generated automatically'].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <span className="w-px h-3 bg-white/10" />}
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-green shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-b border-white/5 bg-panel/60 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4">
            <StatPill value="24 hrs"  label="Emergency dispatch" />
            <StatPill value="4.9★"    label="Average inspector rating" />
            <StatPill value="24 hr"   label="Guaranteed payout" />
            <StatPill value="100%"    label="Schedule C-B success rate" />
          </div>
        </div>
        </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* THREE AUDIENCES                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-5 py-24">
        <div className="text-center mb-12">
          <div className="label-mono mb-3">Who it&apos;s for</div>
          <h2 className="text-3xl sm:text-4xl font-black text-ink">Built for everyone in the permit chain</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <AudienceCard
            icon={Building2}
            eyebrow="Home Builders"
            title="Buy velocity, not just an inspection."
            body="Every idle day on your site costs thousands. Dispatch a licensed engineer in hours, track their arrival in real time, and get your Schedule C-B the same day."
            href="/builder"
            cta="Open command center"
            accent="bg-gradient-to-r from-flame to-transparent"
          />
          <AudienceCard
            icon={HardHat}
            eyebrow="Certified Professionals"
            title="Turn your licence into instant revenue."
            body="Claim jobs on your commute. Zero paperwork — the app generates the Schedule C-B automatically. Payment hits your bank account the moment the builder releases funds."
            href="/inspector"
            cta="View live board"
            accent="bg-gradient-to-r from-electric to-transparent"
          />
          <AudienceCard
            icon={Eye}
            eyebrow="City Auditors"
            title="Compliance-ready. Zero new software."
            body="Vero can deliver pre-filled PDF reports to your permit desk when configured — Vancouver first."
            href="/auditor"
            cta="Open vault"
            accent="bg-gradient-to-r from-plasma to-transparent"
          />
        </div>
        </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS (Builder POV)                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: steps */}
            <div>
              <div className="label-mono mb-3">How it works</div>
              <h2 className="text-3xl font-black text-ink mb-10">From tap to signed-off in hours.</h2>
              <div className="space-y-7">
                <StepRow n="01" title="Post & pre-fund your inspection"
                  body="Enter your site address, select the permit stage and discipline, set safety requirements, and pre-fund the full estimated cost to escrow. Your listing goes live on the board." />
                <StepRow n="02" title="Governed dispatch assigns a CP"
                  body="Vero automatically filters by credentials, discipline, region, and availability. The first eligible inspector to claim the slot is assigned — no manual selection needed." />
                <StepRow n="03" title="Progressive checklist, photo evidence"
                  body="The inspector works through the exact BC code requirements on-site. Failed items auto-expand, requiring a photo and note. GPS and timestamps recorded." />
                <StepRow n="04" title="Pass, Fail, or Hold / Modification Required"
                  body="If it's a pass, you're done. If a minor correction is needed, the inspector can hold on-site while your crew fixes it — premium hourly rates apply." />
                <StepRow n="05" title="Digital seal → Schedule C-B → payment"
                  body="The inspector signs off in-app. Vero generates the Schedule C-B, the defensible professional record is archived in the Vault, and escrow is released." />
              </div>
            </div>

            {/* Right: feature tiles */}
            <div className="grid grid-cols-2 gap-3">
              <FeatureTile icon={Radio}     title="Governed Dispatch"          body="Eligibility-based assignment, not open bidding. Credentials, discipline, and region verified automatically." />
              <FeatureTile icon={Lock}      title="Escrow-Backed Execution"  body="Full cost pre-funded before the job goes live. Payment released only after results are approved." />
              <FeatureTile icon={FileText}  title="Defensible Professional Record" body="Timestamped, geolocated evidence bundle with digital seal. Authority-ready packaging." />
              <FeatureTile icon={Shield}    title="Hold / Modification Required" body="Minor correction on site? Keep the inspector while your crew fixes it. Premium hourly rates apply." />
              <FeatureTile icon={Zap}       title="Auto Schedule C-B"        body="Inspection data maps directly to official BC PDF templates. Delivered same-day." />
              <FeatureTile icon={Clock}     title="Vault Archive"            body="Completed records stored for 2–10+ years. Searchable, retrievable, compliance-ready." />
            </div>
          </div>
        </div>
        </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DISPATCH TIERS                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="border-t border-white/5 py-24 bg-dot bg-dot-md">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="label-mono mb-3">Pricing</div>
            <h2 className="text-3xl font-black text-ink">Your schedule, your speed.</h2>
            <p className="text-muted text-sm mt-3 max-w-xl mx-auto">
              Funds are pre-funded to escrow before the job goes live. Vero charges a flat 10% commission on total transaction volume. No subscription, no retainer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                tier: 'Standard', time: '5–7 business days', price: '$325',
                note: '$295 + 10% commission', items: ['Next available CP', 'Standard scheduling', 'Auto Schedule C-B'],
                highlight: false,
              },
              {
                tier: 'Priority', time: '2–3 business days', price: '$487',
                note: '$443 + 10% commission', items: ['Top-rated CP preferred', 'Same-day service', 'Live ETA tracking'],
                highlight: true,
              },
              {
                tier: 'Emergency', time: 'Within 24 hrs / next day', price: '$649',
                note: '$590 + 10% commission', items: ['Highest urgency routing', 'Dedicated CP dispatch', 'Direct CP phone access'],
                highlight: false,
              },
            ].map(t => (
              <div key={t.tier}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  t.highlight
                    ? 'bg-flame/10 border-2 border-flame/40 glow-flame-sm'
                    : 'card-dark'
                }`}>
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-flame text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <div className="label-mono mb-2">{t.tier}</div>
                <div className="text-3xl font-black text-ink mb-0.5">{t.price}</div>
                <div className="text-xs text-muted mb-1">{t.note}</div>
                <div className="flex items-center gap-1.5 text-xs text-flame mb-5">
                  <Clock className="w-3 h-3" /> {t.time}
                </div>
                <div className="space-y-2.5 flex-1">
                  {t.items.map(item => (
                    <div key={item} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle2 className="w-4 h-4 text-success-green shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/get-started"
                  className={`mt-6 flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-xl transition-all ${
                    t.highlight
                      ? 'bg-flame text-white hover:bg-flame-light glow-flame-sm'
                      : 'border border-white/10 text-ink hover:bg-raised'
                  }`}>
                  Get Started <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
        </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="border-t border-white/5 py-28">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-ink mb-4 leading-tight">
            The permit backlog<br />ends here.
          </h2>
          <p className="text-muted text-lg mb-10">
            Builders get velocity. Inspectors get autonomy. Cities get compliance. Everyone wins.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/get-started"
              className="inline-flex items-center justify-center gap-2.5 bg-flame text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-flame-light transition-all glow-flame shadow-flame">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/inspector/signup"
              className="inline-flex items-center justify-center gap-2.5 border border-white/10 text-ink font-bold text-base px-8 py-4 rounded-2xl hover:bg-raised transition-all">
              Apply as Inspector
            </Link>
          </div>
        </div>
        </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
        <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-flame flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-ink">Vero</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-subtle">
            <span>© 2026 Vero Technologies Inc.</span>
            <span>Vancouver, BC</span>
            <span className="cursor-default">Privacy</span>
            <span className="cursor-default">Terms</span>
            <Link href="/sign-in?role=admin" className="hover:text-muted transition-colors">Admin</Link>
          </div>
        </div>
        </footer>
      </div>
    </div>
  )
}
