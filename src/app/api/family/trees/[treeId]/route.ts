import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { getTreeForVisualization } from '@/lib/db/neo4j'

// GET /api/family/trees/[treeId]
export async function GET(
  req: NextRequest,
  { params }: { params: { treeId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id
  const { treeId } = params

  try {
    const tree = await prisma.familyTree.findFirst({
      where: {
        id: treeId,
        OR: [
          { ownerId: userId },
          { isPublic: true },
          { collaborations: { some: { userId } } },
        ],
      },
      include: {
        owner:         { select: { id: true, name: true, nameArabic: true, image: true } },
        tags:          true,
        _count:        { select: { members: true, collaborations: true } },
        collaborations: {
          include: { user: { select: { id: true, name: true, nameArabic: true, image: true } } },
        },
      },
    })

    if (!tree) {
      return NextResponse.json({ success: false, error: 'الشجرة غير موجودة' }, { status: 404 })
    }

    // Get root member for visualization
    const rootMember = await prisma.treeMember.findFirst({
      where: { treeId, userId },
    }) || await prisma.treeMember.findFirst({ where: { treeId } })

    // Get visualization data from Neo4j (if available)
    let visualization = null
    if (rootMember?.neo4jPersonId) {
      try {
        visualization = await getTreeForVisualization(rootMember.neo4jPersonId)
      } catch {
        // Neo4j not available, use fallback flat structure
        visualization = await buildFlatVisualization(treeId)
      }
    } else {
      visualization = await buildFlatVisualization(treeId)
    }

    return NextResponse.json({ success: true, data: { tree, visualization } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE /api/family/trees/[treeId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { treeId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id

  try {
    const tree = await prisma.familyTree.findFirst({
      where: { id: params.treeId, ownerId: userId },
    })
    if (!tree) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })

    await prisma.familyTree.delete({ where: { id: params.treeId } })
    return NextResponse.json({ success: true, message: 'تم حذف الشجرة' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// Helper: build visualization from PostgreSQL when Neo4j is unavailable
async function buildFlatVisualization(treeId: string) {
  const members = await prisma.treeMember.findMany({
    where: { treeId },
    orderBy: { birthYear: 'asc' },
  })

  if (members.length === 0) return null

  // Simple: first member is root, rest are children
  const root = members[0]
  return {
    id:           root.id,
    name:         root.fullName,
    nameArabic:   root.fullNameArabic,
    gender:       root.gender,
    birthYear:    root.birthYear,
    deathYear:    root.deathYear,
    isAlive:      root.isAlive,
    photo:        root.photo,
    tribe:        root.tribe,
    privacyLevel: root.privacyLevel,
    postgresId:   root.id,
    children:     members.slice(1).map(m => ({
      id:           m.id,
      name:         m.fullName,
      nameArabic:   m.fullNameArabic,
      gender:       m.gender,
      birthYear:    m.birthYear,
      deathYear:    m.deathYear,
      isAlive:      m.isAlive,
      photo:        m.photo,
      tribe:        m.tribe,
      privacyLevel: m.privacyLevel,
      postgresId:   m.id,
      children:     [],
    })),
  }
}
