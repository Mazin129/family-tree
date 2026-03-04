'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not send reset email. Please try again.')
      } else {
        setSent(true)
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
          <h1 className="text-xl font-bold text-khartoum-900">استعادة كلمة المرور</h1>
          <Link href="/login" className="flex items-center text-xs text-khartoum-500 hover:text-khartoum-700">
            <ArrowLeft className="w-3 h-3 ms-1" />
            العودة لتسجيل الدخول
          </Link>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-khartoum-700 text-sm">
              إذا كان البريد الإلكتروني مرتبطاً بحساب لدينا، فقد أرسلنا إليك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.
            </p>
            <p className="text-xs text-khartoum-400">
              تأكد من فحص صندوق الوارد والبريد غير الهام (Spam).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-khartoum-600 text-sm">
              أدخل بريدك الإلكتروني وسنرسل إليك رابطاً لإعادة تعيين كلمة المرور.
            </p>

            <div>
              <label className="label mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400 end-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input text-left"
                  dir="ltr"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}


