import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }   from '@/lib/auth/auth-options'
import { detectDuplicates } from '@/lib/ai/client'
import { prisma }        from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  try {
    const { treeId, members } = await req.json()

    const duplicates = await detectDuplicates(members)

    // Persist alerts to DB
    if (duplicates.length > 0) {
      await prisma.duplicateAlert.createMany({
        data: duplicates.map(d => ({
          treeId,
          memberId1:       d.member1Id,
          memberId2:       d.member2Id,
          similarityScore: d.score,
        })),
        skipDuplicates: true,
      })
    }

    // Fetch with member names
    const alerts = await prisma.duplicateAlert.findMany({
      where: { treeId, isResolved: false },
      orderBy: { similarityScore: 'desc' },
    })

    // Enrich with member data
    const enriched = await Promise.all(
      alerts.map(async (alert) => {
        const [m1, m2] = await Promise.all([
          prisma.treeMember.findUnique({ where: { id: alert.memberId1 }, select: { id: true, fullName: true, fullNameArabic: true, birthYear: true } }),
          prisma.treeMember.findUnique({ where: { id: alert.memberId2 }, select: { id: true, fullName: true, fullNameArabic: true, birthYear: true } }),
        ])
        return { ...alert, member1: m1, member2: m2 }
      })
    )

    return NextResponse.json({ success: true, data: enriched })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في التحليل' }, { status: 500 })
  }
}
