import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const token = body.token as string | undefined
  const password = body.password as string | undefined

  if (!token || !password) {
    return NextResponse.json({ success: false, error: 'Missing token or password.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ success: false, error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ success: false, error: 'Reset link is invalid or has expired.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  })

  if (!user) {
    // Clean up token anyway
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return NextResponse.json({ success: true })
}

