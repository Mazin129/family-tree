import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'

const createPostSchema = z.object({
  title:       z.string().min(3).max(200).trim(),
  titleArabic: z.string().max(200).trim().optional(),
  content:     z.string().min(10).max(50000).trim(),
  contentAr:   z.string().max(50000).trim().optional(),
  category:    z.enum(['HISTORY','CULTURE','TRADITION','FOLKLORE','POETRY','MUSIC','FOOD','LANGUAGE','GENEALOGY','NEWS','GENERAL']),
  tribe:       z.string().max(100).trim().optional(),
  region:      z.string().max(50).trim().optional(),
  tags:        z.array(z.string().max(50)).max(20).optional().default([]),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const page     = parseInt(searchParams.get('page') || '1', 10)
  const limit    = 10

  try {
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: {
          isPublished: true,
          ...(category ? { category: category as any } : {}),
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
        where: { isPublished: true, ...(category ? { category: category as any } : {}) },
      }),
    ])

    return NextResponse.json({
      success: true,
      data:    posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const body = await req.json()
    const data = createPostSchema.parse(body)

    const post = await prisma.communityPost.create({
      data: {
        authorId:    userId,
        title:       data.title,
        titleArabic: data.titleArabic,
        content:     data.content,
        contentAr:   data.contentAr,
        category:    data.category as any,
        tribe:       data.tribe,
        region:      data.region as any,
        tags:        data.tags,
        isPublished: true,
      },
    })

    return NextResponse.json({ success: true, data: post }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
