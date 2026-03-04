'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const search = useSearchParams()
  const token = search.get('token') || ''
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Reset link is invalid or missing.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to reset password. The link may have expired.')
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2500)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-sand-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-khartoum-900">تعيين كلمة مرور جديدة</h1>
          <Link href="/login" className="flex items-center text-xs text-khartoum-500 hover:text-khartoum-700">
            <ArrowLeft className="w-3 h-3 ms-1" />
            العودة لتسجيل الدخول
          </Link>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-khartoum-700 text-sm">
              تم تعيين كلمة المرور بنجاح. سيتم تحويلك إلى صفحة تسجيل الدخول خلال لحظات.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-khartoum-600 text-sm">
              أدخل كلمة مرور جديدة لحسابك. تأكد من اختيار كلمة مرور قوية.
            </p>

            <div>
              <label className="label mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400 end-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400 end-3" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تعيين كلمة المرور'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

