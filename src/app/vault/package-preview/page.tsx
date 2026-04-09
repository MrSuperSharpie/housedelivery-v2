import { Suspense } from 'react'
import PackagePreviewClient from './PackagePreviewClient'

export default function PackagePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
      </div>
    }>
      <PackagePreviewClient />
    </Suspense>
  )
}
