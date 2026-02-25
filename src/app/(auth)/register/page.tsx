'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TreePine, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/store'
import { createT, type TranslationKey } from '@/lib/i18n/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export default function RegisterPage() {
  const router = useRouter()
  const [showPass, setShowPass]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { locale, dir } = useLanguage()
  const t = createT(locale)

  const registerSchema = z.object({
    name:            z.string().min(2, t('register_name_short')),
    nameArabic:      z.string().min(2, t('register_arabic_name_short')).optional().or(z.literal('')),
    email:           z.string().email(t('register_email_invalid')),
    password:        z.string().min(8, t('register_password_min')),
    confirmPassword: z.string(),
    consentGiven:    z.boolean().refine(v => v, t('register_consent_required')),
  }).refine(d => d.password === d.confirmPassword, {
    message: t('register_passwords_mismatch'),
    path:    ['confirmPassword'],
  })

  type RegisterForm = z.infer<typeof registerSchema>

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { consentGiven: false },
  })

  const password        = watch('password', '')
  const passwordStrength = getPasswordStrength(password, t)

  async function onSubmit(data: RegisterForm) {
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:         data.name,
          nameArabic:   data.nameArabic || undefined,
          email:        data.email,
          password:     data.password,
          consentGiven: data.consentGiven,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || t('register_error'))
        return
      }

      const signInRes = await signIn('credentials', {
        email:    data.email,
        password: data.password,
        redirect: false,
      })

      if (signInRes?.ok) {
        toast.success(t('register_success'))
        router.push('/dashboard')
      } else {
        toast.success(t('register_success_redirect'))
        router.push('/login')
      }
    } catch {
      toast.error(t('register_unexpected_error'))
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-sand-900 via-sand-800 to-khartoum-900 flex items-center justify-center p-4 py-10"
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
          <h1 className="text-2xl font-bold text-white">{t('register_title')}</h1>
          <p className="text-sand-300 text-sm mt-1">{t('register_subtitle')}</p>
        </div>

        <div className="card p-8">
          {/* Google OAuth */}
          <button
            onClick={() => { setGoogleLoading(true); signIn('google', { callbackUrl: '/dashboard' }) }}
            disabled={googleLoading || isSubmitting}
            className="btn-secondary w-full mb-6 py-3"
          >
            {googleLoading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            }
            <span>{t('register_google')}</span>
          </button>

          <div className="divider-heritage"><span>{t('or')}</span></div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">{t('register_name')}</label>
              <div className="relative">
                <User
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400"
                  style={{ insetInlineEnd: '0.75rem' }}
                />
                <input
                  {...register('name')}
                  placeholder="Ahmed Ibrahim"
                  className="input text-left"
                  dir="ltr"
                  style={{ paddingInlineEnd: '2.5rem' }}
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Arabic Name */}
            <div>
              <label className="label">{t('register_name_arabic')}</label>
              <input
                {...register('nameArabic')}
                placeholder="أحمد إبراهيم"
                className="input text-right"
                dir="rtl"
              />
              {errors.nameArabic && <p className="text-red-500 text-xs mt-1">{errors.nameArabic.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">{t('register_email')}</label>
              <div className="relative">
                <Mail
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400"
                  style={{ insetInlineEnd: '0.75rem' }}
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="email@example.com"
                  className="input text-left"
                  dir="ltr"
                  style={{ paddingInlineEnd: '2.5rem' }}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">{t('register_password')}</label>
              <div className="relative">
                <Lock
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400"
                  style={{ insetInlineEnd: '0.75rem' }}
                />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('register_password_placeholder')}
                  className="input"
                  dir="ltr"
                  style={{ paddingInlineEnd: '2.5rem', paddingInlineStart: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 -translate-y-1/2 text-khartoum-400"
                  style={{ insetInlineStart: '0.75rem' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score
                          ? passwordStrength.score <= 1 ? 'bg-red-400'
                          : passwordStrength.score <= 2 ? 'bg-yellow-400'
                          : passwordStrength.score <= 3 ? 'bg-blue-400'
                          : 'bg-green-400'
                          : 'bg-khartoum-200'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs mt-1 text-khartoum-500">{passwordStrength.label}</p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">{t('register_confirm_password')}</label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder={t('register_confirm_placeholder')}
                className="input"
                dir="ltr"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 pt-2">
              <input
                {...register('consentGiven')}
                type="checkbox"
                id="consent"
                className="mt-0.5 h-4 w-4 rounded border-khartoum-300 text-sand-500 focus:ring-sand-400"
              />
              <label htmlFor="consent" className="text-sm text-khartoum-600 cursor-pointer leading-relaxed">
                {t('register_consent')}{' '}
                <Link href="/terms"   className="text-sand-600 hover:underline">{t('register_terms')}</Link>
                {' '}{t('register_and')}{' '}
                <Link href="/privacy" className="text-sand-600 hover:underline">{t('register_privacy')}</Link>
                {t('register_consent_suffix')}
              </label>
            </div>
            {errors.consentGiven && <p className="text-red-500 text-xs">{errors.consentGiven.message}</p>}

            <button type="submit" disabled={isSubmitting || googleLoading} className="btn-primary w-full py-3 mt-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {t('register_submit')}
            </button>
          </form>

          <p className="text-center text-khartoum-500 text-sm mt-6">
            {t('register_has_account')}{' '}
            <Link href="/login" className="text-sand-600 hover:text-sand-700 font-medium">
              {t('register_login_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function getPasswordStrength(password: string, t: (k: TranslationKey) => string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8)           score++
  if (/[A-Z]/.test(password))        score++
  if (/[0-9]/.test(password))        score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const labels = ['', t('pw_weak'), t('pw_fair'), t('pw_good'), t('pw_strong')]
  return { score, label: labels[score] }
}
