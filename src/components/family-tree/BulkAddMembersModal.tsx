'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, Users, ChevronDown, Search, User } from 'lucide-react'
import { toast } from 'sonner'
import type { TreeMember, RelationshipType } from '@/types'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import { cn } from '@/lib/utils/cn'

// ── Sudanese lineage helper ───────────────────────────────────────────────────
// In Sudan: "ود" = son of (male), "بنت" = daughter of (female)
function lineageOf(gender: 'MALE' | 'FEMALE', father?: string | null, grandfather?: string | null): string {
  if (!father && !grandfather) return ''
  const p = gender === 'FEMALE' ? 'بنت' : 'ود'
  return [father && `${p} ${father}`, grandfather && `${p} ${grandfather}`].filter(Boolean).join(' ')
}

// ── Relationship options ──────────────────────────────────────────────────────
const REL_OPTIONS: { value: RelationshipType; labelFull: string; labelShort: string; icon: string }[] = [
  { value: 'CHILD_OF',         labelFull: 'ابن/ابنة',           labelShort: 'ابن',   icon: '↓' },
  { value: 'PARENT_OF',        labelFull: 'والد/والدة',          labelShort: 'والد',  icon: '↑' },
  { value: 'SPOUSE_OF',        labelFull: 'زوج/زوجة',           labelShort: 'زوج',   icon: '♥' },
  { value: 'SIBLING_OF',       labelFull: 'أخ/أخت',             labelShort: 'أخ',    icon: '↔' },
  { value: 'HALF_SIBLING_OF',  labelFull: 'أخ/أخت من طرف واحد', labelShort: 'نصف أخ', icon: '~' },
  { value: 'ADOPTED_CHILD_OF', labelFull: 'ابن/ابنة بالتبني',   labelShort: 'تبني',  icon: '⊕' },
  { value: 'EXTENDED_KIN',     labelFull: 'قريب آخر',           labelShort: 'قريب',  icon: '○' },
]

// ── Per-row type ──────────────────────────────────────────────────────────────
interface BulkMemberRow {
  id:             string
  fullNameArabic: string
  fullName:       string
  gender:         'MALE' | 'FEMALE'
  birthYear:      string
  relType:        RelationshipType | ''   // '' = inherit from shared
  anchorId:       string                 // '' = use shared anchor
  anchorName:     string                 // display only
}

function newRow(): BulkMemberRow {
  return {
    id:             Math.random().toString(36).slice(2),
    fullNameArabic: '',
    fullName:       '',
    gender:         'MALE',
    birthYear:      '',
    relType:        '',
    anchorId:       '',
    anchorName:     '',
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface BulkAddMembersModalProps {
  treeId:           string
  relativeOf?:      TreeMember       // pre-set anchor person
  existingMembers?: TreeMember[]     // full list for the picker
  onSuccess:        (members: TreeMember[]) => void
  onClose:          () => void
}

export function BulkAddMembersModal({
  treeId, relativeOf, existingMembers = [], onSuccess, onClose,
}: BulkAddMembersModalProps) {
  // Anchor person
  const [anchorMember,     setAnchorMember]    = useState<TreeMember | null>(relativeOf ?? null)
  const [memberSearch,     setMemberSearch]    = useState('')
  const [showMemberList,   setShowMemberList]  = useState(false)

  // Shared relationship type (applies to all rows that have relType='')
  const [sharedRelType,    setSharedRelType]   = useState<RelationshipType | ''>('')

  // Shared optional fields
  const [sharedTribe,      setSharedTribe]     = useState(relativeOf?.tribe || '')
  const [sharedRegion,     setSharedRegion]    = useState('')
  const [sharedLineage,    setSharedLineage]   = useState((relativeOf as any)?.lineage || '')
  const [showSharedFields, setShowSharedFields] = useState(false)

  // Rows
  const [rows,              setRows]             = useState<BulkMemberRow[]>([newRow(), newRow()])
  const [isSubmitting,      setIsSubmitting]      = useState(false)

  // Per-row anchor picker
  const [rowPickerOpenId,   setRowPickerOpenId]   = useState<string | null>(null)
  const [rowPickerSearch,   setRowPickerSearch]   = useState('')

  const validCount = rows.filter(r => r.fullNameArabic.trim() || r.fullName.trim()).length

  // ── Anchor member helpers ──────────────────────────────────────────────────
  const hasExisting = existingMembers.length > 0
  const filteredMembers = memberSearch.trim()
    ? existingMembers.filter(m => {
        const q = memberSearch.trim()
        return (
          (m.fullNameArabic    || '').includes(q) ||
          (m.fullName          || '').toLowerCase().includes(q.toLowerCase()) ||
          (m.fatherName        || '').includes(q) ||
          (m.grandfatherName   || '').includes(q) ||
          (m.tribe             || '').includes(q) ||
          (m.birthYear?.toString() || '').includes(q)
        )
      })
    : existingMembers

  function selectAnchor(m: TreeMember) {
    setAnchorMember(m)
    setMemberSearch('')
    setShowMemberList(false)
    if (!sharedTribe && m.tribe) setSharedTribe(m.tribe)
  }

  // ── Row helpers ───────────────────────────────────────────────────────────
  function addRow() {
    if (rows.length >= 20) return
    setRows(prev => [...prev, newRow()])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow<K extends keyof BulkMemberRow>(id: string, field: K, value: BulkMemberRow[K]) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit() {
    const validMembers = rows.filter(r => r.fullNameArabic.trim() || r.fullName.trim())
    if (validMembers.length === 0) { toast.error('أدخل اسم فرد واحد على الأقل'); return }

    if (anchorMember && !sharedRelType) {
      // Check if all rows have their own relType
      const missingRel = validMembers.some(m => !m.relType)
      if (missingRel) { toast.error('اختر نوع العلاقة'); return }
    }

    setIsSubmitting(true)
    try {
      const body = {
        treeId,
        relativeOfId:     anchorMember?.id   ?? null,
        relationshipType: sharedRelType       || null,
        tribe:            sharedTribe         || null,
        birthRegion:      sharedRegion        || null,
        lineage:          sharedLineage       || null,
        members: validMembers.map(m => ({
          fullNameArabic:   m.fullNameArabic.trim() || null,
          fullName:         m.fullName.trim()        || null,
          gender:           m.gender,
          isAlive:          true,
          birthYear:        m.birthYear ? parseInt(m.birthYear, 10) : null,
          relationshipType: m.relType   || null,   // per-row override
          relativeOfId:     m.anchorId  || null,   // per-row anchor override
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

  // ── Shared relationship type display ───────────────────────────────────────
  const sharedRelLabel = REL_OPTIONS.find(o => o.value === sharedRelType)?.labelFull

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-khartoum-900 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-khartoum-900 text-lg">إضافة أفراد متعددين</h2>
              <p className="text-xs text-khartoum-400 mt-0.5">حتى ٢٠ فرداً — كل فرد مرتبط بشخص محدد في الشجرة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sand-100 rounded-xl transition-colors shrink-0">
            <X className="w-5 h-5 text-khartoum-500" />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* ── Section 1: Anchor person ─────────────────────────────── */}
            <div className="rounded-xl border border-sand-200 overflow-visible">
              <div className="px-4 py-3 bg-sand-50 flex items-center gap-2">
                <User className="w-4 h-4 text-khartoum-400 shrink-0" />
                <span className="text-sm font-semibold text-khartoum-700">
                  الإضافة بالنسبة لـ
                </span>
                {anchorMember && (
                  <span className="mr-1 text-xs text-khartoum-400 font-normal">(يمكنك التغيير)</span>
                )}
              </div>

              <div className="p-4">
                {/* Anchor display / picker */}
                {anchorMember ? (
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0',
                        anchorMember.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'
                      )}
                    >
                      <User className="w-5 h-5" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      {/* Primary name */}
                      <p className="font-bold text-khartoum-900 text-sm leading-tight">
                        {anchorMember.fullNameArabic || anchorMember.fullName}
                      </p>

                      {/* Sudanese lineage: ود أب ود جد / بنت أب بنت جد */}
                      {lineageOf(anchorMember.gender as 'MALE'|'FEMALE', anchorMember.fatherName, anchorMember.grandfatherName) && (
                        <p className="text-xs text-khartoum-600 mt-0.5 leading-tight">
                          {lineageOf(anchorMember.gender as 'MALE'|'FEMALE', anchorMember.fatherName, anchorMember.grandfatherName)}
                        </p>
                      )}

                      {/* Tags row: gender · year · tribe */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                          anchorMember.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        )}>
                          {anchorMember.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                        </span>
                        {anchorMember.birthYear && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sand-100 text-khartoum-500">
                            {anchorMember.birthYear}م
                          </span>
                        )}
                        {anchorMember.tribe && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 truncate max-w-[120px]">
                            {anchorMember.tribe}
                          </span>
                        )}
                        {anchorMember.occupation && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-khartoum-50 text-khartoum-500 truncate max-w-[120px]">
                            {anchorMember.occupation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Allow change unless locked by relativeOf prop */}
                    {!relativeOf && (
                      <button
                        type="button"
                        onClick={() => { setAnchorMember(null); setShowMemberList(true) }}
                        className="text-xs text-sand-600 hover:text-sand-800 underline shrink-0"
                      >
                        تغيير
                      </button>
                    )}
                  </div>
                ) : hasExisting ? (
                  /* Member search/picker */
                  <div className="relative">
                    <div className="flex items-center gap-2 input px-3 py-2 cursor-text"
                      onClick={() => setShowMemberList(true)}
                    >
                      <Search className="w-4 h-4 text-khartoum-300 shrink-0" />
                      <input
                        value={memberSearch}
                        onChange={e => { setMemberSearch(e.target.value); setShowMemberList(true) }}
                        onFocus={() => setShowMemberList(true)}
                        placeholder="ابحث عن شخص في الشجرة..."
                        className="flex-1 bg-transparent outline-none text-sm"
                      />
                    </div>
                    {showMemberList && (
                      <div className="absolute top-full right-0 left-0 z-10 mt-1 bg-white border border-sand-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-khartoum-400 text-center py-4">لا توجد نتائج</p>
                        ) : filteredMembers.map(m => {
                          const lin = lineageOf(m.gender as 'MALE'|'FEMALE', m.fatherName, m.grandfatherName)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => selectAnchor(m)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sand-50 transition-colors text-right border-b border-sand-50 last:border-0"
                            >
                              {/* Avatar */}
                              <div className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0',
                                m.gender === 'MALE' ? 'bg-blue-400' : 'bg-pink-400'
                              )}>
                                <User className="w-4 h-4" />
                              </div>

                              {/* Name + details */}
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-semibold text-khartoum-900 leading-tight">
                                  {m.fullNameArabic || m.fullName}
                                </p>
                                {lin && (
                                  <p className="text-xs text-khartoum-500 leading-tight mt-0.5">{lin}</p>
                                )}
                                <div className="flex items-center flex-wrap gap-1 mt-0.5">
                                  {m.birthYear && (
                                    <span className="text-[10px] text-khartoum-400">{m.birthYear}م</span>
                                  )}
                                  {m.tribe && (
                                    <span className="text-[10px] text-amber-600 before:content-['·'] before:mx-1">{m.tribe}</span>
                                  )}
                                  {m.occupation && (
                                    <span className="text-[10px] text-khartoum-400 before:content-['·'] before:mx-1">{m.occupation}</span>
                                  )}
                                </div>
                              </div>

                              {/* Gender badge */}
                              <span className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                                m.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                              )}>
                                {m.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-khartoum-400 italic">
                    لا يوجد أفراد في الشجرة بعد — سيُضاف الأفراد الجدد كجذور منفصلة
                  </p>
                )}
              </div>
            </div>

            {/* ── Section 2: Shared relationship type ─────────────────── */}
            {(anchorMember || !hasExisting) && anchorMember && (
              <div className="p-4 bg-sand-50 rounded-xl border border-sand-200">
                <label className="block text-xs font-semibold text-khartoum-600 mb-2.5">
                  نوع العلاقة الافتراضي مع «{anchorMember.fullNameArabic || anchorMember.fullName}»
                  <span className="font-normal text-khartoum-400 mr-1">(يمكن تغييره لكل فرد على حدة)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {REL_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium',
                        sharedRelType === opt.value
                          ? 'border-khartoum-700 bg-khartoum-900 text-white shadow-sm'
                          : 'border-khartoum-200 bg-white hover:border-sand-400 text-khartoum-700'
                      )}
                    >
                      <input
                        type="radio"
                        name="bulkSharedRelType"
                        value={opt.value}
                        checked={sharedRelType === opt.value}
                        onChange={() => setSharedRelType(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-xs opacity-60 w-3 shrink-0">{opt.icon}</span>
                      {opt.labelFull}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Section 3: Shared optional fields ───────────────────── */}
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
                    <label className="block text-xs font-medium text-khartoum-600 mb-1">النسب</label>
                    <input
                      value={sharedLineage}
                      onChange={e => setSharedLineage(e.target.value)}
                      placeholder="أحمد بن إبراهيم..."
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 4: Members ───────────────────────────────────── */}
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
                <span className="text-xs text-khartoum-400">{rows.length} / ٢٠</span>
              </div>

              {/* Close row picker when clicking outside */}
              {rowPickerOpenId && (
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => { setRowPickerOpenId(null); setRowPickerSearch('') }}
                />
              )}

              <div className="space-y-2">
                {rows.map((row, i) => {
                  // Effective anchor for this row
                  const rowAnchor = row.anchorId
                    ? existingMembers.find(m => m.id === row.anchorId) ?? null
                    : anchorMember

                  // Effective relationship
                  const effectiveRel = row.relType || sharedRelType
                  const relOpt       = REL_OPTIONS.find(o => o.value === effectiveRel)
                  const isRelOverride = !!row.relType && row.relType !== sharedRelType
                  const isAnchorOverride = !!row.anchorId && row.anchorId !== anchorMember?.id

                  // Filtered list for this row's picker
                  const rowFiltered = rowPickerSearch.trim()
                    ? existingMembers.filter(m => {
                        const q = rowPickerSearch.trim()
                        return (
                          (m.fullNameArabic  || '').includes(q) ||
                          (m.fullName        || '').toLowerCase().includes(q.toLowerCase()) ||
                          (m.fatherName      || '').includes(q) ||
                          (m.grandfatherName || '').includes(q) ||
                          (m.tribe           || '').includes(q) ||
                          (m.birthYear?.toString() || '').includes(q)
                        )
                      })
                    : existingMembers

                  return (
                    <div
                      key={row.id}
                      className="bg-white border border-sand-200 rounded-xl px-3 py-2.5 hover:border-sand-300 transition-colors space-y-2"
                    >
                      {/* ── Line 1: name · gender · year · delete ── */}
                      <div className="grid grid-cols-[26px_1fr_1fr_82px_66px_28px] gap-1.5 items-center">
                        <span className="w-6 h-6 rounded-md bg-sand-100 text-khartoum-500 text-xs flex items-center justify-center font-bold shrink-0">
                          {i + 1}
                        </span>

                        <input
                          value={row.fullNameArabic}
                          onChange={e => updateRow(row.id, 'fullNameArabic', e.target.value)}
                          placeholder="الاسم بالعربية"
                          className="input py-1.5 text-sm min-w-0"
                        />

                        <input
                          value={row.fullName}
                          onChange={e => updateRow(row.id, 'fullName', e.target.value)}
                          placeholder="English name"
                          className="input py-1.5 text-sm text-left min-w-0"
                          dir="ltr"
                        />

                        <div className="flex gap-1 justify-center shrink-0">
                          {([
                            { v: 'MALE',   label: 'ذكر',  ac: 'border-blue-400 bg-blue-50 text-blue-700'  },
                            { v: 'FEMALE', label: 'أنثى', ac: 'border-pink-400 bg-pink-50 text-pink-700'  },
                          ] as const).map(g => (
                            <button
                              key={g.v} type="button"
                              onClick={() => updateRow(row.id, 'gender', g.v)}
                              className={cn(
                                'px-2 h-[26px] rounded-md text-[11px] font-bold border-2 transition-all',
                                row.gender === g.v ? g.ac : 'border-sand-200 text-khartoum-300 hover:border-sand-300'
                              )}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>

                        <input
                          value={row.birthYear}
                          onChange={e => updateRow(row.id, 'birthYear', e.target.value)}
                          placeholder="—"
                          type="number"
                          min={1600}
                          max={new Date().getFullYear()}
                          className="input py-1.5 text-sm text-center w-full"
                          dir="ltr"
                        />

                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0',
                            rows.length <= 1 ? 'text-sand-200 cursor-not-allowed' : 'text-khartoum-300 hover:bg-red-50 hover:text-red-500'
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* ── Line 2: anchor person + relationship ── */}
                      {hasExisting && (
                        <div className="flex items-center gap-2 pr-8 flex-wrap">
                          {/* "بالنسبة لـ" label */}
                          <span className="text-[11px] text-khartoum-400 shrink-0">بالنسبة لـ</span>

                          {/* Per-row anchor picker trigger */}
                          <div className="relative z-40">
                            <button
                              type="button"
                              onClick={() => {
                                if (rowPickerOpenId === row.id) {
                                  setRowPickerOpenId(null); setRowPickerSearch('')
                                } else {
                                  setRowPickerOpenId(row.id); setRowPickerSearch('')
                                }
                              }}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
                                isAnchorOverride
                                  ? 'border-violet-400 bg-violet-50 text-violet-800'
                                  : rowAnchor
                                  ? 'border-khartoum-300 bg-khartoum-50 text-khartoum-700'
                                  : 'border-dashed border-sand-300 text-khartoum-400 hover:border-sand-400'
                              )}
                            >
                              {rowAnchor ? (
                                <>
                                  <div className={cn(
                                    'w-4 h-4 rounded-sm flex items-center justify-center text-white shrink-0',
                                    rowAnchor.gender === 'MALE' ? 'bg-blue-400' : 'bg-pink-400'
                                  )}>
                                    <User className="w-2.5 h-2.5" />
                                  </div>
                                  <span className="max-w-[110px] truncate">
                                    {rowAnchor.fullNameArabic || rowAnchor.fullName}
                                    {rowAnchor.fatherName && ` ${rowAnchor.gender === 'FEMALE' ? 'بنت' : 'ود'} ${rowAnchor.fatherName}`}
                                  </span>
                                  {rowAnchor.birthYear && (
                                    <span className="opacity-50 shrink-0">{rowAnchor.birthYear}م</span>
                                  )}
                                  {isAnchorOverride && <span className="text-violet-500 shrink-0">★</span>}
                                </>
                              ) : (
                                <>
                                  <Search className="w-3 h-3" />
                                  اختر شخصاً
                                </>
                              )}
                            </button>

                            {/* Per-row picker dropdown */}
                            {rowPickerOpenId === row.id && (
                              <div className="absolute top-full right-0 z-50 mt-1 w-72 bg-white border border-sand-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                {/* Search input */}
                                <div className="sticky top-0 bg-white border-b border-sand-100 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-khartoum-300 shrink-0" />
                                    <input
                                      autoFocus
                                      value={rowPickerSearch}
                                      onChange={e => setRowPickerSearch(e.target.value)}
                                      placeholder="ابحث بالاسم، الأب، القبيلة..."
                                      className="flex-1 text-xs outline-none bg-transparent"
                                    />
                                  </div>
                                </div>

                                {/* Clear override option */}
                                {row.anchorId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateRow(row.id, 'anchorId', '')
                                      updateRow(row.id, 'anchorName', '')
                                      setRowPickerOpenId(null); setRowPickerSearch('')
                                    }}
                                    className="w-full px-3 py-2 text-xs text-khartoum-400 hover:bg-sand-50 text-right border-b border-sand-50"
                                  >
                                    ↩ استخدم الافتراضي «{anchorMember?.fullNameArabic || anchorMember?.fullName || '—'}»
                                  </button>
                                )}

                                {rowFiltered.length === 0 ? (
                                  <p className="text-xs text-khartoum-400 text-center py-4">لا توجد نتائج</p>
                                ) : rowFiltered.map(m => {
                                  const lin = lineageOf(m.gender as 'MALE'|'FEMALE', m.fatherName, m.grandfatherName)
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => {
                                        updateRow(row.id, 'anchorId', m.id)
                                        updateRow(row.id, 'anchorName', m.fullNameArabic || m.fullName || '')
                                        setRowPickerOpenId(null); setRowPickerSearch('')
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sand-50 transition-colors text-right border-b border-sand-50 last:border-0"
                                    >
                                      <div className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0',
                                        m.gender === 'MALE' ? 'bg-blue-400' : 'bg-pink-400'
                                      )}>
                                        <User className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-khartoum-900 truncate leading-tight">
                                          {m.fullNameArabic || m.fullName}
                                        </p>
                                        {lin && <p className="text-[10px] text-khartoum-500 leading-tight">{lin}</p>}
                                        <div className="flex gap-1 mt-0.5">
                                          {m.birthYear && <span className="text-[10px] text-khartoum-400">{m.birthYear}م</span>}
                                          {m.tribe && <span className="text-[10px] text-amber-600 before:content-['·'] before:mx-0.5">{m.tribe}</span>}
                                        </div>
                                      </div>
                                      <span className={cn(
                                        'text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                                        m.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                                      )}>
                                        {m.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* "كـ" label */}
                          <span className="text-[11px] text-khartoum-400 shrink-0">كـ</span>

                          {/* Per-row relationship */}
                          <select
                            value={row.relType}
                            onChange={e => updateRow(row.id, 'relType', e.target.value as RelationshipType | '')}
                            className={cn(
                              'input py-1 text-xs',
                              isRelOverride ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold' : 'text-khartoum-600'
                            )}
                          >
                            <option value="">
                              {sharedRelType
                                ? `${relOpt?.labelShort ?? '—'} (افتراضي)`
                                : 'اختر العلاقة...'}
                            </option>
                            {REL_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.labelFull}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
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

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-5 border-t border-sand-100 bg-sand-50">
          {/* Summary bar */}
          {anchorMember && sharedRelType && validCount > 0 && (
            <div className="mb-3 px-3 py-2 bg-khartoum-50 rounded-lg border border-khartoum-100 text-xs text-khartoum-600 flex items-center gap-2">
              <span className="opacity-60">ستضيف</span>
              <strong>{validCount} فرد</strong>
              <span className="opacity-60">كـ</span>
              <strong>{sharedRelLabel}</strong>
              <span className="opacity-60">لـ</span>
              <strong>{anchorMember.fullNameArabic || anchorMember.fullName}</strong>
            </div>
          )}

          <div className="flex gap-3">
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
                ? `إضافة ${validCount} فرد`
                : 'أدخل الأسماء أولاً'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-6">إلغاء</button>
          </div>
        </div>

      </div>
    </div>
  )
}
