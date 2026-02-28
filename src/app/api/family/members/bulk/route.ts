import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'
import { v4 as uuid }  from 'uuid'
import { createPerson, createRelationship } from '@/lib/db/neo4j'

const bulkMemberSchema = z.object({
  treeId:              z.string(),
  relativeOfId:        z.string().optional().nullable(),
  relationshipType:    z.string().optional().nullable(), // shared default
  // Shared fields applied to all members
  tribe:               z.string().optional().nullable(),
  clan:                z.string().optional().nullable(),
  birthRegion:         z.string().optional().nullable(),
  lineage:             z.string().optional().nullable(),
  // Per-member data (min 1, max 20)
  members: z.array(z.object({
    fullName:         z.string().optional().nullable(),
    fullNameArabic:   z.string().optional().nullable(),
    fatherName:       z.string().optional().nullable(),
    grandfatherName:  z.string().optional().nullable(),
    gender:           z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
    isAlive:          z.boolean().default(true),
    birthYear:        z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
    occupation:       z.string().optional().nullable(),
    // Per-member relationship override — overrides the shared `relationshipType`
    relationshipType: z.string().optional().nullable(),
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

    // Resolve anchor member (used by all rows that don't override relativeOfId)
    let relativeNeo4jId:    string | null = null
    let relativePostgresId: string | null = null
    if (data.relativeOfId) {
      const relative = await prisma.treeMember.findUnique({ where: { id: data.relativeOfId } })
      if (relative) {
        relativeNeo4jId    = relative.neo4jPersonId
        relativePostgresId = relative.id
      }
    }

    // Create all members sequentially to keep relationship logic correct
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

        // Resolve per-member relationship type (falls back to shared default)
        const relType = m.relationshipType ?? data.relationshipType

        if (relativePostgresId && relativeNeo4jId && relType) {
          // ── PostgreSQL relationship (primary store) ───────────────────────
          if (relType === 'CHILD_OF') {
            // new member IS a child of the anchor → anchor -PARENT_OF-> new
            await prisma.memberRelationship.upsert({
              where: {
                fromMemberId_toMemberId_type: {
                  fromMemberId: relativePostgresId,
                  toMemberId:   member.id,
                  type:         'PARENT_OF',
                },
              },
              create: { fromMemberId: relativePostgresId, toMemberId: member.id, type: 'PARENT_OF' },
              update: {},
            })
          } else if (relType === 'PARENT_OF') {
            // new member IS a parent of the anchor → new -PARENT_OF-> anchor
            await prisma.memberRelationship.upsert({
              where: {
                fromMemberId_toMemberId_type: {
                  fromMemberId: member.id,
                  toMemberId:   relativePostgresId,
                  type:         'PARENT_OF',
                },
              },
              create: { fromMemberId: member.id, toMemberId: relativePostgresId, type: 'PARENT_OF' },
              update: {},
            })
          } else {
            // SPOUSE_OF, SIBLING_OF, HALF_SIBLING_OF, etc.
            await prisma.memberRelationship.upsert({
              where: {
                fromMemberId_toMemberId_type: {
                  fromMemberId: relativePostgresId,
                  toMemberId:   member.id,
                  type:         relType,
                },
              },
              create: { fromMemberId: relativePostgresId, toMemberId: member.id, type: relType },
              update: {},
            })
          }

          // ── Neo4j mirror (non-blocking) ───────────────────────────────────
          if (relType === 'CHILD_OF') {
            createRelationship(relativeNeo4jId, neo4jPersonId, 'PARENT_OF')
              .catch(err => console.warn('Neo4j rel failed:', err.message))
          } else if (relType === 'PARENT_OF') {
            createRelationship(neo4jPersonId, relativeNeo4jId, 'PARENT_OF')
              .catch(err => console.warn('Neo4j rel failed:', err.message))
          } else {
            createRelationship(relativeNeo4jId, neo4jPersonId, relType as any)
              .catch(err => console.warn('Neo4j rel failed:', err.message))
          }
        }

        return member
      })
    )

    // Update tree timestamp
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
