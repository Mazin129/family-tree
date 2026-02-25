import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'ar' | 'en'

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'ar' ? 'en' : 'ar' }),
    }),
    {
      name: 'sudanese-heritage-locale',
    }
  )
)

/** Convenience hook: returns current locale + dir + t() translator */
export function useLanguage() {
  const { locale, setLocale, toggleLocale } = useLanguageStore()
  return {
    locale,
    isArabic: locale === 'ar',
    dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
    setLocale,
    toggleLocale,
  }
}
