import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'

// POST /api/invite/[token]  — accept an invite link
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول أولاً' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const { token } = await params

  const invite = await prisma.inviteToken.findUnique({ where: { token } })

  if (!invite) {
    return NextResponse.json({ success: false, error: 'رابط الدعوة غير صالح' }, { status: 404 })
  }
  if (invite.usedAt) {
    return NextResponse.json({ success: false, error: 'تم استخدام رابط الدعوة مسبقاً' }, { status: 409 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: 'انتهت صلاحية رابط الدعوة' }, { status: 410 })
  }

  // Don't let the owner join their own tree as collaborator
  const tree = await prisma.familyTree.findUnique({ where: { id: invite.treeId } })
  if (tree?.ownerId === userId) {
    return NextResponse.json({ success: false, error: 'أنت صاحب هذه الشجرة بالفعل' }, { status: 400 })
  }

  // Upsert collaboration
  const collab = await prisma.treeCollaboration.upsert({
    where:  { treeId_userId: { treeId: invite.treeId, userId } },
    update: { role: invite.role, acceptedAt: new Date() },
    create: { treeId: invite.treeId, userId, role: invite.role, acceptedAt: new Date() },
  })

  // Mark invite as used (single-use)
  await prisma.inviteToken.update({
    where: { token },
    data:  { usedAt: new Date(), usedById: userId },
  })

  // Notify the tree owner
  if (tree) {
    const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nameArabic: true } })
    await prisma.notification.create({
      data: {
        userId:  tree.ownerId,
        type:    'COLLABORATION_INVITE',
        title:   'انضم شخص جديد إلى شجرتك',
        message: `${joiner?.nameArabic || joiner?.name || 'مستخدم'} قبل دعوة التعاون في شجرة "${tree.nameArabic || tree.name}"`,
        link:    `/tree/${invite.treeId}`,
      },
    })
  }

  return NextResponse.json({ success: true, data: { treeId: invite.treeId, role: collab.role } })
}
