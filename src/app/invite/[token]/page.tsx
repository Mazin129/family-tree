'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { TreePine, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function InvitePage() {
  const { token }  = useParams<{ token: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [treeId,  setTreeId]  = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return   // wait for redirect to login

    if (state !== 'idle') return
    setState('loading')

    fetch(`/api/invite/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setState('success')
          setTreeId(json.data.treeId)
        } else {
          setState('error')
          setMessage(json.error || 'حدث خطأ')
        }
      })
      .catch(() => { setState('error'); setMessage('فشل الاتصال بالخادم') })
  }, [token, session, status, state])

  // Redirect unauthenticated users to login with callbackUrl
  if (status === 'unauthenticated') {
    router.push(`/login?callbackUrl=/invite/${token}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-900 via-sand-800 to-khartoum-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-heritage rounded-2xl shadow-heritage mb-4">
            <TreePine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">دعوة للتعاون</h1>
          <p className="text-sand-300 text-sm mt-1">منصة التراث السوداني</p>
        </div>

        <div className="card p-8 text-center">
          {state === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-sand-400 mx-auto" />
              <p className="text-khartoum-600 font-medium">جارٍ معالجة الدعوة…</p>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-5">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-khartoum-900">تمت الإضافة بنجاح</h2>
                <p className="text-khartoum-500 text-sm mt-1">أنت الآن متعاون في هذه الشجرة العائلية</p>
              </div>
              <Link
                href={`/tree/${treeId}`}
                className="btn-primary w-full py-3 justify-center"
              >
                <TreePine className="w-5 h-5" />
                فتح الشجرة
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-5">
              <XCircle className="w-14 h-14 text-red-400 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-khartoum-900">لم تتم الإضافة</h2>
                <p className="text-khartoum-500 text-sm mt-1">{message}</p>
              </div>
              <Link href="/tree" className="btn-secondary w-full py-3 justify-center">
                العودة إلى أشجاري
              </Link>
            </div>
          )}

          {/* loading spinner (also covers status==='loading') */}
          {state === 'idle' && status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-sand-400 mx-auto" />
              <p className="text-khartoum-600 font-medium">جارٍ التحقق…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
