'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, Users, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { TreeMember, RelationshipType } from '@/types'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import { cn } from '@/lib/utils/cn'

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'CHILD_OF',         label: 'أبناء/بنات' },
  { value: 'PARENT_OF',        label: 'آباء/أمهات' },
  { value: 'SPOUSE_OF',        label: 'زوجات/أزواج' },
  { value: 'SIBLING_OF',       label: 'إخوة/أخوات' },
  { value: 'HALF_SIBLING_OF',  label: 'إخوة من طرف' },
  { value: 'ADOPTED_CHILD_OF', label: 'أبناء بالتبني' },
  { value: 'EXTENDED_KIN',     label: 'أقارب آخرون' },
]

interface BulkMemberRow {
  id:             string
  fullNameArabic: string
  fullName:       string
  gender:         'MALE' | 'FEMALE' | 'UNSPECIFIED'
  birthYear:      string
  occupation:     string
}

function newRow(): BulkMemberRow {
  return {
    id:             Math.random().toString(36).slice(2),
    fullNameArabic: '',
    fullName:       '',
    gender:         'MALE',
    birthYear:      '',
    occupation:     '',
  }
}

interface BulkAddMembersModalProps {
  treeId:     string
  relativeOf?: TreeMember
  onSuccess:  (members: TreeMember[]) => void
  onClose:    () => void
}

export function BulkAddMembersModal({ treeId, relativeOf, onSuccess, onClose }: BulkAddMembersModalProps) {
  const [relationshipType,  setRelationshipType]  = useState<RelationshipType | ''>('')
  const [sharedTribe,       setSharedTribe]        = useState(relativeOf?.tribe   || '')
  const [sharedRegion,      setSharedRegion]       = useState('')
  const [sharedLineage,     setSharedLineage]      = useState((relativeOf as any)?.lineage || '')
  const [rows,              setRows]               = useState<BulkMemberRow[]>([newRow(), newRow()])
  const [isSubmitting,      setIsSubmitting]       = useState(false)
  const [showSharedFields,  setShowSharedFields]   = useState(false)

  const validCount = rows.filter(r => r.fullNameArabic.trim() || r.fullName.trim()).length

  function addRow() {
    if (rows.length >= 20) return
    setRows(prev => [...prev, newRow()])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, field: keyof BulkMemberRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function onSubmit() {
    const validMembers = rows.filter(r => r.fullNameArabic.trim() || r.fullName.trim())
    if (validMembers.length === 0) {
      toast.error('أدخل اسم فرد واحد على الأقل')
      return
    }
    if (relativeOf && !relationshipType) {
      toast.error('اختر نوع العلاقة أولاً')
      return
    }

    setIsSubmitting(true)
    try {
      const body = {
        treeId,
        relativeOfId:     relativeOf?.id   || null,
        relationshipType: relationshipType  || null,
        tribe:            sharedTribe       || null,
        birthRegion:      sharedRegion      || null,
        lineage:          sharedLineage     || null,
        members: validMembers.map(m => ({
          fullNameArabic:  m.fullNameArabic.trim() || null,
          fullName:        m.fullName.trim()        || null,
          gender:          m.gender,
          isAlive:         true,
          birthYear:       m.birthYear ? parseInt(m.birthYear, 10) : null,
          occupation:      m.occupation.trim()      || null,
        })),
      }

      const res  = await fetch('/api/family/members/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast.success(`تم إضافة ${json.count} فرد بنجاح`)
      onSuccess(json.data)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الإضافة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-khartoum-900 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-khartoum-900 text-lg">
                {relativeOf
                  ? `إضافة متعددة لـ ${relativeOf.fullNameArabic || relativeOf.fullName}`
                  : 'إضافة أفراد متعددين'}
              </h2>
              <p className="text-xs text-khartoum-400 mt-0.5">أدخل الأسماء في الصفوف — حتى ٢٠ فرداً دفعةً واحدة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sand-100 rounded-xl transition-colors shrink-0">
            <X className="w-5 h-5 text-khartoum-500" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Relationship selector (only when adding relative) */}
            {relativeOf && (
              <div className="p-4 bg-sand-50 rounded-xl border border-sand-200">
                <label className="block text-xs font-semibold text-khartoum-600 mb-2">
                  نوع العلاقة مع {relativeOf.fullNameArabic || relativeOf.fullName} *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium',
                        relationshipType === opt.value
                          ? 'border-khartoum-700 bg-khartoum-900 text-white shadow-sm'
                          : 'border-khartoum-200 bg-white hover:border-sand-400 text-khartoum-700'
                      )}
                    >
                      <input
                        type="radio"
                        name="bulkRelType"
                        value={opt.value}
                        checked={relationshipType === opt.value}
                        onChange={() => setRelationshipType(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Shared fields (collapsible) */}
            <div className="rounded-xl border border-sand-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSharedFields(!showSharedFields)}
                className="w-full flex items-center justify-between px-4 py-3 bg-sand-50 hover:bg-sand-100 transition-colors"
              >
                <span className="text-sm font-medium text-khartoum-700">
                  حقول مشتركة
                  <span className="text-xs text-khartoum-400 mr-2 font-normal">(تُطبّق على جميع الأفراد)</span>
                </span>
                <ChevronDown className={cn('w-4 h-4 text-khartoum-400 transition-transform', showSharedFields && 'rotate-180')} />
              </button>

              {showSharedFields && (
                <div className="p-4 grid sm:grid-cols-3 gap-4 bg-white border-t border-sand-100">
                  <div>
                    <label className="block text-xs font-medium text-khartoum-600 mb-1">القبيلة</label>
                    <select value={sharedTribe} onChange={e => setSharedTribe(e.target.value)} className="input">
                      <option value="">اختر القبيلة</option>
                      {SUDANESE_TRIBES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-khartoum-600 mb-1">الولاية / الإقليم</label>
                    <select value={sharedRegion} onChange={e => setSharedRegion(e.target.value)} className="input">
                      <option value="">اختر الولاية</option>
                      {Object.entries(REGION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label.ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-khartoum-600 mb-1">النسب (سلسلة الأجداد)</label>
                    <input
                      value={sharedLineage}
                      onChange={e => setSharedLineage(e.target.value)}
                      placeholder="أحمد بن إبراهيم بن علي..."
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Members rows ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-khartoum-800">
                  قائمة الأفراد
                  {validCount > 0 && (
                    <span className="mr-2 inline-flex items-center justify-center min-w-[20px] h-5 text-xs bg-khartoum-900 text-white px-1.5 rounded-full">
                      {validCount}
                    </span>
                  )}
                </p>
                <span className="text-xs text-khartoum-400">{rows.length} / ٢٠ صفوف</span>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[28px_1fr_1fr_88px_76px_32px] gap-2 px-3 mb-1 text-xs text-khartoum-400 font-medium">
                <span>#</span>
                <span>الاسم بالعربية</span>
                <span>الاسم بالإنجليزية</span>
                <span className="text-center">الجنس</span>
                <span className="text-center">ميلاد</span>
                <span />
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[28px_1fr_1fr_88px_76px_32px] gap-2 items-center bg-white border border-sand-200 rounded-xl px-3 py-2 hover:border-sand-300 transition-colors"
                  >
                    {/* Index */}
                    <span className="w-7 h-7 rounded-lg bg-sand-100 text-khartoum-500 text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>

                    {/* Arabic name */}
                    <input
                      value={row.fullNameArabic}
                      onChange={e => updateRow(row.id, 'fullNameArabic', e.target.value)}
                      placeholder="الاسم الكامل بالعربية"
                      className="input py-1.5 text-sm min-w-0"
                    />

                    {/* English name */}
                    <input
                      value={row.fullName}
                      onChange={e => updateRow(row.id, 'fullName', e.target.value)}
                      placeholder="Full name"
                      className="input py-1.5 text-sm text-left min-w-0"
                      dir="ltr"
                    />

                    {/* Gender — compact 3-button toggle */}
                    <div className="flex gap-1 justify-center shrink-0">
                      {([
                        { v: 'MALE',        label: 'م', activeClass: 'border-nile-400 bg-nile-50 text-nile-700'     },
                        { v: 'FEMALE',      label: 'أ', activeClass: 'border-sahara-400 bg-sahara-50 text-sahara-700' },
                        { v: 'UNSPECIFIED', label: '؟', activeClass: 'border-khartoum-300 bg-khartoum-50 text-khartoum-600' },
                      ] as const).map(g => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => updateRow(row.id, 'gender', g.v)}
                          title={g.v === 'MALE' ? 'ذكر' : g.v === 'FEMALE' ? 'أنثى' : 'غير محدد'}
                          className={cn(
                            'w-7 h-7 rounded-lg text-xs font-bold border-2 transition-all',
                            row.gender === g.v
                              ? g.activeClass
                              : 'border-sand-200 text-khartoum-300 hover:border-sand-300'
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>

                    {/* Birth year */}
                    <input
                      value={row.birthYear}
                      onChange={e => updateRow(row.id, 'birthYear', e.target.value)}
                      placeholder="١٩٥٠"
                      type="number"
                      min={1600}
                      max={new Date().getFullYear()}
                      className="input py-1.5 text-sm text-left w-full"
                      dir="ltr"
                    />

                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                        rows.length <= 1
                          ? 'text-sand-200 cursor-not-allowed'
                          : 'text-khartoum-300 hover:bg-red-50 hover:text-red-500'
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add row */}
              {rows.length < 20 && (
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-sand-200 hover:border-sand-400 hover:bg-sand-50 rounded-xl text-sm text-khartoum-400 hover:text-khartoum-600 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة صف جديد
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-5 border-t border-sand-100 bg-sand-50 flex gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || validCount === 0}
            className="btn-primary flex-1 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Users className="w-5 h-5" />
            }
            {isSubmitting
              ? 'جارٍ الإضافة...'
              : validCount > 0
              ? `إضافة ${validCount} فرد دفعةً واحدة`
              : 'أدخل الأسماء أولاً'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-6">
            إلغاء
          </button>
        </div>

      </div>
    </div>
  )
}
