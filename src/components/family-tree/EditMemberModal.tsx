'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { TreeMember } from '@/types'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import { cn } from '@/lib/utils/cn'
import { extractParentsFromLineage } from '@/lib/utils/arabic'

const editSchema = z.object({
  fullName:       z.string().optional().or(z.literal('')),
  fullNameArabic: z.string().optional().or(z.literal('')),
  fatherName:     z.string().optional().or(z.literal('')),
  grandfatherName: z.string().optional().or(z.literal('')),
  gender:         z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
  isAlive:        z.boolean(),
  birthYear:      z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
  deathYear:      z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
  birthPlace:     z.string().optional().or(z.literal('')),
  birthRegion:    z.string().optional().or(z.literal('')),
  tribe:          z.string().optional().or(z.literal('')),
  clan:           z.string().optional().or(z.literal('')),
  lineage:        z.string().optional().or(z.literal('')),
  bio:            z.string().max(500).optional().or(z.literal('')),
  bioArabic:      z.string().max(500).optional().or(z.literal('')),
  occupation:     z.string().optional().or(z.literal('')),
  privacyLevel:   z.enum(['PUBLIC', 'COMMUNITY', 'FAMILY', 'PRIVATE']),
}).refine(
  data => {
    if (data.birthYear != null && data.deathYear != null && data.deathYear < data.birthYear) return false
    return true
  },
  { message: 'سنة الوفاة قبل سنة الميلاد', path: ['deathYear'] }
).refine(
  data => {
    if (data.isAlive && data.deathYear != null) return false
    return true
  },
  { message: 'لا يمكن تحديد سنة وفاة لشخص على قيد الحياة', path: ['deathYear'] }
)

type EditForm = z.infer<typeof editSchema>

interface EditMemberModalProps {
  member: TreeMember
  onSuccess: (member: TreeMember) => void
  onClose: () => void
}

export function EditMemberModal({ member, onSuccess, onClose }: EditMemberModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName:       member.fullName ?? '',
      fullNameArabic: member.fullNameArabic ?? '',
      fatherName:     member.fatherName ?? '',
      grandfatherName: member.grandfatherName ?? '',
      gender:         member.gender,
      isAlive:        member.isAlive,
      birthYear:      member.birthYear ?? undefined,
      deathYear:      member.deathYear ?? undefined,
      birthPlace:     member.birthPlace ?? '',
      birthRegion:    (member.birthRegion as string) ?? '',
      tribe:          member.tribe ?? '',
      clan:           member.clan ?? '',
      lineage:        member.lineage ?? '',
      bio:            member.bio ?? '',
      bioArabic:      member.bioArabic ?? '',
      occupation:     member.occupation ?? '',
      privacyLevel:   (member.privacyLevel as EditForm['privacyLevel']) || 'FAMILY',
    },
  })

  const isAlive = watch('isAlive')
  const lineage = watch('lineage')

  const handleLineageBlur = () => {
    if (!lineage) return
    const { fatherName, grandfatherName } = extractParentsFromLineage(lineage)
    if (fatherName && !watch('fatherName')) setValue('fatherName', fatherName)
    if (grandfatherName && !watch('grandfatherName')) setValue('grandfatherName', grandfatherName)
  }

  async function onSubmit(data: EditForm) {
    try {
      // If both names empty, keep existing (allow saving when only changing alive/deceased)
      const fullName = (data.fullName?.trim() || data.fullNameArabic?.trim())
        ? (data.fullName?.trim() || null)
        : (member.fullName || null)
      const fullNameArabic = (data.fullName?.trim() || data.fullNameArabic?.trim())
        ? (data.fullNameArabic?.trim() || null)
        : (member.fullNameArabic || null)

      const res = await fetch(`/api/family/members/${member.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName:       fullName,
          fullNameArabic: fullNameArabic,
          fatherName:     data.fatherName || null,
          grandfatherName: data.grandfatherName || null,
          gender:         data.gender,
          isAlive:        data.isAlive,
          birthYear:      data.birthYear ?? null,
          deathYear:      data.deathYear ?? null,
          birthPlace:     data.birthPlace || null,
          birthRegion:    data.birthRegion || null,
          tribe:          data.tribe || null,
          clan:           data.clan || null,
          lineage:        data.lineage || null,
          bio:            data.bio || null,
          bioArabic:      data.bioArabic || null,
          occupation:     data.occupation || null,
          privacyLevel:   data.privacyLevel,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('تم تحديث بيانات الفرد')
      onSuccess(json.data)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التعديل')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white">
          <div>
            <h2 className="font-bold text-khartoum-900 text-lg">تعديل بيانات الفرد</h2>
            <p className="text-sm text-khartoum-400 mt-0.5">{member.fullNameArabic || member.fullName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-sand-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-khartoum-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="label">الاسم الكامل (بالإنجليزية)</label>
                <input {...register('fullName')} placeholder="Ahmed Ibrahim Ali" className="input text-left" dir="ltr" />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="label">الاسم الكامل بالعربية</label>
                <input {...register('fullNameArabic')} placeholder="أحمد إبراهيم علي" className="input" />
              </div>
              <div>
                <label className="label">اسم الأب</label>
                <input {...register('fatherName')} className="input" />
              </div>
              <div>
                <label className="label">اسم الجد</label>
                <input {...register('grandfatherName')} className="input" />
              </div>
            </div>

            <div>
              <label className="label">الجنس</label>
              <div className="flex gap-3">
                {[
                  { value: 'MALE', label: 'ذكر', color: 'nile' },
                  { value: 'FEMALE', label: 'أنثى', color: 'sahara' },
                  { value: 'UNSPECIFIED', label: 'غير محدد', color: 'khartoum' },
                ].map(g => (
                  <label
                    key={g.value}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium',
                      watch('gender') === g.value
                        ? g.color === 'nile' ? 'border-nile-400 bg-nile-50 text-nile-700'
                        : g.color === 'sahara' ? 'border-sahara-400 bg-sahara-50 text-sahara-700'
                        : 'border-khartoum-400 bg-khartoum-50 text-khartoum-700'
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
              <div>
                <label className="label">سنة الميلاد</label>
                <input
                  {...register('birthYear', { valueAsNumber: true })}
                  type="number"
                  min={1600}
                  max={new Date().getFullYear()}
                  className="input text-left"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input {...register('isAlive')} type="checkbox" id="editIsAlive" className="h-4 w-4 rounded border-khartoum-300 text-sand-500" />
                <label htmlFor="editIsAlive" className="text-sm text-khartoum-700">لا يزال على قيد الحياة <span className="text-khartoum-400 font-normal">(يمكن تغيير الحالة دون إلزام بحقل سنة الوفاة)</span></label>
              </div>
              {!isAlive && (
                <div>
                  <label className="label">سنة الوفاة</label>
                  <input {...register('deathYear', { valueAsNumber: true })} type="number" min={1600} max={new Date().getFullYear()} className="input text-left" dir="ltr" />
                </div>
              )}
              <div>
                <label className="label">القبيلة</label>
                <select {...register('tribe')} className="input">
                  <option value="">اختر القبيلة</option>
                  {SUDANESE_TRIBES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">الولاية / الإقليم</label>
                <select {...register('birthRegion')} className="input">
                  <option value="">اختر الولاية</option>
                  {Object.entries(REGION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label.ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">مكان الميلاد</label>
                <input {...register('birthPlace')} className="input" />
              </div>
              <div>
                <label className="label">المهنة</label>
                <input {...register('occupation')} className="input" />
              </div>
            </div>

            <div>
              <label className="label">النسب (سلسلة الأجداد)</label>
              <input {...register('lineage')} onBlur={handleLineageBlur} className="input" />
            </div>

            <div>
              <label className="label">نبذة مختصرة (بالعربية)</label>
              <textarea {...register('bioArabic')} rows={3} className="input resize-none" />
            </div>

            <div>
              <label className="label">مستوى الخصوصية</label>
              <select {...register('privacyLevel')} className="input">
                <option value="PUBLIC">عام</option>
                <option value="COMMUNITY">المجتمع</option>
                <option value="FAMILY">العائلة</option>
                <option value="PRIVATE">خاص</option>
              </select>
            </div>
          </div>

          <div className="p-6 border-t border-sand-100 bg-sand-50 flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
              حفظ التعديلات
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-6">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}
