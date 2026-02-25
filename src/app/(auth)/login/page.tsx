'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TreePine, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/store'
import { createT } from '@/lib/i18n/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/dashboard'
  const [showPass, setShowPass]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { locale, dir } = useLanguage()
  const t = createT(locale)

  const loginSchema = z.object({
    email:    z.string().email(t('login_email_invalid')),
    password: z.string().min(1, t('login_password_required')),
  })
  type LoginFormData = z.infer<typeof loginSchema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    const res = await signIn('credentials', {
      email:    data.email,
      password: data.password,
      redirect: false,
    })

    if (res?.error) {
      toast.error(t('login_error'))
    } else {
      toast.success(t('login_success'))
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-sand-900 via-sand-800 to-khartoum-900 flex items-center justify-center p-4"
      dir={dir}
    >
      <div className="absolute inset-0 pattern-overlay opacity-20" />

      {/* Language switcher — top corner */}
      <div className="absolute top-4 end-4">
        <LanguageSwitcher variant="light" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-heritage rounded-2xl shadow-heritage mb-4">
            <TreePine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('login_title')}</h1>
          <p className="text-sand-300 text-sm mt-1">{t('login_subtitle')}</p>
        </div>

        <div className="card p-8">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || isSubmitting}
            className="btn-secondary w-full mb-6 py-3"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{t('login_google')}</span>
          </button>

          <div className="divider-heritage"><span>{t('or')}</span></div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">{t('login_email')}</label>
              <div className="relative">
                <Mail
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400"
                  style={{ insetInlineEnd: '0.75rem' }}
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@email.com"
                  className="input text-left"
                  dir="ltr"
                  style={{ paddingInlineEnd: '2.5rem' }}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">{t('login_password')}</label>
                <Link href="/forgot-password" className="text-xs text-sand-600 hover:text-sand-700">
                  {t('login_forgot')}
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400"
                  style={{ insetInlineEnd: '0.75rem' }}
                />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input"
                  dir="ltr"
                  style={{ paddingInlineEnd: '2.5rem', paddingInlineStart: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 -translate-y-1/2 text-khartoum-400 hover:text-khartoum-600"
                  style={{ insetInlineStart: '0.75rem' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || googleLoading}
              className="btn-primary w-full py-3"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t('login_submit')}
            </button>
          </form>

          <p className="text-center text-khartoum-500 text-sm mt-6">
            {t('login_no_account')}{' '}
            <Link href="/register" className="text-sand-600 hover:text-sand-700 font-medium">
              {t('login_signup_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
