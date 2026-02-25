'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-sand-200 p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-khartoum-900 mb-2">خطأ في التحميل</h2>
        <p className="text-khartoum-500 text-sm mb-2">Failed to load dashboard.</p>
        {error?.message && (
          <pre className="text-xs text-left bg-red-50 border border-red-200 rounded-lg p-3 mb-4 overflow-auto text-red-700 max-h-40">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3">
          <button onClick={reset} className="btn-secondary flex-1">
            Retry
          </button>
          <Link href="/login" className="btn-primary flex-1">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
