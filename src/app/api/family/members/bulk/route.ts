import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'
import { v4 as uuid }  from 'uuid'
import { createPerson, createRelationship } from '@/lib/db/neo4j'

const bulkMemberSchema = z.object({
  treeId:           z.string(),
  relativeOfId:     z.string().optional().nullable(),
  relationshipType: z.string().optional().nullable(),
  // Shared fields applied to all members
  tribe:            z.string().optional().nullable(),
  clan:             z.string().optional().nullable(),
  birthRegion:      z.string().optional().nullable(),
  lineage:          z.string().optional().nullable(),
  // Per-member data (min 1, max 20)
  members: z.array(z.object({
    fullName:        z.string().optional().nullable(),
    fullNameArabic:  z.string().optional().nullable(),
    fatherName:      z.string().optional().nullable(),
    grandfatherName: z.string().optional().nullable(),
    gender:          z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
    isAlive:         z.boolean().default(true),
    birthYear:       z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
    occupation:      z.string().optional().nullable(),
  })).min(1).max(20),
})

// POST /api/family/members/bulk
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const body = await req.json()
    const data = bulkMemberSchema.parse(body)

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

    // Resolve relative's neo4j ID upfront (single DB call)
    let relativeNeo4jId: string | null = null
    if (data.relativeOfId && data.relationshipType) {
      const relative = await prisma.treeMember.findUnique({ where: { id: data.relativeOfId } })
      if (relative) relativeNeo4jId = relative.neo4jPersonId
    }

    // Create all members in parallel
    const createdMembers = await Promise.all(
      data.members.map(async (m) => {
        const neo4jPersonId = `person-${uuid()}`

        const member = await prisma.treeMember.create({
          data: {
            treeId:          data.treeId,
            neo4jPersonId,
            fullName:        m.fullName || m.fullNameArabic || '',
            fullNameArabic:  m.fullNameArabic,
            fatherName:      m.fatherName,
            grandfatherName: m.grandfatherName,
            gender:          m.gender as any,
            isAlive:         m.isAlive,
            birthYear:       m.birthYear,
            tribe:           data.tribe,
            clan:            data.clan,
            birthRegion:     data.birthRegion as any,
            lineage:         data.lineage,
            occupation:      m.occupation,
            privacyLevel:    'FAMILY',
          },
        })

        // Neo4j graph — non-blocking best-effort
        createPerson({
          postgresId:     member.id,
          fullName:       m.fullName || m.fullNameArabic || '',
          fullNameArabic: m.fullNameArabic || null,
          gender:         m.gender as any,
          birthYear:      m.birthYear || null,
          isAlive:        m.isAlive,
          photo:          null,
          tribe:          data.tribe || null,
        }).catch(err => console.warn('Neo4j createPerson failed:', err.message))

        // Relationship — non-blocking best-effort
        if (relativeNeo4jId && data.relationshipType) {
          createRelationship(
            relativeNeo4jId,
            neo4jPersonId,
            data.relationshipType as any
          ).catch(err => console.warn('Neo4j createRelationship failed:', err.message))
        }

        return member
      })
    )

    // Update tree's updatedAt timestamp
    await prisma.familyTree.update({
      where: { id: data.treeId },
      data:  { updatedAt: new Date() },
    })

    return NextResponse.json(
      { success: true, data: createdMembers, count: createdMembers.length },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0].message, details: err.errors },
        { status: 400 }
      )
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}
