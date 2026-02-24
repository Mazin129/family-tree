'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertCircle, Link2, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import type { TreeMember, AIInsight, DuplicateAlert } from '@/types'
import { toast } from 'sonner'

interface AIInsightsPanelProps {
  treeId:  string
  members: TreeMember[]
}

export function AIInsightsPanel({ treeId, members }: AIInsightsPanelProps) {
  const [duplicates,   setDuplicates]   = useState<DuplicateAlert[]>([])
  const [suggestions,  setSuggestions]  = useState<any[]>([])
  const [narrative,    setNarrative]    = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [narLoading,   setNarLoading]   = useState(false)
  const [activePhase,  setActivePhase]  = useState<1 | 2 | 3>(1)

  async function runAnalysis() {
    setLoading(true)
    try {
      const [dupRes, sugRes] = await Promise.all([
        fetch('/api/ai/detect-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treeId, members }),
        }),
        fetch('/api/ai/suggest-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treeId, members }),
        }),
      ])

      const [dupJson, sugJson] = await Promise.all([dupRes.json(), sugRes.json()])

      if (dupJson.success) setDuplicates(dupJson.data)
      if (sugJson.success) setSuggestions(sugJson.data)

      toast.success('اكتمل التحليل بالذكاء الاصطناعي')
    } catch {
      toast.error('فشل التحليل')
    } finally {
      setLoading(false)
    }
  }

  async function generateNarrative() {
    setNarLoading(true)
    try {
      const res  = await fetch('/api/ai/analyze-lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeId, language: 'ar' }),
      })
      const json = await res.json()
      if (json.success) setNarrative(json.data.narrative)
    } catch {
      toast.error('فشل إنشاء السرد')
    } finally {
      setNarLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-khartoum-900 text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-nile-600" />
            رؤى الذكاء الاصطناعي
          </h2>
          <p className="text-sm text-khartoum-500 mt-0.5">تحليل شجرتك العائلية باستخدام الذكاء الاصطناعي</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تحليل الآن
        </button>
      </div>

      {/* Phase selector */}
      <div className="flex gap-2">
        {([
          { phase: 1 as const, label: 'المرحلة ١: أساسي',   desc: 'كشف التكرار والتحقق'        },
          { phase: 2 as const, label: 'المرحلة ٢: متقدم',   desc: 'تحليل الأنساب والهجرة'     },
          { phase: 3 as const, label: 'المرحلة ٣: رؤيوي', desc: 'سرديات وتقارير التراث', badge: 'قريباً' },
        ]).map(p => (
          <button
            key={p.phase}
            onClick={() => setActivePhase(p.phase)}
            className={`flex-1 p-3 rounded-xl text-sm border-2 transition-all text-right ${
              activePhase === p.phase
                ? 'border-nile-400 bg-nile-50 text-nile-800'
                : 'border-khartoum-200 hover:border-khartoum-300'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium">{p.label}</span>
              {p.badge && <span className="badge bg-sand-100 text-sand-700 text-xs">{p.badge}</span>}
            </div>
            <span className="text-xs text-khartoum-400">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Phase 1 content */}
      {activePhase === 1 && (
        <div className="space-y-4">
          {/* Duplicates */}
          <div className="card p-5">
            <h3 className="font-semibold text-khartoum-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              كشف التكرار
              {duplicates.length > 0 && (
                <span className="badge bg-yellow-100 text-yellow-700">{duplicates.length}</span>
              )}
            </h3>

            {loading ? (
              <div className="flex items-center gap-2 text-khartoum-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                جارٍ التحليل...
              </div>
            ) : duplicates.length === 0 ? (
              <div className="flex items-center gap-2 text-acacia-600 bg-acacia-50 p-3 rounded-xl text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                لم يتم اكتشاف تكرارات. اضغط "تحليل الآن" لإجراء فحص.
              </div>
            ) : (
              <div className="space-y-3">
                {duplicates.map((dup, i) => (
                  <DuplicateCard key={i} duplicate={dup} />
                ))}
              </div>
            )}
          </div>

          {/* Missing links */}
          <div className="card p-5">
            <h3 className="font-semibold text-khartoum-900 mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-nile-500" />
              اقتراح الروابط المفقودة
              {suggestions.length > 0 && (
                <span className="badge bg-nile-100 text-nile-700">{suggestions.length}</span>
              )}
            </h3>

            {loading ? (
              <div className="flex items-center gap-2 text-khartoum-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                جارٍ البحث...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-sm text-khartoum-400 bg-sand-50 p-3 rounded-xl">
                لا توجد اقتراحات حالياً. أضف المزيد من الأفراد لتحسين الكشف.
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((sug, i) => (
                  <SuggestionCard key={i} suggestion={sug} />
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatMini label="أفراد" value={members.length} color="sand" />
            <StatMini label="المتوفون" value={members.filter(m => !m.isAlive).length} color="khartoum" />
            <StatMini label="لا يزالون أحياء" value={members.filter(m => m.isAlive).length} color="acacia" />
          </div>
        </div>
      )}

      {/* Phase 2 content */}
      {activePhase === 2 && (
        <div className="card p-8 text-center">
          <Sparkles className="w-10 h-10 text-nile-400 mx-auto mb-4" />
          <h3 className="font-semibold text-khartoum-900 mb-2">التحليل المتقدم</h3>
          <p className="text-khartoum-500 text-sm mb-6 leading-relaxed">
            يشمل تحليل أنماط الأنساب، خرائط الهجرة التاريخية، وتوزيع القبائل
          </p>
          <button
            onClick={runAnalysis}
            disabled={loading || members.length < 5}
            className="btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            تشغيل التحليل المتقدم
          </button>
          {members.length < 5 && (
            <p className="text-xs text-khartoum-400 mt-3">يتطلب 5 أفراد على الأقل</p>
          )}
        </div>
      )}

      {/* Phase 3 content */}
      {activePhase === 3 && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-khartoum-900 mb-3">إنشاء سردية العائلة</h3>
            <p className="text-sm text-khartoum-500 mb-4">
              اطلب من الذكاء الاصطناعي كتابة سردية ثرية عن تاريخ عائلتك وتراثها
            </p>
            <button
              onClick={generateNarrative}
              disabled={narLoading || members.length < 3}
              className="btn-primary w-full"
            >
              {narLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              إنشاء السردية الآن
            </button>
          </div>

          {narrative && (
            <div className="card p-5 bg-sand-50 border-sand-200">
              <h4 className="font-semibold text-khartoum-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-acacia-500" />
                السردية المولَّدة
              </h4>
              <div className="prose prose-sm max-w-none text-khartoum-700 leading-relaxed">
                {narrative.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DuplicateCard({ duplicate }: { duplicate: DuplicateAlert }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-khartoum-900">
          {duplicate.member1?.fullNameArabic || duplicate.member1?.fullName}
          {' ↔ '}
          {duplicate.member2?.fullNameArabic || duplicate.member2?.fullName}
        </p>
        <p className="text-xs text-khartoum-500 mt-0.5">
          تشابه {Math.round(duplicate.similarityScore * 100)}%
        </p>
      </div>
      <div className="flex gap-1">
        <button className="p-1 hover:bg-acacia-100 rounded text-acacia-600" title="تجاهل">
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: any }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-nile-50 rounded-xl border border-nile-200">
      <Link2 className="w-4 h-4 text-nile-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-khartoum-900">{suggestion.description || suggestion.type}</p>
        <p className="text-xs text-khartoum-500 mt-0.5">
          ثقة {Math.round((suggestion.confidence || 0) * 100)}%
        </p>
      </div>
      <button className="btn-secondary text-xs px-2 py-1">قبول</button>
    </div>
  )
}

function StatMini({
  label, value, color,
}: {
  label: string; value: number; color: 'sand' | 'khartoum' | 'acacia'
}) {
  const colors = {
    sand:     'bg-sand-50 text-sand-800 border-sand-200',
    khartoum: 'bg-khartoum-50 text-khartoum-800 border-khartoum-200',
    acacia:   'bg-acacia-50 text-acacia-800 border-acacia-200',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5">{label}</div>
    </div>
  )
}
