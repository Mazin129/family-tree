import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { deletePerson, updatePerson } from '@/lib/db/neo4j'
import { z } from 'zod'

const updateSchema = z.object({
  fullName:       z.string().min(2).optional(),
  fullNameArabic: z.string().optional().nullable(),
  fatherName:     z.string().optional().nullable(),
  gender:         z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).optional(),
  isAlive:        z.boolean().optional(),
  birthYear:      z.number().optional().nullable(),
  deathYear:      z.number().optional().nullable(),
  birthPlace:     z.string().optional().nullable(),
  tribe:          z.string().optional().nullable(),
  lineage:        z.string().optional().nullable(),
  bio:            z.string().optional().nullable(),
  bioArabic:      z.string().optional().nullable(),
  occupation:     z.string().optional().nullable(),
  privacyLevel:   z.enum(['PUBLIC', 'COMMUNITY', 'FAMILY', 'PRIVATE']).optional(),
})

// GET /api/family/members/[memberId]
export async function GET(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  try {
    const member = await prisma.treeMember.findUnique({ where: { id: params.memberId } })
    if (!member) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })
    return NextResponse.json({ success: true, data: member })
  } catch {
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// PATCH /api/family/members/[memberId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    // Verify access
    const member = await prisma.treeMember.findUnique({
      where: { id: params.memberId },
      include: { tree: true },
    })
    if (!member) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })
    if (member.tree.ownerId !== userId) {
      return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 403 })
    }

    const updated = await prisma.treeMember.update({
      where: { id: params.memberId },
      data:  data as any,
    })

    // Sync to Neo4j (best effort)
    updatePerson(member.neo4jPersonId, {
      fullName:       data.fullName || member.fullName,
      fullNameArabic: data.fullNameArabic ?? member.fullNameArabic,
      gender:         (data.gender || member.gender) as any,
      birthYear:      data.birthYear ?? member.birthYear,
      isAlive:        data.isAlive ?? member.isAlive,
      tribe:          data.tribe ?? member.tribe,
    }).catch(console.warn)

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE /api/family/members/[memberId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const member = await prisma.treeMember.findUnique({
      where:   { id: params.memberId },
      include: { tree: true },
    })
    if (!member) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })
    if (member.tree.ownerId !== userId) {
      return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 403 })
    }

    await prisma.treeMember.delete({ where: { id: params.memberId } })

    // Remove from Neo4j (best effort)
    deletePerson(member.neo4jPersonId).catch(console.warn)

    return NextResponse.json({ success: true, message: 'تم حذف الفرد' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
