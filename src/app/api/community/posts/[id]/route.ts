import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const post = await prisma.communityPost.findFirst({
      where: { id, isPublished: true },
      include: {
        author: { select: { id: true, name: true, nameArabic: true, image: true } },
        _count: { select: { comments: true, likes: true } },
      },
    })

    if (!post) return NextResponse.json({ success: false, error: 'المنشور غير موجود' }, { status: 404 })

    // Increment view count
    await prisma.communityPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ success: true, data: { ...post, viewCount: post.viewCount + 1 } })
  } catch {
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
