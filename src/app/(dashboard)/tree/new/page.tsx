'use client'

import { useState } from 'react'
import { useRouter }  from 'next/navigation'
import { useForm }    from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }          from 'zod'
import {
  TreePine, ArrowLeft, Loader2, Globe, Lock,
  Feather, MapPin, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import { toast }  from 'sonner'
import { SUDANESE_TRIBES, REGION_LABELS } from '@/types'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

const treeSchema = z.object({
  name:          z.string().optional().or(z.literal('')),
  nameArabic:    z.string().min(2, 'يرجى إدخال اسم الشجرة بالعربية'),
  description:   z.string().optional(),
  descriptionAr: z.string().optional(),
  tribe:         z.string().optional(),
  clan:          z.string().optional(),
  region:        z.string().optional(),
  isPublic:      z.boolean().default(false),
  tags:          z.string().optional(),
})

type TreeForm = z.infer<typeof treeSchema>

const STEPS = [
  { num: 1, label: 'الاسم والوصف',   icon: Feather      },
  { num: 2, label: 'الهوية',          icon: MapPin       },
  { num: 3, label: 'الخصوصية',        icon: ShieldCheck  },
]

export default function NewTreePage() {
  const router  = useRouter()
  const [step, setStep] = useState(1)

  const {
    register, handleSubmit, watch, trigger,
    formState: { errors, isSubmitting },
  } = useForm<TreeForm>({
    resolver: zodResolver(treeSchema),
    defaultValues: { isPublic: false },
  })

  const isPublic = watch('isPublic')

  async function goNext() {
    const fields: (keyof TreeForm)[] = step === 1 ? ['nameArabic'] : []
    const ok = await trigger(fields)
    if (ok) setStep(s => Math.min(s + 1, 3))
  }

  async function onSubmit(data: TreeForm) {
    try {
      const res  = await fetch('/api/family/trees', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    <div className="min-h-[calc(100vh-64px)] bg-gradient-desert flex flex-col" dir="rtl">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 bg-white/80 backdrop-blur-sm border-b border-sand-100">
        <Link href="/tree" className="w-9 h-9 rounded-xl border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-khartoum-500" />
        </Link>
        <div>
          <h1 className="font-bold text-khartoum-900 text-sm sm:text-base leading-tight">إنشاء شجرة عائلية</h1>
          <p className="text-xs text-khartoum-400 mt-0.5">ابدأ بتوثيق تاريخ عائلتك</p>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-xl">

          {/* ── Step indicator ─────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  type="button"
                  onClick={() => s.num < step && setStep(s.num)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 transition-all',
                    s.num < step ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all font-bold text-sm',
                    s.num === step
                      ? 'bg-khartoum-900 text-white shadow-lg scale-110'
                      : s.num < step
                      ? 'bg-sand-500 text-white'
                      : 'bg-white border-2 border-sand-200 text-khartoum-400',
                  )}>
                    {s.num < step ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden sm:block',
                    s.num === step ? 'text-khartoum-900' : 'text-khartoum-400',
                  )}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'w-16 sm:w-24 h-0.5 mx-1 transition-colors',
                    step > s.num ? 'bg-sand-500' : 'bg-sand-200',
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step card ──────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white rounded-2xl shadow-card border border-sand-100 overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-5 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white flex items-center gap-3">
                {(() => {
                  const Icon = STEPS[step - 1].icon
                  return (
                    <div className="w-10 h-10 rounded-xl bg-khartoum-900 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  )
                })()}
                <div>
                  <h2 className="font-bold text-khartoum-900">{STEPS[step - 1].label}</h2>
                  <p className="text-xs text-khartoum-400 mt-0.5">الخطوة {step} من {STEPS.length}</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 space-y-5">

                {/* ── Step 1: Name + Description ────────────────────── */}
                {step === 1 && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">اسم الشجرة بالعربية *</label>
                        <input
                          {...register('nameArabic')}
                          placeholder="شجرة عائلة النيل"
                          className="input"
                          autoFocus
                        />
                        {errors.nameArabic && (
                          <p className="text-red-500 text-xs mt-1">{errors.nameArabic.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="label">الاسم بالإنجليزية</label>
                        <input
                          {...register('name')}
                          placeholder="Al-Nile Family Tree"
                          className="input text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">وصف مختصر</label>
                      <textarea
                        {...register('descriptionAr')}
                        rows={4}
                        placeholder="اكتب نبذة عن هذه العائلة وتاريخها وأصولها…"
                        className="input resize-none"
                      />
                    </div>
                  </>
                )}

                {/* ── Step 2: Tribal / geographic identity ──────────── */}
                {step === 2 && (
                  <div className="grid sm:grid-cols-2 gap-4">
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
                        placeholder="تاريخ، جعليين، شمال السودان"
                        className="input"
                      />
                      <p className="text-xs text-khartoum-400 mt-1">افصل بين الوسوم بفاصلة</p>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Privacy ───────────────────────────────── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-khartoum-600 leading-relaxed">
                      اختر مستوى الخصوصية لشجرتك. يمكنك تغيير هذا الإعداد لاحقاً من صفحة الإعدادات.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Private */}
                      <label className={cn(
                        'flex flex-col gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-all',
                        !isPublic
                          ? 'border-khartoum-700 bg-khartoum-50 shadow-sm'
                          : 'border-sand-200 hover:border-sand-300',
                      )}>
                        <input {...register('isPublic')} type="radio" value="false" className="sr-only" />
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          !isPublic ? 'bg-khartoum-900' : 'bg-sand-100',
                        )}>
                          <Lock className={cn('w-5 h-5', !isPublic ? 'text-white' : 'text-khartoum-400')} />
                        </div>
                        <div>
                          <div className="font-semibold text-khartoum-900 text-sm">خاصة</div>
                          <div className="text-xs text-khartoum-500 mt-0.5 leading-relaxed">
                            لأفراد العائلة فقط
                          </div>
                        </div>
                      </label>

                      {/* Public */}
                      <label className={cn(
                        'flex flex-col gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-all',
                        isPublic
                          ? 'border-nile-500 bg-nile-50 shadow-sm'
                          : 'border-sand-200 hover:border-sand-300',
                      )}>
                        <input {...register('isPublic')} type="radio" value="true" className="sr-only" />
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          isPublic ? 'bg-nile-600' : 'bg-sand-100',
                        )}>
                          <Globe className={cn('w-5 h-5', isPublic ? 'text-white' : 'text-khartoum-400')} />
                        </div>
                        <div>
                          <div className="font-semibold text-khartoum-900 text-sm">عامة</div>
                          <div className="text-xs text-khartoum-500 mt-0.5 leading-relaxed">
                            يمكن للمجتمع رؤيتها والاستفادة منها
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Summary */}
                    <div className="bg-sand-50 rounded-xl p-4 border border-sand-100">
                      <p className="text-xs text-khartoum-500 font-medium mb-2">ملخص الشجرة</p>
                      <p className="text-sm font-bold text-khartoum-900">{watch('nameArabic') || '—'}</p>
                      {watch('tribe') && (
                        <p className="text-xs text-khartoum-500 mt-1">قبيلة {watch('tribe')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card footer – navigation buttons */}
              <div className="px-6 py-4 border-t border-sand-100 bg-sand-50/50 flex justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => Math.max(s - 1, 1))}
                    className="btn-secondary px-6 text-sm"
                  >
                    السابق
                  </button>
                ) : (
                  <Link href="/tree" className="btn-secondary px-6 text-sm">إلغاء</Link>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-primary px-8 text-sm"
                  >
                    التالي
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary px-8 text-sm gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TreePine className="w-4 h-4" />
                    )}
                    إنشاء الشجرة
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
