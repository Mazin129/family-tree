'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, User, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { TreeMember, RelationshipType, SudaneseRegion } from '@/types'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import { cn } from '@/lib/utils/cn'
import { extractParentsFromLineage } from '@/lib/utils/arabic'
import { validateTimeline, validateRequiredName } from '@/lib/utils/validation'

const memberSchema = z.object({
  fullName:         z.string().optional().or(z.literal('')),
  fullNameArabic:   z.string().optional().or(z.literal('')),
  fatherName:       z.string().optional().or(z.literal('')),
  grandfatherName:  z.string().optional().or(z.literal('')),
  gender:           z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
  isAlive:          z.boolean().default(true),
  birthYear:        z.preprocess(v => (typeof v === 'number' && isNaN(v)) ? null : v, z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable()),
  deathYear:        z.preprocess(v => (typeof v === 'number' && isNaN(v)) ? null : v, z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable()),
  birthPlace:       z.string().optional().or(z.literal('')),
  birthRegion:      z.string().optional().or(z.literal('')),
  tribe:            z.string().optional().or(z.literal('')),
  clan:             z.string().optional().or(z.literal('')),
  lineage:          z.string().optional().or(z.literal('')),
  bio:              z.string().max(500).optional().or(z.literal('')),
  bioArabic:        z.string().max(500).optional().or(z.literal('')),
  occupation:       z.string().optional().or(z.literal('')),
  relationshipType: z.enum([
    'PARENT_OF', 'CHILD_OF', 'SPOUSE_OF', 'SIBLING_OF',
    'HALF_SIBLING_OF', 'ADOPTED_CHILD_OF', 'EXTENDED_KIN',
  ]).optional(),
}).refine(
  data => !!(data.fullName?.trim() || data.fullNameArabic?.trim()),
  { message: 'يجب إدخال الاسم بالعربية أو بالإنجليزية على الأقل', path: ['fullName'] }
).refine(
  data => {
    if (data.birthYear && data.deathYear && data.deathYear < data.birthYear) return false
    return true
  },
  { message: 'سنة الوفاة قبل سنة الميلاد', path: ['deathYear'] }
).refine(
  data => {
    if (data.isAlive && data.deathYear) return false
    return true
  },
  { message: 'لا يمكن تحديد سنة وفاة لشخص على قيد الحياة', path: ['deathYear'] }
)

type MemberForm = z.infer<typeof memberSchema>

interface AddMemberModalProps {
  treeId:         string
  relativeOf?:    TreeMember   // If adding relative of an existing member
  addParentHint?: 'father' | 'mother'  // Pre-fill relationship when adding parent (optional)
  onSuccess:      (member: TreeMember) => void
  onClose:        () => void
  onAddParent?:   (member: TreeMember, type: 'father' | 'mother') => void  // Optional: reopen to add parent
}

// Spouse first for clarity (e.g. Muslim multiple wives); system allows multiple SPOUSE_OF per person
const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'SPOUSE_OF',        label: 'زوج/زوجة' },
  { value: 'CHILD_OF',         label: 'ابن/ابنة' },
  { value: 'PARENT_OF',        label: 'والد/والدة' },
  { value: 'SIBLING_OF',       label: 'أخ/أخت' },
  { value: 'HALF_SIBLING_OF',  label: 'أخ/أخت من طرف واحد' },
  { value: 'ADOPTED_CHILD_OF', label: 'ابن/ابنة بالتبني' },
  { value: 'EXTENDED_KIN',     label: 'قريب آخر' },
]

export function AddMemberModal({ treeId, relativeOf, addParentHint, onSuccess, onClose, onAddParent }: AddMemberModalProps) {
  const [step, setStep] = useState<'basic' | 'details' | 'confirm' | 'addParentsOptional'>(
    relativeOf ? 'basic' : 'basic'
  )
  const [createdMember, setCreatedMember] = useState<TreeMember | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      gender:           'MALE',
      isAlive:          true,
      tribe:             relativeOf?.tribe || '',
      relationshipType:  addParentHint === 'father' ? 'PARENT_OF' : addParentHint === 'mother' ? 'PARENT_OF' : undefined,
    },
  })

  // Pre-fill parent type when opening to add father/mother (optional)
  useEffect(() => {
    if (relativeOf && addParentHint) {
      setValue('relationshipType', 'PARENT_OF')
      setValue('gender', addParentHint === 'father' ? 'MALE' : 'FEMALE')
    }
  }, [relativeOf, addParentHint, setValue])

  const isAlive  = watch('isAlive')
  const lineage  = watch('lineage')

  // Auto-fill father/grandfather from lineage string (Task 4: Lineage Extraction)
  const handleLineageBlur = () => {
    if (!lineage) return
    const { fatherName, grandfatherName } = extractParentsFromLineage(lineage)
    // Only auto-fill if fields are empty
    if (fatherName && !watch('fatherName'))         setValue('fatherName', fatherName)
    if (grandfatherName && !watch('grandfatherName')) setValue('grandfatherName', grandfatherName)
  }

  async function onSubmit(data: MemberForm) {
    try {
      const body = {
        ...data,
        treeId,
        relativeOfId:     relativeOf?.id,
        relationshipType: data.relationshipType,
        fullName:         data.fullName || null,
        birthYear:        data.birthYear || null,
        deathYear:        data.deathYear || null,
        fullNameArabic:   data.fullNameArabic || null,
        fatherName:       data.fatherName || null,
        grandfatherName:  data.grandfatherName || null,
        tribe:            data.tribe || null,
        birthPlace:       data.birthPlace || null,
        birthRegion:      data.birthRegion || null,
        bio:              data.bio || null,
        bioArabic:        data.bioArabic || null,
        occupation:       data.occupation || null,
        lineage:          data.lineage || null,
      }

      const res  = await fetch('/api/family/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()

      if (!json.success) throw new Error(json.error)

      toast.success('تم إضافة الفرد بنجاح')
      if (relativeOf) {
        onSuccess(json.data)
        onClose()
      } else {
        setCreatedMember(json.data)
        setStep('addParentsOptional')
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الإضافة')
    }
  }

  // Optional step after creating a person: add father / mother (not mandatory)
  if (step === 'addParentsOptional' && createdMember) {
    const name = createdMember.fullNameArabic || createdMember.fullName
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up p-6">
          <h2 className="font-bold text-khartoum-900 text-lg mb-1">إضافة والدين؟</h2>
          <p className="text-sm text-khartoum-500 mb-6">اختياري — يمكنك تخطي هذا أو إضافة الأب أو الأم لـ {name}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                onSuccess(createdMember)
                onClose()
              }}
              className="btn-secondary w-full py-3"
            >
              تخطي
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                setTimeout(() => onAddParent?.(createdMember, 'father'), 0)
              }}
              className="btn-primary w-full py-3"
            >
              إضافة أب
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                setTimeout(() => onAddParent?.(createdMember, 'mother'), 0)
              }}
              className="btn-primary w-full py-3"
            >
              إضافة أم
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white">
          <div>
            <h2 className="font-bold text-khartoum-900 text-lg">
              {relativeOf ? `إضافة قريب لـ ${relativeOf.fullNameArabic || relativeOf.fullName}` : 'إضافة فرد جديد'}
            </h2>
            <p className="text-sm text-khartoum-400 mt-0.5">أدخل بيانات الفرد</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sand-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-khartoum-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">

            {/* Relationship type (if adding relative) */}
            {relativeOf && (
              <div className="p-4 bg-sand-50 rounded-xl border border-sand-200">
                <label className="label">نوع العلاقة مع {relativeOf.fullNameArabic || relativeOf.fullName}</label>
                <p className="text-xs text-khartoum-500 mt-1 mb-2">
                  يمكن إضافة أكثر من زوج/زوجة للشخص نفسه (حسب الشرع).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm',
                        watch('relationshipType') === opt.value
                          ? 'border-sand-400 bg-sand-100 text-sand-800 font-medium'
                          : 'border-khartoum-200 hover:border-sand-300'
                      )}
                    >
                      <input
                        type="radio"
                        {...register('relationshipType')}
                        value={opt.value}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              {/* Full name EN */}
              <div>
                <label className="label">الاسم الكامل (بالإنجليزية)</label>
                <input {...register('fullName')} placeholder="Ahmed Ibrahim Ali" className="input text-left" dir="ltr" />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
              </div>

              {/* Full name AR */}
              <div>
                <label className="label">الاسم الكامل بالعربية</label>
                <input {...register('fullNameArabic')} placeholder="أحمد إبراهيم علي" className="input" />
              </div>

              {/* Father name */}
              <div>
                <label className="label">اسم الأب</label>
                <input {...register('fatherName')} placeholder="إبراهيم" className="input" />
              </div>

              {/* Grandfather name */}
              <div>
                <label className="label">اسم الجد</label>
                <input {...register('grandfatherName')} placeholder="علي" className="input" />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="label">الجنس *</label>
              <div className="flex gap-3">
                {[
                  { value: 'MALE',   label: 'ذكر',  color: 'nile' },
                  { value: 'FEMALE', label: 'أنثى', color: 'sahara' },
                ].map(g => (
                  <label
                    key={g.value}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium',
                      watch('gender') === g.value
                        ? g.color === 'nile'
                          ? 'border-nile-400 bg-nile-50 text-nile-700'
                          : 'border-sahara-400 bg-sahara-50 text-sahara-700'
                        : 'border-khartoum-200 hover:border-khartoum-300'
                    )}
                  >
                    <input type="radio" {...register('gender')} value={g.value} className="sr-only" />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Birth year */}
              <div>
                <label className="label">سنة الميلاد</label>
                <input
                  {...register('birthYear', { valueAsNumber: true })}
                  type="number"
                  placeholder="١٩٥٠"
                  min={1600}
                  max={new Date().getFullYear()}
                  className="input text-left"
                  dir="ltr"
                />
              </div>

              {/* Is alive */}
              <div className="flex items-center gap-3 mt-6">
                <input
                  {...register('isAlive')}
                  type="checkbox"
                  id="isAlive"
                  className="h-4 w-4 rounded border-khartoum-300 text-sand-500"
                />
                <label htmlFor="isAlive" className="text-sm text-khartoum-700">لا يزال على قيد الحياة</label>
              </div>

              {/* Death year */}
              {!isAlive && (
                <div>
                  <label className="label">سنة الوفاة</label>
                  <input
                    {...register('deathYear', { valueAsNumber: true })}
                    type="number"
                    placeholder="٢٠٢٠"
                    min={1600}
                    max={new Date().getFullYear()}
                    className="input text-left"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Tribe */}
              <div>
                <label className="label">القبيلة</label>
                <select {...register('tribe')} className="input">
                  <option value="">اختر القبيلة</option>
                  {SUDANESE_TRIBES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="label">الولاية / الإقليم</label>
                <select {...register('birthRegion')} className="input">
                  <option value="">اختر الولاية</option>
                  {Object.entries(REGION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label.ar}</option>
                  ))}
                </select>
              </div>

              {/* Birth place */}
              <div>
                <label className="label">مكان الميلاد</label>
                <input {...register('birthPlace')} placeholder="مدينة / قرية" className="input" />
              </div>

              {/* Occupation */}
              <div>
                <label className="label">المهنة</label>
                <input {...register('occupation')} placeholder="مهندس، معلم..." className="input" />
              </div>
            </div>

            {/* Lineage — auto-fills father/grandfather on blur (Task 4) */}
            <div>
              <label className="label">النسب (سلسلة الأجداد)</label>
              <input
                {...register('lineage')}
                onBlur={handleLineageBlur}
                placeholder="أحمد بن إبراهيم بن علي بن محمد..."
                className="input"
              />
              <p className="text-xs text-khartoum-400 mt-1">ادخل سلسلة الأجداد مفصولة بـ "بن/بنت" — يتم ملء اسم الأب والجد تلقائياً</p>
            </div>

            {/* Bio */}
            <div>
              <label className="label">نبذة مختصرة (بالعربية)</label>
              <textarea
                {...register('bioArabic')}
                rows={3}
                placeholder="معلومات عن هذا الشخص، إنجازاته، وأثره في الأسرة..."
                className="input resize-none"
              />
            </div>

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-sand-100 bg-sand-50 flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
              إضافة الفرد
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-6">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
