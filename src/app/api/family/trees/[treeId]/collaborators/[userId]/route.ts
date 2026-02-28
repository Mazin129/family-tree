import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'

type Params = { params: Promise<{ treeId: string; userId: string }> }

// PATCH /api/family/trees/[treeId]/collaborators/[userId]
// Change a collaborator's role (owner only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const ownerId = (session.user as any).id
  const { treeId, userId } = await params
  const { role } = await req.json()

  const tree = await prisma.familyTree.findFirst({ where: { id: treeId, ownerId } })
  if (!tree) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 403 })

  const collab = await prisma.treeCollaboration.update({
    where: { treeId_userId: { treeId, userId } },
    data:  { role },
    include: { user: { select: { id: true, name: true, nameArabic: true, email: true, image: true } } },
  })

  return NextResponse.json({ success: true, data: collab })
}

// DELETE /api/family/trees/[treeId]/collaborators/[userId]
// Remove a collaborator (owner, or the collaborator themselves)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const actorId = (session.user as any).id
  const { treeId, userId } = await params

  // Allow owner OR the collaborator themselves to remove
  const tree = await prisma.familyTree.findFirst({ where: { id: treeId } })
  if (!tree) return NextResponse.json({ success: false, error: 'غير موجود' }, { status: 404 })

  if (actorId !== tree.ownerId && actorId !== userId) {
    return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 403 })
  }

  await prisma.treeCollaboration.delete({
    where: { treeId_userId: { treeId, userId } },
  })

  return NextResponse.json({ success: true })
}
