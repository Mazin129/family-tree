import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'
import { v4 as uuid }  from 'uuid'

const createTreeSchema = z.object({
  name:         z.string().optional().nullable(),
  nameArabic:   z.string().optional(),
  description:  z.string().optional(),
  descriptionAr: z.string().optional(),
  tribe:        z.string().optional(),
  clan:         z.string().optional(),
  region:       z.string().optional(),
  isPublic:     z.boolean().default(false),
  tags:         z.array(z.string()).optional().default([]),
})

// GET  /api/family/trees  — list user's trees
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const trees = await prisma.familyTree.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { members: true, collaborations: true } },
        tags:   true,
      },
    })

    return NextResponse.json({ success: true, data: trees })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// POST /api/family/trees  — create new tree
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const body = await req.json()
    const data = createTreeSchema.parse(body)

    const neo4jTreeId = `tree-${uuid()}`

    const tree = await prisma.familyTree.create({
      data: {
        ownerId:      userId,
        name:         data.name || data.nameArabic || '',
        nameArabic:   data.nameArabic,
        description:  data.description,
        descriptionAr: data.descriptionAr,
        tribe:        data.tribe,
        clan:         data.clan,
        region:       data.region as any,
        isPublic:     data.isPublic,
        neo4jTreeId,
        tags: {
          create: data.tags.map(tag => ({ tag })),
        },
      },
      include: { tags: true, _count: { select: { members: true } } },
    })

    return NextResponse.json({ success: true, data: tree }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
