import { NextResponse } from 'next/server'
import { GOOGLE_OAUTH_ENABLED } from '@/lib/auth/auth-options'

// GET /api/auth/google-status  — public, tells the UI whether Google OAuth is active
export function GET() {
  return NextResponse.json({
    enabled:     GOOGLE_OAUTH_ENABLED,
    redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`,
  })
}
