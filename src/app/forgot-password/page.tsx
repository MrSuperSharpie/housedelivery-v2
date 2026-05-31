'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BrandWordmark } from '@/components/shared/Navbar'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const inputCls = 'w-full bg-panel border border-white/10 focus:border-flame text-ink text-sm rounded-xl px-4 py-3 placeholder-subtle focus:outline-none transition-colors'

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required.'); return }
    setLoading(true)
    setError('')

    const redirectTo = `${window.location.origin}/auth/confirm`
    const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

    setLoading(false)

    if (sbError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4 shrink-0">
        <BrandWordmark className="max-w-[130px]" height={32} priority theme="dark" />
        <Link href="/sign-in" className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="font-black text-ink text-lg leading-tight mb-1">Reset your password</div>
            <div className="text-sm text-muted">Enter your account email and we&apos;ll send reset instructions.</div>
          </div>

          {submitted ? (
            <div className="bg-electric/10 border border-electric/20 text-ink text-sm rounded-xl px-4 py-4">
              If an account exists for that email, we&apos;ll send password reset instructions.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label-mono mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="bg-fail-red/10 border border-fail-red/20 text-fail-red text-xs rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all mt-2 bg-flame hover:bg-flame-light text-white disabled:opacity-50"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : 'Send reset instructions'
                }
              </button>
            </form>
          )}

          <p className="mt-6 text-center">
            <Link href="/sign-in" className="text-xs text-muted hover:text-ink transition-colors underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
