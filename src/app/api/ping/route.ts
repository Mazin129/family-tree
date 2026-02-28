/**
 * Lightweight liveness check — no DB, no auth.
 * Use to verify the Next.js app is reachable (e.g. from nginx).
 * If this returns 200 but /api/health returns 503, the database is likely down.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, service: 'web' })
}
