import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }   from 'next-auth'
import { authOptions }        from '@/lib/auth/auth-options'
import { suggestMissingLinks } from '@/lib/ai/client'
import { prisma }             from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  try {
    const { treeId, members } = await req.json()

    const suggestions: any[] = []

    // For each member without parents, try to find suggestions
    for (const member of members.slice(0, 5)) {  // Limit to first 5 for performance
      const hasParent = members.some((m: any) =>
        m.id !== member.id && m.birthYear && member.birthYear
        && m.birthYear < member.birthYear - 15
        && m.tribe === member.tribe
      )

      if (!hasParent && member.tribe) {
        const linksRes = await suggestMissingLinks(member, members)
        suggestions.push(...linksRes)
      }
    }

    // Also store AI insights
    if (suggestions.length > 0) {
      await prisma.aIInsight.createMany({
        data: suggestions.slice(0, 10).map(s => ({
          treeId,
          insightType: 'MISSING_LINK_SUGGESTION',
          confidence:  s.confidence || 0.5,
          data:        s as any,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ success: true, data: suggestions })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في الاقتراحات' }, { status: 500 })
  }
}
