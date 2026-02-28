import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma }      from '@/lib/db/prisma'
import { getTreeForVisualization } from '@/lib/db/neo4j'

// GET /api/family/trees/[treeId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id
  const { treeId } = await params

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

    // Build visualization from PostgreSQL relationships (primary source).
    // Neo4j is used as a supplement only if Postgres yields no relationships.
    let visualization = await buildFlatVisualization(treeId)

    // If Postgres has only one node with no relationships, try Neo4j as fallback
    if (visualization && !(visualization as any).children?.length) {
      const rootMember = await prisma.treeMember.findFirst({ where: { treeId } })
      if (rootMember) {
        try {
          const neo4jViz = await getTreeForVisualization(rootMember.id)
          if (neo4jViz && ((neo4jViz.children?.length ?? 0) > 0)) {
            visualization = neo4jViz
          }
        } catch {
          // Neo4j not available — keep Postgres result
        }
      }
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
  { params }: { params: Promise<{ treeId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId = (session.user as any).id
  const { treeId } = await params

  try {
    const tree = await prisma.familyTree.findFirst({
      where: { id: treeId, ownerId: userId },
    })
    if (!tree) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })

    await prisma.familyTree.delete({ where: { id: treeId } })
    return NextResponse.json({ success: true, message: 'تم حذف الشجرة' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// Build full visualization from PostgreSQL relationships.
// Finds the oldest ancestor (no parent in tree) as root, then builds downward.
async function buildFlatVisualization(treeId: string) {
  const members = await prisma.treeMember.findMany({
    where:   { treeId },
    orderBy: { createdAt: 'asc' },
  })
  if (!members.length) return null

  // Fetch all relationships between members of this tree
  const memberIds = members.map(m => m.id)
  const relationships = await prisma.memberRelationship.findMany({
    where: { fromMemberId: { in: memberIds } },
  })

  // Build lookup maps
  const memberById = new Map(members.map(m => [m.id, m]))

  // childMap: parentId → [childId, ...]   (PARENT_OF edges)
  const childMap   = new Map<string, string[]>()
  // spouseMap: personId → [spouseId, ...]  (SPOUSE_OF edges, bidirectional)
  const spouseMap  = new Map<string, string[]>()
  // siblingMap: personId → Set<siblingId>  (SIBLING_OF edges)
  const siblingMap = new Map<string, Set<string>>()

  for (const rel of relationships) {
    if (!memberIds.includes(rel.toMemberId)) continue  // skip cross-tree refs

    if (rel.type === 'PARENT_OF') {
      const kids = childMap.get(rel.fromMemberId) ?? []
      if (!kids.includes(rel.toMemberId)) kids.push(rel.toMemberId)
      childMap.set(rel.fromMemberId, kids)
    } else if (rel.type === 'SPOUSE_OF') {
      const a = spouseMap.get(rel.fromMemberId) ?? []
      if (!a.includes(rel.toMemberId)) a.push(rel.toMemberId)
      spouseMap.set(rel.fromMemberId, a)
      const b = spouseMap.get(rel.toMemberId) ?? []
      if (!b.includes(rel.fromMemberId)) b.push(rel.fromMemberId)
      spouseMap.set(rel.toMemberId, b)
    } else if (rel.type === 'SIBLING_OF' || rel.type === 'HALF_SIBLING_OF') {
      if (!siblingMap.has(rel.fromMemberId)) siblingMap.set(rel.fromMemberId, new Set())
      if (!siblingMap.has(rel.toMemberId))   siblingMap.set(rel.toMemberId, new Set())
      siblingMap.get(rel.fromMemberId)!.add(rel.toMemberId)
      siblingMap.get(rel.toMemberId)!.add(rel.fromMemberId)
    }
  }

  // Siblings with no parent: attach them under their sibling's parent
  for (const [personId, siblings] of siblingMap) {
    const alreadyHasParent = [...childMap.values()].some(kids => kids.includes(personId))
    if (alreadyHasParent) continue
    for (const sibId of siblings) {
      for (const [parentId, kids] of childMap) {
        if (kids.includes(sibId) && !kids.includes(personId)) {
          kids.push(personId)
          break
        }
      }
    }
  }

  // ── Co-parent normalization ────────────────────────────────────────────────
  // When two people are both PARENT_OF the same child (e.g. a mother added
  // after the father), pick ONE as the "primary" parent, merge all children
  // under them, clear the secondary's children, and link them as spouses.
  // This prevents the secondary becoming a separate root that hides the others.
  const processedPairs = new Set<string>()
  for (const [parentAId, childrenA] of Array.from(childMap.entries())) {
    for (const [parentBId, childrenB] of Array.from(childMap.entries())) {
      if (parentAId === parentBId) continue
      const pairKey = [parentAId, parentBId].sort().join('|')
      if (processedPairs.has(pairKey)) continue
      const sharedChildren = childrenA.filter(c => childrenB.includes(c))
      if (sharedChildren.length === 0) continue
      processedPairs.add(pairKey)

      const memberA = memberById.get(parentAId)
      const memberB = memberById.get(parentBId)

      // Primary = male > more-children > earlier in DB
      let primaryId   = parentAId
      let secondaryId = parentBId
      if (memberA?.gender === 'FEMALE' && memberB?.gender !== 'FEMALE') {
        primaryId = parentBId; secondaryId = parentAId
      } else if (childrenB.length > childrenA.length) {
        primaryId = parentBId; secondaryId = parentAId
      }

      // Merge all children under primary
      const primChildren = childMap.get(primaryId)   ?? []
      const secChildren  = childMap.get(secondaryId) ?? []
      childMap.set(primaryId, [...new Set([...primChildren, ...secChildren])])
      // Secondary loses all children that are now under primary
      const newSecChildren = secChildren.filter(c => !childMap.get(primaryId)!.includes(c))
      childMap.set(secondaryId, newSecChildren)

      // Add bidirectional virtual spouse link if not already recorded
      const pSpouses = spouseMap.get(primaryId) ?? []
      if (!pSpouses.includes(secondaryId)) { pSpouses.push(secondaryId); spouseMap.set(primaryId, pSpouses) }
      const sSpouses = spouseMap.get(secondaryId) ?? []
      if (!sSpouses.includes(primaryId)) { sSpouses.push(primaryId); spouseMap.set(secondaryId, sSpouses) }
    }
  }

  // IDs that appear as children (have a parent in this tree)
  const hasParentSet = new Set<string>()
  for (const kids of childMap.values()) {
    for (const kid of kids) hasParentSet.add(kid)
  }

  // Root candidates: members with no parent recorded
  const roots = members.filter(m => !hasParentSet.has(m.id))
  if (roots.length === 0) return null

  // Count nodes reachable from each root (self + descendants + spouses)
  function countSubtree(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0
    visited.add(id)
    let n = 1
    for (const cid of childMap.get(id) ?? []) n += countSubtree(cid, visited)
    for (const sid of spouseMap.get(id) ?? []) n += countSubtree(sid, visited)
    return n
  }
  // Pick the root with the largest subtree so adding an older ancestor (e.g. deceased father)
  // doesn't collapse the view to just 2 people
  let rootMember = roots[0]
  let maxCount = countSubtree(rootMember.id)
  for (let i = 1; i < roots.length; i++) {
    const count = countSubtree(roots[i].id)
    if (count > maxCount) {
      maxCount = count
      rootMember = roots[i]
    }
  }

  function toNode(id: string, visited = new Set<string>()): object | null {
    if (visited.has(id)) return null
    visited.add(id)
    const m = memberById.get(id)
    if (!m) return null

    const childIds  = childMap.get(id)  ?? []
    const spouseIds = spouseMap.get(id) ?? []

    return {
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
      children: childIds
        .map(cid => toNode(cid, new Set(visited)))
        .filter(Boolean),
      spouses: spouseIds
        .map(sid => toNode(sid, new Set(visited)))
        .filter(Boolean),
    }
  }

  return toNode(rootMember.id)
}
