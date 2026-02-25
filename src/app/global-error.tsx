'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fdf8f0' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '1rem', padding: '2rem', textAlign: 'center', border: '1px solid #e5ddd0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>حدث خطأ غير متوقع</h2>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>An unexpected error occurred.</p>
            {error?.message && (
              <pre style={{ fontSize: '0.75rem', textAlign: 'left', background: '#fff5f5', border: '1px solid #fcc', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', overflow: 'auto', color: '#c00', maxHeight: '120px' }}>
                {error.message}
              </pre>
            )}
            {error?.digest && (
              <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '1rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ background: '#d4922d', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
