import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'

// GET /api/family/trees/[treeId]/collaborators
// Returns list of active collaborators + all invite tokens for this tree (owner only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId  = (session.user as any).id
  const { treeId } = await params

  const tree = await prisma.familyTree.findFirst({
    where: { id: treeId, ownerId: userId },
  })
  if (!tree) return NextResponse.json({ success: false, error: 'غير موجود أو ليس لديك صلاحية' }, { status: 403 })

  const [collaborators, invites] = await Promise.all([
    prisma.treeCollaboration.findMany({
      where: { treeId },
      include: { user: { select: { id: true, name: true, nameArabic: true, email: true, image: true } } },
      orderBy: { invitedAt: 'asc' },
    }),
    prisma.inviteToken.findMany({
      where: { treeId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ success: true, data: { collaborators, invites } })
}

// POST /api/family/trees/[treeId]/collaborators
// Generates a new invite link (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  const userId  = (session.user as any).id
  const { treeId } = await params

  const tree = await prisma.familyTree.findFirst({
    where: { id: treeId, ownerId: userId },
  })
  if (!tree) return NextResponse.json({ success: false, error: 'غير موجود أو ليس لديك صلاحية' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const role = ['VIEWER', 'EDITOR', 'ADMIN'].includes(body.role) ? body.role : 'EDITOR'
  const daysValid = Math.min(90, Math.max(1, Number(body.daysValid) || 7))

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + Number(daysValid))

  // Use a cryptographically-strong random token instead of relying on the DB default.
  const token = crypto.randomBytes(32).toString('hex')

  const invite = await prisma.inviteToken.create({
    data: {
      treeId,
      createdById: userId,
      role,
      expiresAt,
      token,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  return NextResponse.json({ success: true, data: { invite, inviteUrl } })
}
