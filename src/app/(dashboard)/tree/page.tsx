import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth/auth-options'
import { prisma }           from '@/lib/db/prisma'
import Link                 from 'next/link'
import { TreePine, Plus, Lock, Globe, Users } from 'lucide-react'

export default async function TreeListPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id

  const trees = await prisma.familyTree.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { members: true, collaborations: true } },
      tags:   true,
    },
  })

  const sharedTrees = await prisma.treeCollaboration.findMany({
    where: { userId },
    include: {
      tree: {
        include: {
          owner: { select: { name: true, nameArabic: true } },
          _count: { select: { members: true } },
        },
      },
    },
  })

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">شجراتي العائلية</h1>
          <p className="section-subtitle">{trees.length} شجرة عائلية</p>
        </div>
        <Link href="/tree/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          شجرة جديدة
        </Link>
      </div>

      {trees.length === 0 ? (
        <div className="card p-16 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-sand-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <TreePine className="w-10 h-10 text-sand-400" />
          </div>
          <h2 className="text-xl font-bold text-khartoum-900 mb-3">لا توجد شجرة بعد</h2>
          <p className="text-khartoum-500 leading-relaxed mb-8">
            ابدأ ببناء شجرتك العائلية الآن. أضف أفراد عائلتك وسجّل نسبك
            للأجيال القادمة بكل تفاصيله الثقافية والتاريخية.
          </p>
          <Link href="/tree/new" className="btn-primary px-8 py-3">
            <Plus className="w-5 h-5" />
            أنشئ شجرتك الأولى
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {trees.map(tree => (
            <Link key={tree.id} href={`/tree/${tree.id}`} className="card-hover p-6 block group">
              {/* Cover / Icon */}
              <div className="w-full h-32 bg-gradient-heritage rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 pattern-overlay opacity-30" />
                <TreePine className="w-12 h-12 text-white/90 relative z-10" />
                <div className="absolute top-3 left-3">
                  {tree.isPublic
                    ? <Globe className="w-4 h-4 text-white/70" />
                    : <Lock className="w-4 h-4 text-white/70" />
                  }
                </div>
              </div>

              <h3 className="font-bold text-khartoum-900 text-lg group-hover:text-sand-700 transition-colors">
                {tree.nameArabic || tree.name}
              </h3>
              {tree.nameArabic && tree.name !== tree.nameArabic && (
                <p className="text-sm text-khartoum-400 mt-0.5">{tree.name}</p>
              )}

              {tree.description && (
                <p className="text-sm text-khartoum-500 mt-2 line-clamp-2 leading-relaxed">
                  {tree.descriptionAr || tree.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-sand-100">
                <div className="flex items-center gap-1.5 text-sm text-khartoum-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{tree._count.members} فرد</span>
                </div>
                {tree.tribe && (
                  <span className="badge-sand text-xs">{tree.tribe}</span>
                )}
                {tree.region && (
                  <span className="badge-sand text-xs">{tree.region}</span>
                )}
              </div>

              {tree.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tree.tags.slice(0, 3).map(tag => (
                    <span key={tag.tag} className="badge bg-sand-50 text-sand-700 border border-sand-200 text-xs">
                      #{tag.tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}

          {/* New tree card */}
          <Link
            href="/tree/new"
            className="card border-dashed border-sand-300 bg-transparent hover:bg-sand-50 p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[200px]"
          >
            <div className="w-12 h-12 border-2 border-dashed border-sand-300 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-sand-400" />
            </div>
            <span className="text-sm font-medium text-khartoum-400">إضافة شجرة جديدة</span>
          </Link>
        </div>
      )}

      {/* Shared with me */}
      {sharedTrees.length > 0 && (
        <div>
          <h2 className="font-bold text-khartoum-900 text-lg mb-4">مشارَك معي</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sharedTrees.map(collab => (
              <Link key={collab.id} href={`/tree/${collab.treeId}`} className="card-hover p-5 block">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-nile-100 rounded-xl flex items-center justify-center shrink-0">
                    <TreePine className="w-5 h-5 text-nile-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-khartoum-900 text-sm">
                      {collab.tree.nameArabic || collab.tree.name}
                    </h3>
                    <p className="text-xs text-khartoum-400">
                      بواسطة {collab.tree.owner?.nameArabic || collab.tree.owner?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-nile text-xs">{collab.role === 'VIEWER' ? 'مشاهد' : collab.role === 'EDITOR' ? 'محرر' : 'مدير'}</span>
                  <span className="text-xs text-khartoum-400">{collab.tree._count.members} فرد</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
