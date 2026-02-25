import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Locale = 'ar' | 'en'

interface LanguageState {
  locale: Locale
  _hasHydrated: boolean
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  setHasHydrated: (v: boolean) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      _hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'ar' ? 'en' : 'ar' }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'sudanese-heritage-locale',
      storage: createJSONStorage(() => localStorage),
      // Only persist locale, not the internal hydration flag
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      // Prevent SSR/client hydration mismatch: rehydrate manually after mount
      skipHydration: true,
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
