'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TreePine, Users, BookOpen, Globe, LayoutDashboard,
  Settings, Shield, LogOut, ChevronLeft, Sparkles,
  Mic, Image as ImageIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils/cn'
import type { User } from '@/types'

const NAV_ITEMS = [
  {
    label: 'لوحة التحكم',
    href:  '/dashboard',
    icon:  LayoutDashboard,
  },
  {
    label:    'شجرة العائلة',
    href:     '/tree',
    icon:     TreePine,
    children: [
      { label: 'شجراتي',        href: '/tree' },
      { label: 'شجرة جديدة',    href: '/tree/new' },
    ],
  },
  {
    label: 'المجتمع',
    href:  '/community',
    icon:  Users,
  },
  {
    label:    'التراث الثقافي',
    href:     '/community/heritage',
    icon:     Globe,
    children: [
      { label: 'مقتنيات التراث', href: '/community/heritage' },
      { label: 'التاريخ الشفهي', href: '/community/oral-history' },
    ],
  },
  {
    label: 'ذكاء اصطناعي',
    href:  '/ai-insights',
    icon:  Sparkles,
    badge: 'جديد',
  },
]

const BOTTOM_ITEMS = [
  { label: 'الإعدادات',  href: '/settings', icon: Settings  },
  { label: 'الخصوصية',   href: '/privacy',  icon: Shield    },
]

interface SidebarProps {
  user: Partial<User>
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white border-l border-sand-200 h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-sand-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-heritage rounded-xl flex items-center justify-center shadow-heritage">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-khartoum-900 text-sm leading-tight">التراث السوداني</div>
            <div className="text-xs text-khartoum-400 leading-tight">Sudanese Heritage</div>
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
          className="nav-link w-full text-right text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>

      {/* User card */}
      <div className="p-4 border-t border-sand-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sand-50">
          <div className="w-9 h-9 rounded-full bg-gradient-heritage flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {(user.name || user.nameArabic || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-khartoum-900 truncate">
              {user.nameArabic || user.name || 'مستخدم'}
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
  item: (typeof NAV_ITEMS)[0]
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
        <div className="mr-6 mt-1 space-y-1 border-r-2 border-sand-200 pr-3">
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
