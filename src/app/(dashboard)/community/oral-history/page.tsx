import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth/auth-options'
import { prisma }           from '@/lib/db/prisma'
import Link                 from 'next/link'
import { Mic, Play, Plus, Clock, Globe } from 'lucide-react'

export default async function OralHistoryPage() {
  const items = await prisma.oralHistory.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { uploader: { select: { name: true, nameArabic: true } } },
  })

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">أرشيف التاريخ الشفهي</h1>
          <p className="section-subtitle">روايات وقصص من أفواه الأجداد</p>
        </div>
        <Link href="/community/oral-history/upload" className="btn-primary">
          <Plus className="w-4 h-4" />
          رفع رواية
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center max-w-lg mx-auto">
          <Mic className="w-16 h-16 text-sand-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-khartoum-900 mb-2">لا توجد روايات بعد</h2>
          <p className="text-khartoum-500 mb-6 leading-relaxed">
            ساعد في الحفاظ على التراث الشفهي السوداني قبل أن يضيع. سجّل روايات كبار السن والقصص التاريخية.
          </p>
          <Link href="/community/oral-history/upload" className="btn-primary">رفع أول رواية</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div key={item.id} className="card-hover p-5">
              {/* Media type indicator */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                item.mediaType === 'AUDIO' ? 'bg-nile-100' : 'bg-sahara-100'
              }`}>
                {item.mediaType === 'AUDIO'
                  ? <Mic  className="w-5 h-5 text-nile-600" />
                  : <Play className="w-5 h-5 text-sahara-600" />
                }
              </div>

              <h3 className="font-semibold text-khartoum-900 mb-1">
                {item.titleArabic || item.title}
              </h3>

              {item.narrator && (
                <p className="text-sm text-khartoum-500 mb-2">الراوي: {item.narrator}</p>
              )}

              {item.description && (
                <p className="text-sm text-khartoum-500 line-clamp-2 leading-relaxed mb-3">
                  {item.descriptionAr || item.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-khartoum-400">
                {item.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                  </span>
                )}
                {item.tribe && <span className="badge-sand">{item.tribe}</span>}
                {item.year && <span>{item.year}</span>}
              </div>

              <div className="flex gap-2 mt-4">
                <Link
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 text-sm py-2"
                >
                  <Play className="w-4 h-4" />
                  استماع
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
