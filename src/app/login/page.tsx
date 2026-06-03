import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const params = new URLSearchParams()

  if (typeof next === 'string' && next.trim()) {
    params.set('next', next)
    params.set('mode', 'signin')

    if (next.startsWith('/inspector') || next.startsWith('/live-board')) {
      params.set('role', 'inspector')
    } else if (next.startsWith('/builder')) {
      params.set('role', 'builder')
    } else if (next.startsWith('/admin')) {
      params.set('role', 'admin')
    }
  }

  redirect(params.size > 0 ? `/sign-in?${params.toString()}` : '/sign-in')
}
