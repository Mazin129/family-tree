import { NextResponse } from 'next/server'

// GET /api/auth/google-status  — public, tells the UI whether Google OAuth is active
// Checks process.env at request time (not import time) so no rebuild needed after .env changes
export function GET() {
  const id  = process.env.GOOGLE_CLIENT_ID     || ''
  const sec = process.env.GOOGLE_CLIENT_SECRET || ''
  const enabled =
    id.length > 0  && !id.startsWith('your-google') &&
    sec.length > 0 && !sec.startsWith('your-google')

  return NextResponse.json({
    enabled,
    redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`,
  })
}
