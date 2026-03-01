'use client'

import { Bell, Search, Menu } from 'lucide-react'
import type { User } from '@/types'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/store'
import { createT } from '@/lib/i18n/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface TopBarProps {
  user: Partial<User>
}

export function TopBar({ user }: TopBarProps) {
  const { locale } = useLanguage()
  const t = createT(locale)

  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-nubian-200/60 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-sm">
      {/* Mobile menu button */}
      <button className="lg:hidden p-2 rounded-lg hover:bg-desert-50 text-nubian-700">
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-nubian-400"
            style={{ insetInlineEnd: '0.75rem' }}
          />
          <input
            type="search"
            placeholder={t('search_placeholder')}
            className="input text-sm py-2 bg-desert-50/80 border-nubian-200 focus:ring-nubian-300"
            style={{ paddingInlineEnd: '2.5rem' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>

        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-desert-50 transition-colors text-nubian-600">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-coral-500 rounded-full" />
        </Link>

        <Link href="/profile" className="flex items-center gap-2 ps-2">
          <div className="w-8 h-8 rounded-full bg-gradient-heritage flex items-center justify-center text-white text-sm font-semibold shadow-sm">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  )
}
