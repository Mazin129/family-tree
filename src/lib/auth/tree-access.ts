/**
 * Tree access control — centralizes authorization for family trees.
 * Use to prevent IDOR: always verify user can access the tree/member before returning data.
 */

import { prisma } from '@/lib/db/prisma'

export type TreeAccess = {
  canView: boolean
  canEdit: boolean
  tree: { id: string; ownerId: string } | null
}

/**
 * Check if the user can view and/or edit the tree (owner, collaborator, or public).
 */
export async function getTreeAccess(
  userId: string,
  treeId: string
): Promise<TreeAccess> {
  const tree = await prisma.familyTree.findFirst({
    where: { id: treeId },
    select: { id: true, ownerId: true, isPublic: true },
  })
  if (!tree) {
    return { canView: false, canEdit: false, tree: null }
  }

  if (tree.ownerId === userId) {
    return { canView: true, canEdit: true, tree }
  }

  const collab = await prisma.treeCollaboration.findFirst({
    where: { treeId, userId, acceptedAt: { not: null } },
    select: { role: true },
  })
  if (collab) {
    const canEdit = collab.role === 'EDITOR' || collab.role === 'ADMIN'
    return { canView: true, canEdit, tree }
  }

  if (tree.isPublic) {
    return { canView: true, canEdit: false, tree }
  }

  return { canView: false, canEdit: false, tree }
}

/**
 * Check if the user can access the tree that contains this member.
 */
export async function getMemberTreeAccess(
  userId: string,
  memberId: string
): Promise<TreeAccess & { member: { id: string; treeId: string } | null }> {
  const member = await prisma.treeMember.findUnique({
    where: { id: memberId },
    select: { id: true, treeId: true },
  })
  if (!member) {
    return { canView: false, canEdit: false, tree: null, member: null }
  }

  const access = await getTreeAccess(userId, member.treeId)
  return { ...access, member }
}
