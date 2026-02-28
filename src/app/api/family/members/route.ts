import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { getTreeAccess } from '@/lib/auth/tree-access'
import { prisma }      from '@/lib/db/prisma'
import { z }           from 'zod'
import { v4 as uuid }  from 'uuid'
import { createPerson, createRelationship, countParentsByGender, wouldCreateCycle } from '@/lib/db/neo4j'
import { validateMember, validateParentChildAge, validateNoSelfRelation } from '@/lib/utils/validation'

const addMemberSchema = z.object({
  treeId:           z.string().max(100),
  fullName:         z.string().max(200).optional().nullable(),
  fullNameArabic:   z.string().max(200).optional().nullable(),
  fatherName:       z.string().max(200).optional().nullable(),
  grandfatherName:  z.string().max(200).optional().nullable(),
  gender:           z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']),
  isAlive:          z.boolean().default(true),
  birthYear:        z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
  deathYear:        z.number().int().min(1600).max(new Date().getFullYear()).optional().nullable(),
  birthPlace:       z.string().max(200).optional().nullable(),
  birthRegion:      z.string().optional().nullable(),
  tribe:            z.string().max(100).optional().nullable(),
  clan:             z.string().max(100).optional().nullable(),
  lineage:          z.string().max(500).optional().nullable(),
  bio:              z.string().max(5000).optional().nullable(),
  bioArabic:        z.string().max(5000).optional().nullable(),
  occupation:       z.string().max(200).optional().nullable(),
  privacyLevel:     z.enum(['PUBLIC', 'COMMUNITY', 'FAMILY', 'PRIVATE']).default('FAMILY'),
  relativeOfId:     z.string().max(100).optional().nullable(),
  relationshipType: z.string().optional().nullable(),
})

// GET /api/family/members?treeId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const treeId = req.nextUrl.searchParams.get('treeId')
  if (!treeId) return NextResponse.json({ success: false, error: 'treeId مطلوب' }, { status: 400 })

  const userId = (session.user as any).id
  const access = await getTreeAccess(userId, treeId)
  if (!access.canView) {
    return NextResponse.json({ success: false, error: 'غير مصرّح أو الشجرة غير موجودة' }, { status: 403 })
  }

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

    // ── Validate member data (Task 3: Consistency & Error Detection) ──
    const memberValidation = validateMember(data)
    if (!memberValidation.isValid) {
      return NextResponse.json(
        { success: false, error: memberValidation.errors[0].message, details: memberValidation.errors },
        { status: 422 }
      )
    }

    // ── Prevent self-referencing relationships ──
    if (data.relativeOfId && data.relativeOfId === data.relativeOfId) {
      // Self-relation would be caught at relationship creation stage below
    }

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
        fullName:       data.fullName || data.fullNameArabic || '',
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
      fullName:       data.fullName || data.fullNameArabic || '',
      fullNameArabic: data.fullNameArabic || null,
      gender:         data.gender as any,
      birthYear:      data.birthYear || null,
      isAlive:        data.isAlive,
      photo:          null,
      tribe:          data.tribe || null,
    }).catch(err => console.warn('Neo4j person creation failed:', err.message))

    // Create relationship if adding relative — with corrected direction
    if (data.relativeOfId && data.relationshipType) {
      const relative = await prisma.treeMember.findUnique({ where: { id: data.relativeOfId } })
      if (relative) {
        const relType = data.relationshipType

        if (relType === 'CHILD_OF') {
          // UI label "ابن/ابنة": new person IS a child of the existing person
          // → existing -PARENT_OF-> new
          // Save to PostgreSQL (primary store)
          await prisma.memberRelationship.upsert({
            where: { fromMemberId_toMemberId_type: { fromMemberId: relative.id, toMemberId: member.id, type: 'PARENT_OF' } },
            create: { fromMemberId: relative.id, toMemberId: member.id, type: 'PARENT_OF' },
            update: {},
          })
          // Mirror to Neo4j (best-effort)
          createRelationship(relative.neo4jPersonId, neo4jPersonId, 'PARENT_OF')
            .catch(err => console.warn('Neo4j relationship creation failed:', err.message))

        } else if (relType === 'PARENT_OF') {
          // UI label "والد/والدة": new person IS a parent of the existing person
          // → new -PARENT_OF-> existing  (reversed!)

          // Validate: parent-child age gap (Task 3)
          const ageCheck = validateParentChildAge(data.birthYear, relative.birthYear)
          if (!ageCheck.isValid) {
            await prisma.treeMember.delete({ where: { id: member.id } })
            return NextResponse.json(
              { success: false, error: ageCheck.errors[0].message },
              { status: 422 }
            )
          }

          // Validate: existing member must not already have a parent of same gender (Postgres)
          const pgParentCount = await prisma.memberRelationship.count({
            where: {
              toMemberId: relative.id,
              type: 'PARENT_OF',
              fromMember: { gender: data.gender as any },
            },
          })
          if (pgParentCount >= 1) {
            await prisma.treeMember.delete({ where: { id: member.id } })
            const genderLabel = data.gender === 'MALE' ? 'والد' : data.gender === 'FEMALE' ? 'والدة' : 'والد/والدة'
            return NextResponse.json(
              { success: false, error: `${relative.fullNameArabic || relative.fullName} لديه بالفعل ${genderLabel} مسجّل` },
              { status: 422 }
            )
          }

          // Save to PostgreSQL (primary store)
          await prisma.memberRelationship.upsert({
            where: { fromMemberId_toMemberId_type: { fromMemberId: member.id, toMemberId: relative.id, type: 'PARENT_OF' } },
            create: { fromMemberId: member.id, toMemberId: relative.id, type: 'PARENT_OF' },
            update: {},
          })
          // Mirror to Neo4j (best-effort)
          createRelationship(neo4jPersonId, relative.neo4jPersonId, 'PARENT_OF')
            .catch(err => console.warn('Neo4j relationship creation failed:', err.message))

        } else {
          // SPOUSE_OF, SIBLING_OF, HALF_SIBLING_OF, etc. — direction unchanged
          // Save to PostgreSQL (primary store)
          await prisma.memberRelationship.upsert({
            where: { fromMemberId_toMemberId_type: { fromMemberId: relative.id, toMemberId: member.id, type: relType } },
            create: { fromMemberId: relative.id, toMemberId: member.id, type: relType },
            update: {},
          })
          // Mirror to Neo4j (best-effort)
          createRelationship(relative.neo4jPersonId, neo4jPersonId, relType as any)
            .catch(err => console.warn('Neo4j relationship creation failed:', err.message))
        }
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
