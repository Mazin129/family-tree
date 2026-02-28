'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Link2, Copy, CheckCheck, Trash2, Users, Loader2,
  Shield, Eye, Crown, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface Collaborator {
  id:        string
  role:      'VIEWER' | 'EDITOR' | 'ADMIN'
  invitedAt: string
  acceptedAt: string | null
  user: {
    id:         string
    name:       string | null
    nameArabic: string | null
    email:      string | null
    image:      string | null
  }
}

interface InviteToken {
  id:        string
  token:     string
  role:      'VIEWER' | 'EDITOR' | 'ADMIN'
  expiresAt: string
  createdAt: string
}

interface ShareModalProps {
  treeId:    string
  treeName:  string
  onClose:   () => void
}

const ROLE_META = {
  VIEWER: { label: 'مشاهد',   icon: Eye,    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  EDITOR: { label: 'محرّر',   icon: Shield, color: 'text-green-600 bg-green-50 border-green-200' },
  ADMIN:  { label: 'مشرف',    icon: Crown,  color: 'text-amber-600 bg-amber-50 border-amber-200' },
}

export function ShareModal({ treeId, treeName, onClose }: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [invites,       setInvites]       = useState<InviteToken[]>([])
  const [loading,       setLoading]       = useState(true)
  const [newRole,       setNewRole]       = useState<'VIEWER' | 'EDITOR'>('EDITOR')
  const [generating,    setGenerating]    = useState(false)
  const [copiedToken,   setCopiedToken]   = useState<string | null>(null)
  const [activeLink,    setActiveLink]    = useState<string>('')   // the generated invite URL

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/family/trees/${treeId}/collaborators`)
      let json: { success?: boolean; data?: { collaborators: Collaborator[]; invites: InviteToken[] }; error?: string }
      try {
        json = await res.json()
      } catch {
        toast.error(res.ok ? 'فشل الاتصال بالخادم' : `خطأ من الخادم (${res.status})`)
        setLoading(false)
        return
      }
      if (json.success && json.data) {
        setCollaborators(json.data.collaborators)
        setInvites(json.data.invites)
      } else if (!res.ok) {
        toast.error(json.error || `خطأ ${res.status}`)
      }
    } catch {
      toast.error('فشل الاتصال بالخادم')
    }
    setLoading(false)
  }, [treeId])

  useEffect(() => { fetchData() }, [fetchData])

  async function generateLink() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/family/trees/${treeId}/collaborators`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: newRole, daysValid: 7 }),
      })
      let json: { success?: boolean; data?: { inviteUrl: string }; error?: string }
      try {
        json = await res.json()
      } catch {
        toast.error(res.ok ? 'فشل الاتصال بالخادم' : `خطأ من الخادم (${res.status})`)
        setGenerating(false)
        return
      }
      if (json.success && json.data?.inviteUrl) {
        setActiveLink(json.data.inviteUrl)
        await fetchData()
        toast.success('تم إنشاء رابط الدعوة')
      } else {
        toast.error(json.error || 'فشل إنشاء الرابط')
      }
    } catch {
      toast.error('فشل الاتصال بالخادم')
    }
    setGenerating(false)
  }

  async function copyLink(url: string, tokenId: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(tokenId)
      toast.success('تم نسخ الرابط')
      setTimeout(() => setCopiedToken(null), 2500)
    } catch { toast.error('فشل النسخ') }
  }

  async function removeCollaborator(userId: string) {
    try {
      const res  = await fetch(`/api/family/trees/${treeId}/collaborators/${userId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) { toast.success('تمت إزالة المتعاون'); fetchData() }
      else toast.error(json.error)
    } catch { toast.error('فشل الحذف') }
  }

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || '')

  function tokenUrl(token: string) { return `${appUrl}/invite/${token}` }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-nile-100 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-nile-600" />
            </div>
            <div>
              <h2 className="font-bold text-khartoum-900 text-sm leading-tight">مشاركة الشجرة</h2>
              <p className="text-xs text-khartoum-400 truncate max-w-[220px]">{treeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-sand-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-khartoum-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Generate invite link ───────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-khartoum-800 mb-3">إنشاء رابط دعوة</h3>
            <div className="flex items-center gap-2 mb-3">
              {(['VIEWER', 'EDITOR'] as const).map(r => {
                const m = ROLE_META[r]
                return (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      newRole === r ? m.color : 'text-khartoum-500 border-sand-200 hover:bg-sand-50'
                    )}
                  >
                    <m.icon className="w-3 h-3" />
                    {m.label}
                  </button>
                )
              })}
              <span className="text-xs text-khartoum-400 ms-auto">صالح 7 أيام</span>
            </div>

            <button
              onClick={generateLink}
              disabled={generating}
              className="btn-primary w-full py-2.5 text-sm gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {generating ? 'جارٍ الإنشاء…' : 'إنشاء رابط دعوة'}
            </button>

            {/* Active generated link */}
            {activeLink && (
              <div className="mt-3 flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl p-3">
                <p className="flex-1 text-xs text-khartoum-600 font-mono truncate" dir="ltr">{activeLink}</p>
                <button
                  onClick={() => copyLink(activeLink, 'new')}
                  className="shrink-0 w-8 h-8 rounded-lg bg-white border border-sand-200 flex items-center justify-center hover:bg-sand-100 transition-colors"
                >
                  {copiedToken === 'new'
                    ? <CheckCheck className="w-4 h-4 text-green-500" />
                    : <Copy className="w-4 h-4 text-khartoum-500" />
                  }
                </button>
              </div>
            )}
          </section>

          {/* ── Active invite links ────────────────────────────────────────── */}
          {invites.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-khartoum-800">روابط نشطة</h3>
                <button onClick={fetchData} className="text-xs text-khartoum-400 hover:text-khartoum-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> تحديث
                </button>
              </div>
              <div className="space-y-2">
                {invites.map(inv => {
                  const url = tokenUrl(inv.token)
                  const exp = new Date(inv.expiresAt)
                  const m   = ROLE_META[inv.role]
                  return (
                    <div key={inv.id} className="flex items-center gap-2 bg-sand-50 border border-sand-100 rounded-xl p-2.5">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', m.color)}>{m.label}</span>
                      <p className="flex-1 text-xs text-khartoum-500 font-mono truncate" dir="ltr">{url}</p>
                      <span className="text-[10px] text-khartoum-400 shrink-0">
                        ينتهي {exp.toLocaleDateString('ar-SA')}
                      </span>
                      <button
                        onClick={() => copyLink(url, inv.id)}
                        className="shrink-0 w-7 h-7 rounded-lg bg-white border border-sand-200 flex items-center justify-center hover:bg-sand-100"
                      >
                        {copiedToken === inv.id
                          ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5 text-khartoum-400" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Collaborators list ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-khartoum-800 mb-3">
              المتعاونون
              {collaborators.length > 0 && (
                <span className="ms-1.5 text-xs font-normal text-khartoum-400">({collaborators.length})</span>
              )}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-khartoum-400" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-khartoum-400 text-center py-6">
                لا يوجد متعاونون بعد — شارك الرابط أعلاه للدعوة
              </p>
            ) : (
              <div className="space-y-2">
                {collaborators.map(c => {
                  const m    = ROLE_META[c.role]
                  const name = c.user.nameArabic || c.user.name || c.user.email || 'مستخدم'
                  const init = name.charAt(0)
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-sand-50 transition-colors">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-sand-200 flex items-center justify-center text-sm font-bold text-khartoum-600 shrink-0">
                        {c.user.image
                          ? <img src={c.user.image} className="w-full h-full rounded-full object-cover" alt={name} />
                          : init
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-khartoum-800 truncate">{name}</p>
                        {c.user.email && (
                          <p className="text-xs text-khartoum-400 truncate" dir="ltr">{c.user.email}</p>
                        )}
                      </div>
                      {/* Role badge */}
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0', m.color)}>
                        {m.label}
                      </span>
                      {/* Remove */}
                      <button
                        onClick={() => removeCollaborator(c.user.id)}
                        className="shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-khartoum-300 hover:text-red-500 transition-colors"
                        title="إزالة المتعاون"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-sand-100 bg-sand-50 rounded-b-2xl">
          <p className="text-xs text-khartoum-400 text-center">
            المتعاونون يمكنهم إضافة وتعديل الأفراد في الشجرة حسب دورهم
          </p>
        </div>
      </div>
    </div>
  )
}
