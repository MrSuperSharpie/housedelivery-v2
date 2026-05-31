'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { BrandWordmark } from '@/components/shared/Navbar'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const inputCls = 'w-full bg-panel border border-white/10 focus:border-flame text-ink text-sm rounded-xl px-4 py-3 placeholder-subtle focus:outline-none transition-colors'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [checking, setChecking]       = useState(true)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/sign-in')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')

    const { error: sbError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (sbError) {
      setError(sbError.message ?? 'Could not update password. The reset link may have expired.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/sign-in'), 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4 shrink-0">
        <BrandWordmark className="max-w-[130px]" height={32} priority theme="dark" />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="font-black text-ink text-lg leading-tight mb-1">Set a new password</div>
            <div className="text-sm text-muted">Choose a password with at least 8 characters.</div>
          </div>

          {done ? (
            <div className="bg-electric/10 border border-electric/20 text-ink text-sm rounded-xl px-4 py-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-electric shrink-0" />
              Password updated. Redirecting to sign in…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label-mono mb-1.5 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-mono mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Update password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
