import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    // Quick DB ping
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status:    'healthy',
      timestamp: new Date().toISOString(),
      service:   'sudanese-heritage-web',
      version:   '1.0.0',
    })
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
