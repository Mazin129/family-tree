import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, MessageSquare, Heart, Eye, Pin } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  HISTORY: 'تاريخ', CULTURE: 'ثقافة', TRADITION: 'تقاليد',
  FOLKLORE: 'فولكلور', POETRY: 'شعر', MUSIC: 'موسيقى',
  FOOD: 'طعام', LANGUAGE: 'لغة', GENEALOGY: 'أنساب',
  NEWS: 'أخبار', GENERAL: 'عام',
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const post = await prisma.communityPost.findFirst({
    where: { id, isPublished: true },
    include: {
      author: { select: { id: true, name: true, nameArabic: true, image: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })

  if (!post) notFound()

  await prisma.communityPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  })

  const content = post.contentAr || post.content
  const title = post.titleArabic || post.title

  return (
    <div className="page-container py-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-khartoum-500 hover:text-khartoum-700 mb-6">
          <ArrowRight className="w-4 h-4" />
          العودة للمجتمع
        </Link>

        <article className="card p-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-heritage flex items-center justify-center text-white font-semibold shrink-0">
              {(post.author.nameArabic || post.author.name || 'م').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-khartoum-900">
                  {post.author.nameArabic || post.author.name}
                </span>
                <span className="badge bg-sand-100 text-sand-800 text-xs">
                  {CATEGORY_LABELS[post.category]}
                </span>
                {post.tribe && <span className="badge badge-sand text-xs">{post.tribe}</span>}
              </div>
              <p className="text-xs text-khartoum-400 mt-0.5">
                {new Intl.DateTimeFormat('ar-SD', { dateStyle: 'long' }).format(new Date(post.createdAt))}
              </p>
            </div>
            {post.isPinned && (
              <span className="flex items-center gap-1 text-xs text-sand-600">
                <Pin className="w-3.5 h-3.5" />
                مثبّت
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-khartoum-900 mb-4 leading-snug">{title}</h1>

          <div className="prose prose-khartoum max-w-none text-khartoum-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-sand-100">
              {post.tags.map(tag => (
                <span key={tag} className="badge bg-sand-50 text-khartoum-500 border border-sand-200">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-sand-100 text-sm text-khartoum-400">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {post._count.comments}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {post._count.likes}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.viewCount + 1}
            </span>
          </div>
        </article>
      </div>
    </div>
  )
}
