import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth/auth-options'
import { prisma }           from '@/lib/db/prisma'
import Link                 from 'next/link'
import { Globe, Plus, CheckCircle2 } from 'lucide-react'

const CATEGORY_LABELS: Record<string, { ar: string; emoji: string }> = {
  CLOTHING:     { ar: 'الملابس',     emoji: '👗' },
  MUSIC:        { ar: 'الموسيقى',    emoji: '🎵' },
  DANCE:        { ar: 'الرقص',       emoji: '💃' },
  FOOD:         { ar: 'الطعام',      emoji: '🍲' },
  CRAFT:        { ar: 'الحرف اليدوية', emoji: '🎨' },
  ARCHITECTURE: { ar: 'العمارة',     emoji: '🏛️' },
  LANGUAGE:     { ar: 'اللغة',       emoji: '📖' },
  POETRY:       { ar: 'الشعر',       emoji: '✍️' },
  PROVERB:      { ar: 'الأمثال',     emoji: '💬' },
  CEREMONY:     { ar: 'الاحتفالات',  emoji: '🎊' },
  RELIGION:     { ar: 'الدين',       emoji: '☪️' },
  OTHER:        { ar: 'أخرى',        emoji: '📌' },
}

export default async function HeritagePage() {
  const items = await prisma.heritageItem.findMany({
    where: { isPublic: true },
    orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
    take: 24,
    include: { uploader: { select: { name: true, nameArabic: true } } },
  })

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">مقتنيات التراث السوداني</h1>
          <p className="section-subtitle">موسوعة الموروث الثقافي والحضاري</p>
        </div>
        <Link href="/community/heritage/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة مقتنى
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-16 text-center max-w-lg mx-auto">
          <Globe className="w-16 h-16 text-sand-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-khartoum-900 mb-2">لا توجد مقتنيات بعد</h2>
          <p className="text-khartoum-500 mb-6">ساهم في توثيق التراث السوداني بإضافة مقتنياتك</p>
          <Link href="/community/heritage/new" className="btn-primary">إضافة أول مقتنى</Link>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => {
          const catLabel = CATEGORY_LABELS[category] || { ar: category, emoji: '📌' }
          return (
            <div key={category} className="mb-10">
              <h2 className="flex items-center gap-2 text-lg font-bold text-khartoum-900 mb-4">
                <span className="text-2xl">{catLabel.emoji}</span>
                {catLabel.ar}
                <span className="badge-sand text-xs">{catItems.length}</span>
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catItems.map(item => (
                  <div key={item.id} className="card-hover p-4 block">
                    {item.imageUrl && (
                      <div className="w-full h-32 rounded-xl bg-sand-100 mb-3 overflow-hidden">
                        <img src={item.imageUrl} alt={item.titleArabic || item.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-khartoum-900 text-sm leading-tight">
                        {item.titleArabic || item.title}
                      </h3>
                      {item.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-acacia-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-khartoum-500 line-clamp-2 leading-relaxed">
                        {item.descriptionAr || item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {item.tribe && <span className="badge-sand text-xs">{item.tribe}</span>}
                      {item.period && <span className="text-xs text-khartoum-400">{item.period}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
