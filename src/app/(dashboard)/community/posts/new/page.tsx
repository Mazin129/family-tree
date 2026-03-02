'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_OPTIONS = [
  { value: 'HISTORY', labelAr: 'تاريخ', labelEn: 'History' },
  { value: 'CULTURE', labelAr: 'ثقافة', labelEn: 'Culture' },
  { value: 'TRADITION', labelAr: 'تقاليد', labelEn: 'Traditions' },
  { value: 'FOLKLORE', labelAr: 'فولكلور', labelEn: 'Folklore' },
  { value: 'POETRY', labelAr: 'شعر', labelEn: 'Poetry' },
  { value: 'MUSIC', labelAr: 'موسيقى', labelEn: 'Music' },
  { value: 'FOOD', labelAr: 'طعام', labelEn: 'Food' },
  { value: 'LANGUAGE', labelAr: 'لغة', labelEn: 'Language' },
  { value: 'GENEALOGY', labelAr: 'أنساب', labelEn: 'Genealogy' },
  { value: 'NEWS', labelAr: 'أخبار', labelEn: 'News' },
  { value: 'GENERAL', labelAr: 'عام', labelEn: 'General' },
]

const schema = z.object({
  title:       z.string().min(3, '3 أحرف على الأقل').max(200),
  titleArabic: z.string().max(200).optional(),
  content:     z.string().min(10, '10 أحرف على الأقل').max(50000),
  contentAr:   z.string().max(50000).optional(),
  category:    z.enum(['HISTORY','CULTURE','TRADITION','FOLKLORE','POETRY','MUSIC','FOOD','LANGUAGE','GENEALOGY','NEWS','GENERAL']),
  tribe:       z.string().max(100).optional(),
  tags:        z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewPostPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'GENERAL' },
  })

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       data.title,
          titleArabic: data.titleArabic || undefined,
          content:     data.content,
          contentAr:   data.contentAr || undefined,
          category:    data.category,
          tribe:       data.tribe || undefined,
          tags:        data.tags ? data.tags.split(/[\s,،]+/).filter(Boolean).slice(0, 20) : [],
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'فشل النشر')
      toast.success('تم نشر المنشور بنجاح')
      router.push(`/community/posts/${json.data.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-container py-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-khartoum-500 hover:text-khartoum-700 mb-6">
          <ArrowRight className="w-4 h-4" />
          العودة للمجتمع
        </Link>

        <h1 className="section-title mb-2">منشور جديد</h1>
        <p className="section-subtitle mb-8">شارك قصة أو معلومة عن التراث السوداني</p>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <div>
            <label className="label">العنوان (إنجليزي) *</label>
            <input {...register('title')} className="input" placeholder="Post title" dir="ltr" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">العنوان (عربي)</label>
            <input {...register('titleArabic')} className="input" placeholder="عنوان المنشور" />
          </div>

          <div>
            <label className="label">المحتوى (إنجليزي) *</label>
            <textarea {...register('content')} rows={6} className="input resize-none" placeholder="Write your post..." dir="ltr" />
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
          </div>

          <div>
            <label className="label">المحتوى (عربي)</label>
            <textarea {...register('contentAr')} rows={6} className="input resize-none" placeholder="اكتب محتوى المنشور..." />
          </div>

          <div>
            <label className="label">الفئة *</label>
            <select {...register('category')} className="input">
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.labelAr} / {o.labelEn}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">القبيلة (اختياري)</label>
            <input {...register('tribe')} className="input" placeholder="مثال: الجعليين" />
          </div>

          <div>
            <label className="label">وسوم (اختياري)</label>
            <input {...register('tags')} className="input" placeholder="تراث، موسيقى، تاريخ (مفصولة بفاصلة)" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              نشر
            </button>
            <Link href="/community" className="btn-secondary px-6 py-3">إلغاء</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
