import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const registerSchema = z.object({
  name:             z.string().min(2, 'الاسم قصير جداً').max(100),
  nameArabic:       z.string().min(2).max(100).optional(),
  email:            z.string().email('البريد الإلكتروني غير صحيح'),
  password:         z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  preferredLanguage: z.enum(['ARABIC', 'ENGLISH']).default('ARABIC'),
  consentGiven:     z.boolean().refine(v => v === true, 'يجب الموافقة على الشروط'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name:              data.name,
        nameArabic:        data.nameArabic,
        email:             data.email,
        password:          hashedPassword,
        preferredLanguage: data.preferredLanguage,
        profile: {
          create: { isPublic: true },
        },
        privacySettings: {
          create: {
            consentGiven: data.consentGiven,
            consentDate:  new Date(),
          },
        },
      },
      select: { id: true, email: true, name: true },
    })

    // Welcome notification
    await prisma.notification.create({
      data: {
        userId:  user.id,
        type:    'WELCOME',
        title:   'مرحباً بك في منصة التراث السوداني',
        message: 'ابدأ ببناء شجرتك العائلية أو استكشاف المجتمع.',
        link:    '/dashboard',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId:    user.id,
        action:    'REGISTER',
        resource:  'auth',
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data:    { userId: user.id },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message, details: error.errors },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء الحساب' },
      { status: 500 }
    )
  }
}
