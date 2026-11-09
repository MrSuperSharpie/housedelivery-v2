import React from 'react'
import Link from 'next/link'
import { BrandWordmark } from '@/components/shared/Navbar'

// Shared chrome for Vero Permit public legal/compliance pages (Privacy, Terms).
// These pages are intentionally public — no auth, no RoleGuard. The middleware
// matcher does not cover /privacy or /terms, so they remain accessible to all.
export function LegalShell({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-rim/40">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
          <BrandWordmark className="max-w-[130px]" height={30} theme="dark" />
          <Link
            href="/"
            className="text-xs font-semibold text-subtle hover:text-muted transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm text-subtle">Effective Date: {effectiveDate}</p>
        <div className="mt-10 space-y-9">{children}</div>
      </main>

      <footer className="border-t border-rim/40 py-8">
        <div className="max-w-3xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-subtle">
          <span>© 2026 Vero Permit</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-muted transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-muted transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// A titled content block.
export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

// A bulleted list with consistent spacing.
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

// Standard contact block shared by both legal pages.
export function LegalContact() {
  return (
    <div className="rounded-xl border border-rim/60 bg-panel px-5 py-4 text-sm leading-relaxed text-muted">
      <p className="font-semibold text-ink">Vero Permit</p>
      <p>1578295 B.C. LTD.</p>
      <p>
        Email:{' '}
        <a href="mailto:admin@veropermit.com" className="text-flame hover:text-flame-light">
          admin@veropermit.com
        </a>
      </p>
      <p>
        Website:{' '}
        <a
          href="https://veropermit.com"
          className="text-flame hover:text-flame-light"
          rel="noreferrer"
        >
          https://veropermit.com
        </a>
      </p>
    </div>
  )
}
