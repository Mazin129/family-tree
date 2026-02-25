'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TreePine, Users, Globe, LayoutDashboard,
  Settings, Shield, LogOut, Sparkles,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils/cn'
import { useLanguage } from '@/lib/i18n/store'
import { createT } from '@/lib/i18n/translations'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import type { User } from '@/types'

interface SidebarProps {
  user: Partial<User>
}

export function Sidebar({ user }: SidebarProps) {
  const pathname      = usePathname()
  const { locale, dir } = useLanguage()
  const t             = createT(locale)

  const NAV_ITEMS = [
    {
      label: t('nav_dashboard'),
      href:  '/dashboard',
      icon:  LayoutDashboard,
    },
    {
      label:    t('nav_tree'),
      href:     '/tree',
      icon:     TreePine,
      children: [
        { label: t('nav_my_trees'), href: '/tree'     },
        { label: t('nav_new_tree'), href: '/tree/new' },
      ],
    },
    {
      label: t('nav_community_menu'),
      href:  '/community',
      icon:  Users,
    },
    {
      label:    t('nav_cultural'),
      href:     '/community/heritage',
      icon:     Globe,
      children: [
        { label: t('nav_heritage_items'), href: '/community/heritage'     },
        { label: t('nav_oral_history'),   href: '/community/oral-history' },
      ],
    },
    {
      label: t('nav_ai'),
      href:  '/ai-insights',
      icon:  Sparkles,
      badge: t('nav_ai_badge'),
    },
  ]

  const BOTTOM_ITEMS = [
    { label: t('nav_settings'), href: '/settings', icon: Settings },
    { label: t('nav_privacy'),  href: '/privacy',  icon: Shield   },
  ]

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white border-sand-200 h-screen sticky top-0 overflow-y-auto"
      style={{ borderInlineEndWidth: '1px', borderInlineEndStyle: 'solid' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sand-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-heritage rounded-xl flex items-center justify-center shadow-heritage">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-khartoum-900 text-sm leading-tight">{t('brand_name')}</div>
            <div className="text-xs text-khartoum-400 leading-tight">{t('brand_subtitle')}</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-sand-100 space-y-1">
        {BOTTOM_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('nav-link', pathname === item.href && 'nav-link-active')}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          style={{ textAlign: 'inherit' }}
        >
          <LogOut className="w-4 h-4" />
          {t('nav_logout')}
        </button>
      </div>

      {/* Language switcher */}
      <div className="px-4 pb-3">
        <LanguageSwitcher className="w-full justify-center" />
      </div>

      {/* Version */}
      <div className="px-4 pb-2 text-center">
        <span className="text-xs text-khartoum-300">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      </div>

      {/* User card */}
      <div className="p-4 border-t border-sand-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sand-50">
          <div className="w-9 h-9 rounded-full bg-gradient-heritage flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {(user.name || user.nameArabic || t('default_user')).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-khartoum-900 truncate">
              {locale === 'ar'
                ? (user.nameArabic || user.name || t('default_user'))
                : (user.name || user.nameArabic || t('default_user'))}
            </div>
            <div className="text-xs text-khartoum-400 truncate">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  item,
  pathname,
}: {
  item: { label: string; href: string; icon: React.ElementType; badge?: string; children?: { label: string; href: string }[] }
  pathname: string
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <div>
      <Link
        href={item.href}
        className={cn('nav-link', isActive && 'nav-link-active')}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="badge-sand text-xs">{item.badge}</span>
        )}
      </Link>
      {item.children && isActive && (
        <div className="ms-6 mt-1 space-y-1 border-s-2 border-sand-200 ps-3">
          {item.children.map(child => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'block text-sm py-1.5 px-2 rounded-lg transition-colors',
                pathname === child.href
                  ? 'text-sand-700 font-medium'
                  : 'text-khartoum-500 hover:text-khartoum-800'
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
