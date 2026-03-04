import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const email = (body.email as string | undefined)?.toLowerCase().trim()

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always respond with success to avoid leaking which emails exist
  if (!user) {
    return NextResponse.json({ success: true })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  })

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://sudandna.com'

  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Basic SMTP mailer using existing env settings
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const from = process.env.SMTP_FROM || 'noreply@sudandna.com'

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your password – Sudanese Heritage Platform',
      text: `You requested to reset your password.\n\nOpen this link:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في منصة التراث السوداني.</p>
        <p>
          اضغط على الرابط التالي لإعادة تعيين كلمة المرور (صالح لمدة ساعة واحدة):
        </p>
        <p>
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
            إعادة تعيين كلمة المرور
          </a>
        </p>
        <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
      `,
    })
  } catch (err) {
    console.error('[forgot-password] email error', err)
    // Still return success so UI does not reveal state
  }

  return NextResponse.json({ success: true })
}

