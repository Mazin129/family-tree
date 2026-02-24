import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }       from 'next-auth'
import { authOptions }            from '@/lib/auth/auth-options'
import { generateFamilyNarrative, analyzeLineagePatterns } from '@/lib/ai/client'
import { prisma }                 from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'غير مصرّح' }, { status: 401 })

  try {
    const { treeId, language = 'ar' } = await req.json()

    // Get all members for context
    const members = await prisma.treeMember.findMany({
      where: { treeId },
      select: {
        id: true, fullName: true, fullNameArabic: true,
        birthYear: true, deathYear: true, tribe: true,
        birthRegion: true, gender: true, isAlive: true,
      },
    })

    const [narrative, patterns] = await Promise.all([
      generateFamilyNarrative(treeId, language),
      analyzeLineagePatterns(treeId, members as any),
    ])

    // Store insight
    await prisma.aIInsight.create({
      data: {
        treeId,
        insightType: 'LINEAGE_PATTERN',
        confidence:  0.75,
        data:        { narrative: narrative.narrative, patterns: patterns.patterns } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        narrative:    narrative.narrative,
        highlights:   narrative.highlights,
        patterns:     patterns.patterns,
        migration:    patterns.migrationRoute,
        distribution: patterns.tribeDistribution,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'خطأ في التحليل' }, { status: 500 })
  }
}
