import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'
import { v4 as uuid }  from 'uuid'
import { createPerson, createRelationship } from '@/lib/db/neo4j'

const addMemberSchema = z.object({
  treeId:           z.string(),
  fullName:         z.string().min(2),
  fullNameArabic:   z.string().optional().nullable(),
  fatherName:       z.string().optional().nullable(),
  grandfatherName:  z.string().optional().nullable(),
  gender:           z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
  isAlive:          z.boolean().default(true),
  birthYear:        z.number().optional().nullable(),
  deathYear:        z.number().optional().nullable(),
  birthPlace:       z.string().optional().nullable(),
  birthRegion:      z.string().optional().nullable(),
  tribe:            z.string().optional().nullable(),
  clan:             z.string().optional().nullable(),
  lineage:          z.string().optional().nullable(),
  bio:              z.string().optional().nullable(),
  bioArabic:        z.string().optional().nullable(),
  occupation:       z.string().optional().nullable(),
  privacyLevel:     z.enum(['PUBLIC', 'COMMUNITY', 'FAMILY', 'PRIVATE']).default('FAMILY'),
  // For relationship creation
  relativeOfId:     z.string().optional().nullable(),
  relationshipType: z.string().optional().nullable(),
})

// GET /api/family/members?treeId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const treeId = req.nextUrl.searchParams.get('treeId')
  if (!treeId) return NextResponse.json({ success: false, error: 'treeId مطلوب' }, { status: 400 })

  try {
    const members = await prisma.treeMember.findMany({
      where:   { treeId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ success: true, data: members })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// POST /api/family/members
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const body = await req.json()
    const data = addMemberSchema.parse(body)

    // Verify tree ownership/access
    const tree = await prisma.familyTree.findFirst({
      where: {
        id: data.treeId,
        OR: [
          { ownerId: userId },
          { collaborations: { some: { userId, role: { in: ['EDITOR', 'ADMIN'] } } } },
        ],
      },
    })
    if (!tree) return NextResponse.json({ success: false, error: 'غير مصرّح أو الشجرة غير موجودة' }, { status: 403 })

    const neo4jPersonId = `person-${uuid()}`

    // Create in PostgreSQL
    const member = await prisma.treeMember.create({
      data: {
        treeId:         data.treeId,
        neo4jPersonId,
        fullName:       data.fullName,
        fullNameArabic: data.fullNameArabic,
        fatherName:     data.fatherName,
        grandfatherName: data.grandfatherName,
        gender:         data.gender as any,
        isAlive:        data.isAlive,
        birthYear:      data.birthYear,
        deathYear:      data.deathYear,
        birthPlace:     data.birthPlace,
        birthRegion:    data.birthRegion as any,
        tribe:          data.tribe,
        clan:           data.clan,
        lineage:        data.lineage,
        bio:            data.bio,
        bioArabic:      data.bioArabic,
        occupation:     data.occupation,
        privacyLevel:   data.privacyLevel as any,
      },
    })

    // Create in Neo4j graph (non-blocking - best effort)
    createPerson({
      postgresId:     member.id,
      fullName:       data.fullName,
      fullNameArabic: data.fullNameArabic || null,
      gender:         data.gender as any,
      birthYear:      data.birthYear || null,
      isAlive:        data.isAlive,
      photo:          null,
      tribe:          data.tribe || null,
    }).catch(err => console.warn('Neo4j person creation failed:', err.message))

    // Create relationship if adding relative
    if (data.relativeOfId && data.relationshipType) {
      const relative = await prisma.treeMember.findUnique({ where: { id: data.relativeOfId } })
      if (relative) {
        createRelationship(
          relative.neo4jPersonId,
          neo4jPersonId,
          data.relationshipType as any
        ).catch(err => console.warn('Neo4j relationship creation failed:', err.message))
      }
    }

    // Update tree's updatedAt
    await prisma.familyTree.update({
      where:  { id: data.treeId },
      data:   { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message, details: err.errors }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
