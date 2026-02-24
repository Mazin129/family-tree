'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TreePine, ArrowLeft, Loader2, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import Link from 'next/link'

const treeSchema = z.object({
  name:          z.string().min(2, 'اسم الشجرة مطلوب'),
  nameArabic:    z.string().min(2, 'الاسم بالعربية مطلوب'),
  description:   z.string().optional(),
  descriptionAr: z.string().optional(),
  tribe:         z.string().optional(),
  clan:          z.string().optional(),
  region:        z.string().optional(),
  isPublic:      z.boolean().default(false),
  tags:          z.string().optional(),
})

type TreeForm = z.infer<typeof treeSchema>

export default function NewTreePage() {
  const router  = useRouter()
  const [step, setStep] = useState<1 | 2>(1)

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<TreeForm>({
    resolver: zodResolver(treeSchema),
    defaultValues: { isPublic: false },
  })

  const isPublic = watch('isPublic')

  async function onSubmit(data: TreeForm) {
    try {
      const res  = await fetch('/api/family/trees', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...data,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      const json = await res.json()

      if (!json.success) throw new Error(json.error)

      toast.success('تم إنشاء الشجرة بنجاح!')
      router.push(`/tree/${json.data.id}`)
    } catch (err: any) {
      toast.error(err.message || 'فشل إنشاء الشجرة')
    }
  }

  return (
    <div className="page-container py-8 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/tree" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="section-title">إنشاء شجرة عائلية جديدة</h1>
          <p className="section-subtitle">ابدأ بتوثيق تاريخ عائلتك</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-khartoum-900">المعلومات الأساسية</h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label">اسم الشجرة بالعربية *</label>
              <input
                {...register('nameArabic')}
                placeholder="شجرة عائلة النيل"
                className="input"
              />
              {errors.nameArabic && <p className="text-red-500 text-xs mt-1">{errors.nameArabic.message}</p>}
            </div>

            <div>
              <label className="label">اسم الشجرة بالإنجليزية *</label>
              <input
                {...register('name')}
                placeholder="Al-Nile Family Tree"
                className="input text-left"
                dir="ltr"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">وصف مختصر</label>
            <textarea
              {...register('descriptionAr')}
              rows={3}
              placeholder="اكتب نبذة عن هذه العائلة وتاريخها..."
              className="input resize-none"
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-khartoum-900">الهوية القبلية والجغرافية</h2>

          <div className="grid md:grid-cols-2 gap-5">
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
              <label className="label">الفرع / البطن</label>
              <input {...register('clan')} placeholder="الفرع أو البطن" className="input" />
            </div>

            <div>
              <label className="label">الإقليم / الولاية الأصلية</label>
              <select {...register('region')} className="input">
                <option value="">اختر الإقليم</option>
                {Object.entries(REGION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label.ar}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">وسوم (tags)</label>
              <input
                {...register('tags')}
                placeholder="تاريخ, جعليين, شمال السودان"
                className="input"
              />
              <p className="text-xs text-khartoum-400 mt-1">افصل بين الوسوم بفاصلة</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-khartoum-900 mb-4">إعدادات الخصوصية</h2>

          <div className="grid grid-cols-2 gap-4">
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              !isPublic ? 'border-sand-400 bg-sand-50' : 'border-khartoum-200'
            }`}>
              <input {...register('isPublic')} type="radio" value="false" className="sr-only" />
              <Lock className={`w-5 h-5 mt-0.5 ${!isPublic ? 'text-sand-600' : 'text-khartoum-300'}`} />
              <div>
                <div className="font-medium text-sm">خاصة</div>
                <div className="text-xs text-khartoum-500 mt-0.5">لأفراد العائلة فقط</div>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              isPublic ? 'border-nile-400 bg-nile-50' : 'border-khartoum-200'
            }`}>
              <input {...register('isPublic')} type="radio" value="true" className="sr-only" />
              <Globe className={`w-5 h-5 mt-0.5 ${isPublic ? 'text-nile-600' : 'text-khartoum-300'}`} />
              <div>
                <div className="font-medium text-sm">عامة</div>
                <div className="text-xs text-khartoum-500 mt-0.5">يمكن للمجتمع رؤيتها</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <TreePine className="w-5 h-5" />
            )}
            إنشاء الشجرة
          </button>
          <Link href="/tree" className="btn-secondary px-6">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
