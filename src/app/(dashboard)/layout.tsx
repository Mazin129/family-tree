import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/auth-options'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar }   from '@/components/layout/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-desert-50 texture-sand flex" dir="rtl">
      {/* Sidebar */}
      <Sidebar user={session.user as any} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={session.user as any} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
