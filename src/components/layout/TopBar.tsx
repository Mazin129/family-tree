'use client'

import { Bell, Search, Menu } from 'lucide-react'
import type { User } from '@/types'
import Link from 'next/link'

interface TopBarProps {
  user: Partial<User>
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-sand-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      {/* Mobile menu button */}
      <button className="lg:hidden p-2 rounded-lg hover:bg-sand-50">
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-khartoum-400" />
          <input
            type="search"
            placeholder="ابحث عن شخص، قبيلة، أو تراث..."
            className="input pr-10 text-sm py-2 bg-sand-50 border-sand-200"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-sand-50 transition-colors">
          <Bell className="w-5 h-5 text-khartoum-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Link>

        <Link href="/profile" className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-heritage flex items-center justify-center text-white text-sm font-semibold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  )
}
