'use client'

import { useLanguage } from '@/lib/i18n/store'
import { cn } from '@/lib/utils/cn'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'default' | 'light'
}

export function LanguageSwitcher({ className, variant = 'default' }: LanguageSwitcherProps) {
  const { locale, toggleLocale } = useLanguage()

  const isArabic = locale === 'ar'

  return (
    <button
      onClick={toggleLocale}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
        variant === 'light'
          ? 'text-white/80 hover:text-white hover:bg-white/10 border border-white/20'
          : 'text-khartoum-600 hover:text-khartoum-900 hover:bg-sand-50 border border-sand-200',
        className
      )}
    >
      {/* Globe icon inline */}
      <svg
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className={isArabic ? 'font-sans' : 'font-arabic'}>
        {isArabic ? 'English' : 'العربية'}
      </span>
    </button>
  )
}
