'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/lib/i18n/store'

/**
 * Rehydrates the Zustand persist store after mount (skipHydration=true prevents
 * SSR/client mismatch), then syncs locale to the <html> element's lang + dir.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLanguageStore(s => s.locale)

  useEffect(() => {
    // Trigger localStorage rehydration now that we're on the client
    useLanguageStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', locale)
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
  }, [locale])

  return <>{children}</>
}
