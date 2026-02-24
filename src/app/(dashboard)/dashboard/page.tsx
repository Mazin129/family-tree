import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import {
  TreePine, Users, BookOpen, Sparkles, Plus,
  ArrowLeft, TrendingUp, Globe, Bell,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id

  // Fetch user stats
  const [treeCount, postCount, notifications] = await Promise.all([
    prisma.familyTree.count({ where: { ownerId: userId } }),
    prisma.communityPost.count({ where: { authorId: userId } }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const recentTrees = await prisma.familyTree.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    take: 4,
    include: { _count: { select: { members: true } } },
  })

  const userName = (session?.user as any)?.nameArabic || session?.user?.name || 'مستخدم'

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-khartoum-900">
          مرحباً، {userName} 👋
        </h1>
        <p className="text-khartoum-500 mt-1">
          {new Intl.DateTimeFormat('ar-SD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={TreePine}
          label="شجرة عائلية"
          value={treeCount}
          color="bg-sand-500"
          href="/tree"
        />
        <StatCard
          icon={Users}
          label="منشور مجتمعي"
          value={postCount}
          color="bg-nile-600"
          href="/community"
        />
        <StatCard
          icon={Globe}
          label="قبيلة موثقة"
          value={50}
          color="bg-sahara-500"
          href="/community/heritage"
        />
        <StatCard
          icon={Bell}
          label="إشعار جديد"
          value={notifications.length}
          color="bg-acacia-600"
          href="/notifications"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Trees */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-khartoum-900 text-lg">شجراتي العائلية</h2>
            <Link href="/tree" className="text-sand-600 hover:text-sand-700 text-sm flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTrees.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-sand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TreePine className="w-8 h-8 text-sand-400" />
              </div>
              <h3 className="font-semibold text-khartoum-800 mb-2">لا توجد شجرة عائلية بعد</h3>
              <p className="text-khartoum-500 text-sm mb-6">ابدأ ببناء شجرتك العائلية الآن وسجّل نسبك للأجيال القادمة</p>
              <Link href="/tree/new" className="btn-primary">
                <Plus className="w-4 h-4" />
                أنشئ شجرتك الأولى
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {recentTrees.map(tree => (
                <Link key={tree.id} href={`/tree/${tree.id}`} className="card-hover p-5 block">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-heritage rounded-xl flex items-center justify-center shrink-0">
                      <TreePine className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-khartoum-900 truncate">
                        {tree.nameArabic || tree.name}
                      </h3>
                      <p className="text-xs text-khartoum-400 mt-0.5">
                        {tree._count.members} فرد • {tree.tribe || 'غير محدد'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge-sand text-xs ${tree.isPublic ? 'bg-acacia-100 text-acacia-700' : 'bg-khartoum-100 text-khartoum-600'}`}>
                      {tree.isPublic ? 'عامة' : 'خاصة'}
                    </span>
                    {tree.region && (
                      <span className="badge-sand text-xs">{tree.region}</span>
                    )}
                  </div>
                </Link>
              ))}

              <Link
                href="/tree/new"
                className="card p-5 border-dashed border-sand-300 bg-transparent hover:bg-sand-50 flex items-center justify-center gap-2 text-khartoum-400 hover:text-sand-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">شجرة جديدة</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="card p-5">
            <h2 className="font-bold text-khartoum-900 mb-4">إجراءات سريعة</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors group"
                >
                  <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-khartoum-700">{action.label}</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-khartoum-300 mr-auto" />
                </Link>
              ))}
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-khartoum-900">إشعارات جديدة</h2>
                <span className="badge-sand">{notifications.length}</span>
              </div>
              <div className="space-y-3">
                {notifications.slice(0, 3).map(n => (
                  <div key={n.id} className="flex gap-3">
                    <div className="w-2 h-2 bg-sand-500 rounded-full mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-khartoum-800">{n.title}</p>
                      <p className="text-xs text-khartoum-400 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights teaser */}
          <div className="card p-5 bg-gradient-to-br from-nile-50 to-white border-nile-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-nile-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-khartoum-900">رؤى الذكاء الاصطناعي</h3>
            </div>
            <p className="text-sm text-khartoum-500 mb-4 leading-relaxed">
              يمكن للذكاء الاصطناعي مساعدتك في اكتشاف الروابط المفقودة في شجرتك العائلية
            </p>
            <Link href="/ai-insights" className="btn-secondary text-sm w-full justify-center">
              استكشف الرؤى
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, color, href,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  href: string
}) {
  return (
    <Link href={href} className="card-hover p-5 flex items-center gap-4 group">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-khartoum-900">{value}</div>
        <div className="text-xs text-khartoum-400 mt-0.5">{label}</div>
      </div>
    </Link>
  )
}

const QUICK_ACTIONS = [
  { label: 'إضافة فرد للعائلة',   href: '/tree/new',              icon: TreePine,   color: 'bg-sand-500'  },
  { label: 'مشاركة في المجتمع',   href: '/community',             icon: Users,      color: 'bg-nile-600'  },
  { label: 'رفع تاريخ شفهي',       href: '/community/oral-history', icon: BookOpen,   color: 'bg-sahara-500'},
  { label: 'استكشاف قبائل السودان', href: '/community/heritage',   icon: Globe,      color: 'bg-acacia-600'},
]
