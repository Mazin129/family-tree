import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/auth-options'

const nextAuthHandler = NextAuth(authOptions)

async function wrappedHandler(req: Request, context: unknown) {
  try {
    const res = await nextAuthHandler(req, context as any)
    return res
  } catch (err) {
    console.error('[NextAuth] Unhandled error:', err)
    const url = new URL(req.url)
    const base = `${url.origin}/api/auth`
    return NextResponse.redirect(`${base}/signin?error=Configuration&callbackUrl=${encodeURIComponent(url.origin + '/dashboard')}`)
  }
}

export const GET = wrappedHandler
export const POST = wrappedHandler
