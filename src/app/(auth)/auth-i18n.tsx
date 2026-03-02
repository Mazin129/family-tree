'use client'

import { useState, useCallback } from 'react'

export type Locale = 'ar' | 'en'

const authTranslations: Record<Locale, Record<string, string>> = {
  ar: {
    or: 'أو',
    login_title: 'مرحباً بعودتك',
    login_subtitle: 'سجّل دخولك لمتابعة رحلتك',
    login_google: 'المتابعة مع Google',
    login_email: 'البريد الإلكتروني',
    login_password: 'كلمة المرور',
    login_forgot: 'نسيت كلمة المرور؟',
    login_submit: 'تسجيل الدخول',
    login_no_account: 'ليس لديك حساب؟',
    login_signup_link: 'سجّل الآن مجاناً',
    login_error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    login_success: 'مرحباً بك!',
    login_email_invalid: 'البريد الإلكتروني غير صحيح',
    login_password_required: 'كلمة المرور مطلوبة',
    register_title: 'انضم إلى مجتمعنا',
    register_subtitle: 'ابدأ رحلتك في اكتشاف تراثك السوداني',
    register_google: 'التسجيل مع Google',
    register_name: 'الاسم الكامل (بالإنجليزية)',
    register_name_arabic: 'الاسم بالعربية (اختياري)',
    register_email: 'البريد الإلكتروني',
    register_password: 'كلمة المرور',
    register_confirm_password: 'تأكيد كلمة المرور',
    register_consent: 'أوافق على',
    register_terms: 'شروط الاستخدام',
    register_and: 'و',
    register_privacy: 'سياسة الخصوصية',
    register_consent_suffix: '، وأفهم كيفية استخدام بياناتي.',
    register_submit: 'إنشاء الحساب',
    register_has_account: 'لديك حساب بالفعل؟',
    register_login_link: 'سجّل دخولك',
    register_success: 'تم إنشاء حسابك بنجاح! مرحباً بك 🎉',
    register_success_redirect: 'تم إنشاء الحساب. يرجى تسجيل الدخول.',
    register_error: 'حدث خطأ أثناء إنشاء الحساب',
    register_unexpected_error: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.',
    register_name_short: 'الاسم قصير جداً — يجب أن يكون حرفين على الأقل',
    register_arabic_name_short: 'الاسم بالعربية قصير جداً',
    register_email_invalid: 'البريد الإلكتروني غير صحيح',
    register_password_min: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    register_passwords_mismatch: 'كلمتا المرور غير متطابقتين',
    register_consent_required: 'يجب الموافقة على الشروط والسياسات',
    register_password_placeholder: '8 أحرف على الأقل',
    register_confirm_placeholder: 'أعد إدخال كلمة المرور',
  },
  en: {
    or: 'or',
    login_title: 'Welcome Back',
    login_subtitle: 'Sign in to continue your journey',
    login_google: 'Continue with Google',
    login_email: 'Email Address',
    login_password: 'Password',
    login_forgot: 'Forgot password?',
    login_submit: 'Sign In',
    login_no_account: "Don't have an account?",
    login_signup_link: 'Register for free',
    login_error: 'Invalid email or password',
    login_success: 'Welcome back!',
    login_email_invalid: 'Invalid email address',
    login_password_required: 'Password is required',
    register_title: 'Join Our Community',
    register_subtitle: 'Start your journey to discover your Sudanese heritage',
    register_google: 'Sign up with Google',
    register_name: 'Full Name (in English)',
    register_name_arabic: 'Name in Arabic (optional)',
    register_email: 'Email Address',
    register_password: 'Password',
    register_confirm_password: 'Confirm Password',
    register_consent: 'I agree to the',
    register_terms: 'Terms of Service',
    register_and: 'and',
    register_privacy: 'Privacy Policy',
    register_consent_suffix: ', and understand how my data is used.',
    register_submit: 'Create Account',
    register_has_account: 'Already have an account?',
    register_login_link: 'Sign in',
    register_success: 'Account created successfully! Welcome 🎉',
    register_success_redirect: 'Account created. Please sign in.',
    register_error: 'An error occurred while creating the account',
    register_unexpected_error: 'An unexpected error occurred. Please try again later.',
    register_name_short: 'Name is too short — at least 2 characters required',
    register_arabic_name_short: 'Arabic name is too short',
    register_email_invalid: 'Invalid email address',
    register_password_min: 'Password must be at least 8 characters',
    register_passwords_mismatch: 'Passwords do not match',
    register_consent_required: 'You must agree to the terms and policies',
    register_password_placeholder: 'At least 8 characters',
    register_confirm_placeholder: 'Re-enter your password',
  },
}

export function useLanguage() {
  const [locale, setLocaleState] = useState<Locale>('ar')
  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])
  const toggleLocale = useCallback(() => setLocaleState((prev) => (prev === 'ar' ? 'en' : 'ar')), [])
  return {
    locale,
    isArabic: locale === 'ar',
    dir: (locale === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    setLocale,
    toggleLocale,
  }
}

export function createT(locale: Locale) {
  const t = authTranslations[locale] ?? authTranslations.ar
  return (key: string) => t[key] ?? key
}

interface LanguageSwitcherProps {
  className?: string
  variant?: 'default' | 'light'
}

export function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { locale, toggleLocale } = useLanguage()
  const isArabic = locale === 'ar'
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      className={
        (variant === 'light'
          ? 'text-white/80 hover:text-white hover:bg-white/10 border border-white/20 '
          : 'text-khartoum-600 hover:text-khartoum-900 hover:bg-sand-50 border border-sand-200 ') +
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ' +
        (className ?? '')
      }
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span>{isArabic ? 'English' : 'العربية'}</span>
    </button>
  )
}
