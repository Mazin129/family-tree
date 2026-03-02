import { getServerSession }  from 'next-auth'
import { authOptions }       from '@/lib/auth/auth-options'
import { prisma }            from '@/lib/db/prisma'
import Link                  from 'next/link'
import { MessageSquare, Heart, Eye, Pin, Plus, Globe, Filter } from 'lucide-react'
import type { PostCategory } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  HISTORY: 'تاريخ', CULTURE: 'ثقافة', TRADITION: 'تقاليد',
  FOLKLORE: 'فولكلور', POETRY: 'شعر', MUSIC: 'موسيقى',
  FOOD: 'طعام', LANGUAGE: 'لغة', GENEALOGY: 'أنساب',
  NEWS: 'أخبار', GENERAL: 'عام',
}

const CATEGORY_COLORS: Record<string, string> = {
  HISTORY: 'bg-sand-100 text-sand-800', CULTURE: 'bg-nile-100 text-nile-800',
  TRADITION: 'bg-sahara-100 text-sahara-800', POETRY: 'bg-acacia-100 text-acacia-800',
  GENEALOGY: 'bg-sand-200 text-sand-900', GENERAL: 'bg-khartoum-100 text-khartoum-700',
  FOLKLORE: 'bg-gold-100 text-gold-700', MUSIC: 'bg-nile-50 text-nile-700',
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { category?: string; page?: string }
}) {
  const session  = await getServerSession(authOptions)
  const page     = parseInt(searchParams.page || '1', 10)
  const category = searchParams.category as PostCategory | undefined
  const limit    = 10

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where: {
        isPublished: true,
        ...(category ? { category } : {}),
      },
      include: {
        author: { select: { id: true, name: true, nameArabic: true, image: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.communityPost.count({
      where: { isPublished: true, ...(category ? { category } : {}) },
    }),
  ])

  return (
    <div className="page-container py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="section-title">مجتمع التراث السوداني</h1>
          <p className="section-subtitle">شارك قصصك وتراثك مع المجتمع</p>
        </div>
        <Link href="/community/posts/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          منشور جديد
        </Link>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/community"
          className={`badge text-sm px-3 py-1.5 cursor-pointer transition-colors ${
            !category ? 'bg-sand-500 text-white' : 'badge-sand hover:bg-sand-200'
          }`}
        >
          الكل
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/community?category=${key}`}
            className={`badge text-sm px-3 py-1.5 cursor-pointer transition-colors ${
              category === key
                ? 'bg-sand-500 text-white'
                : (CATEGORY_COLORS[key] || 'badge-sand') + ' hover:opacity-80'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Posts feed */}
        <div className="lg:col-span-2 space-y-4">
          {posts.length === 0 ? (
            <div className="card p-12 text-center">
              <Globe className="w-10 h-10 text-sand-300 mx-auto mb-4" />
              <p className="text-khartoum-500">لا توجد منشورات في هذه الفئة بعد</p>
              <Link href="/community/posts/new" className="btn-primary mt-4 inline-flex">
                كن أول من ينشر
              </Link>
            </div>
          ) : (
            posts.map(post => (
              <Link key={post.id} href={`/community/posts/${post.id}`} className="card-hover p-6 block">
                {post.isPinned && (
                  <div className="flex items-center gap-1 text-xs text-sand-600 mb-2">
                    <Pin className="w-3 h-3" />
                    مثبّت
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  {/* Author avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-heritage flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {(post.author.nameArabic || post.author.name || 'م').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-khartoum-900 text-sm">
                        {post.author.nameArabic || post.author.name}
                      </span>
                      <span className={`badge text-xs ${CATEGORY_COLORS[post.category] || 'badge-sand'}`}>
                        {CATEGORY_LABELS[post.category]}
                      </span>
                      {post.tribe && (
                        <span className="badge badge-sand text-xs">{post.tribe}</span>
                      )}
                    </div>
                    <p className="text-xs text-khartoum-400 mt-0.5">
                      {new Intl.DateTimeFormat('ar-SD', { dateStyle: 'medium' }).format(new Date(post.createdAt))}
                    </p>
                  </div>
                </div>

                <h2 className="font-bold text-khartoum-900 text-lg mb-2 leading-snug">
                  {post.titleArabic || post.title}
                </h2>

                <p className="text-khartoum-600 text-sm leading-relaxed line-clamp-3">
                  {post.contentAr || post.content}
                </p>

                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {post.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="badge bg-sand-50 text-khartoum-500 border border-sand-200 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-sand-100 text-sm text-khartoum-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post._count.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {post._count.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.viewCount}
                  </span>
                </div>
              </Link>
            ))
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center gap-2 pt-4">
              {page > 1 && (
                <Link href={`/community?page=${page - 1}${category ? `&category=${category}` : ''}`} className="btn-secondary text-sm">
                  السابق
                </Link>
              )}
              <span className="flex items-center text-sm text-khartoum-500 px-3">
                {page} / {Math.ceil(total / limit)}
              </span>
              {page < Math.ceil(total / limit) && (
                <Link href={`/community?page=${page + 1}${category ? `&category=${category}` : ''}`} className="btn-secondary text-sm">
                  التالي
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Heritage navigation */}
          <div className="card p-5">
            <h3 className="font-semibold text-khartoum-900 mb-3">التراث والثقافة</h3>
            <div className="space-y-2">
              {[
                { label: 'مقتنيات التراث',  href: '/community/heritage',     emoji: '🏛️' },
                { label: 'التاريخ الشفهي',  href: '/community/oral-history', emoji: '🎙️' },
                { label: 'قبائل السودان',   href: '/community/tribes',       emoji: '👥' },
                { label: 'الموروث الشعبي',  href: '/community/folklore',     emoji: '📖' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sand-50 transition-colors text-sm"
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-khartoum-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Community stats */}
          <div className="card p-5 bg-gradient-to-br from-sand-900 to-khartoum-900 text-white">
            <h3 className="font-semibold mb-4">إحصائيات المجتمع</h3>
            <div className="space-y-3">
              {[
                { label: 'منشورات', value: total },
                { label: 'قبيلة موثقة', value: 50       },
                { label: 'إقليم مغطى', value: 18        },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sand-300 text-sm">{s.label}</span>
                  <span className="font-bold">{s.value.toLocaleString('ar-SD')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
