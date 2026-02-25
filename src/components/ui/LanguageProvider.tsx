'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/lib/i18n/store'

/**
 * Syncs the Zustand language store to the <html> element's lang and dir attributes.
 * Must be rendered inside Providers (client boundary).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLanguageStore(s => s.locale)

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', locale)
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
  }, [locale])

  return <>{children}</>
}
