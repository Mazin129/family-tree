'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { FamilyTreeCanvas }  from '@/components/family-tree/FamilyTreeCanvas'
import { MemberCard }        from '@/components/family-tree/MemberCard'
import { AddMemberModal }     from '@/components/family-tree/AddMemberModal'
import { BulkAddMembersModal } from '@/components/family-tree/BulkAddMembersModal'
import { ShareModal }        from '@/components/family-tree/ShareModal'
import { AIInsightsPanel }   from '@/components/ai/AIInsightsPanel'
import { toast }             from 'sonner'
import {
  TreePine, Plus, Settings, Share2,
  Users, Sparkles, ChevronLeft, X, UserCircle2, UsersRound,
} from 'lucide-react'
import type { TreeNode, TreeMember, FamilyTree } from '@/types'
import Link from 'next/link'

type Tab = 'tree' | 'members' | 'ai'

export default function TreeViewPage() {
  const params = useParams()
  const treeId = params.treeId as string

  const [tree,           setTree]          = useState<FamilyTree | null>(null)
  const [treeData,       setTreeData]      = useState<TreeNode | null>(null)
  const [members,        setMembers]       = useState<TreeMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null)
  const [showAddModal,   setShowAddModal]  = useState(false)
  const [showBulkModal,  setShowBulkModal]  = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [addRelativeTo,  setAddRelativeTo]  = useState<TreeMember | null>(null)
  const [activeTab,      setActiveTab]      = useState<Tab>('tree')
  const [loading,        setLoading]        = useState(true)

  const fetchTree = useCallback(async () => {
    try {
      const [treeRes, membersRes] = await Promise.all([
        fetch(`/api/family/trees/${treeId}`),
        fetch(`/api/family/members?treeId=${treeId}`),
      ])
      const [treeJson, membersJson] = await Promise.all([treeRes.json(), membersRes.json()])
      if (treeJson.success)    { setTree(treeJson.data.tree); setTreeData(treeJson.data.visualization) }
      if (membersJson.success)   setMembers(membersJson.data)
    } catch {
      toast.error('فشل تحميل الشجرة')
    } finally {
      setLoading(false)
    }
  }, [treeId])

  useEffect(() => { fetchTree() }, [fetchTree])

  function handleNodeClick(node: TreeNode) {
    const member = members.find(m => m.id === node.postgresId || m.neo4jPersonId === node.id)
    if (member) setSelectedMember(member)
  }

  function handleNodeAdd(node: TreeNode) {
    const member = members.find(m => m.id === node.postgresId || m.neo4jPersonId === node.id)
    if (member) { setAddRelativeTo(member); setShowAddModal(true) }
  }

  async function handleDeleteMember(memberId: string) {
    try {
      const res  = await fetch(`/api/family/members/${memberId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('تم حذف الفرد')
      setSelectedMember(null)
      fetchTree()
    } catch { toast.error('فشل حذف الفرد') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-sand-50" dir="rtl">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl bg-sand-200 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TreePine className="w-8 h-8 text-sand-400" />
            </div>
          </div>
          <p className="text-khartoum-500 text-sm font-medium">جارٍ تحميل الشجرة…</p>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'tree'    as Tab, label: 'الشجرة',  icon: TreePine  },
    { id: 'members' as Tab, label: 'الأفراد', icon: Users     },
    { id: 'ai'      as Tab, label: 'الذكاء',  icon: Sparkles  },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" dir="rtl">

      {/* ━━ Row 1 – Navigation + tree title + actions ━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-white border-b border-sand-100">
        {/* Back + identity */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/tree"
            className="shrink-0 w-9 h-9 rounded-xl border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-khartoum-500" />
          </Link>
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-heritage flex items-center justify-center shadow-sm">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-khartoum-900 leading-tight truncate text-sm sm:text-base">
              {tree?.nameArabic || tree?.name || '…'}
            </h1>
            <p className="text-xs text-khartoum-400 mt-0.5 truncate">
              {members.length} فرد مسجّل
              {tree?.tribe ? ` · ${tree.tribe}` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => { setAddRelativeTo(null); setShowBulkModal(true) }}
            className="btn-secondary py-2 px-3 sm:px-4 text-xs sm:text-sm gap-1.5"
            title="إضافة متعددة"
          >
            <UsersRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إضافة متعددة</span>
          </button>
          <button
            onClick={() => { setAddRelativeTo(null); setShowAddModal(true) }}
            className="btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إضافة فرد</span>
          </button>
          <button
            title="مشاركة الشجرة"
            onClick={() => setShowShareModal(true)}
            className="w-9 h-9 rounded-xl border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors"
          >
            <Share2 className="w-4 h-4 text-khartoum-500" />
          </button>
          <Link href={`/tree/${treeId}/settings`}
            className="w-9 h-9 rounded-xl border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors">
            <Settings className="w-4 h-4 text-khartoum-500" />
          </Link>
        </div>
      </div>

      {/* ━━ Row 2 – Tab bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="shrink-0 flex items-center gap-0.5 px-4 sm:px-6 py-2 bg-white border-b border-sand-100">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-khartoum-900 text-white shadow-sm'
                : 'text-khartoum-500 hover:bg-sand-100 hover:text-khartoum-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'members' && members.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-sand-200 text-khartoum-600'
              }`}>
                {members.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ━━ Content ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex-1 overflow-hidden flex relative">

        {/* Main panel */}
        <div className="flex-1 overflow-hidden">

          {activeTab === 'tree' && (
            treeData
              ? <FamilyTreeCanvas
                  data={treeData}
                  onNodeClick={handleNodeClick}
                  onNodeAdd={handleNodeAdd}
                  language="ar"
                />
              : <EmptyTreeState onAdd={() => setShowAddModal(true)} />
          )}

          {activeTab === 'members' && (
            <div className="h-full overflow-y-auto p-5 sm:p-6 bg-sand-50">
              {members.length === 0 ? (
                <EmptyMembersState onAdd={() => setShowAddModal(true)} />
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {members.map(m => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      onEdit={() => setSelectedMember(m)}
                      onDelete={handleDeleteMember}
                      onAddRelative={(member) => { setAddRelativeTo(member); setShowAddModal(true) }}
                    />
                  ))}
                  <AddMemberTile onAdd={() => setShowAddModal(true)} onBulkAdd={() => setShowBulkModal(true)} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="h-full overflow-y-auto p-5 sm:p-6 bg-sand-50">
              <AIInsightsPanel treeId={treeId} members={members} />
            </div>
          )}
        </div>

        {/* ━━ Member detail side panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {selectedMember && (
          <div className="absolute inset-y-0 left-0 w-full sm:relative sm:inset-auto sm:w-80 bg-white border-r border-sand-200 flex flex-col z-20 shadow-2xl sm:shadow-md">
            {/* Panel header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-sand-100 bg-gradient-to-l from-sand-50 to-white">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-khartoum-400" />
                <span className="text-sm font-semibold text-khartoum-800">تفاصيل الفرد</span>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="w-7 h-7 rounded-lg hover:bg-sand-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-khartoum-500" />
              </button>
            </div>
            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-4">
              <MemberCard
                member={selectedMember}
                onEdit={() => {}}
                onDelete={handleDeleteMember}
                onAddRelative={(member) => { setAddRelativeTo(member); setShowAddModal(true) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ━━ Add member modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showAddModal && (
        <AddMemberModal
          treeId={treeId}
          relativeOf={addRelativeTo || undefined}
          onSuccess={() => { fetchTree(); setAddRelativeTo(null) }}
          onClose={() => { setShowAddModal(false); setAddRelativeTo(null) }}
        />
      )}

      {showBulkModal && (
        <BulkAddMembersModal
          treeId={treeId}
          relativeOf={addRelativeTo || undefined}
          existingMembers={members}
          onSuccess={() => { fetchTree(); setAddRelativeTo(null) }}
          onClose={() => { setShowBulkModal(false); setAddRelativeTo(null) }}
        />
      )}

      {showShareModal && tree && (
        <ShareModal
          treeId={treeId}
          treeName={tree.nameArabic || tree.name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

/* ── Empty states ─────────────────────────────────────────────────────────── */

function EmptyTreeState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-desert">
      <div className="text-center max-w-xs px-6" dir="rtl">
        {/* Stacked card illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-2 bg-sand-300/40 rounded-3xl rotate-6" />
          <div className="absolute inset-2 bg-sand-200/60 rounded-3xl -rotate-3" />
          <div className="relative w-full h-full bg-white rounded-3xl shadow-lg flex items-center justify-center">
            <TreePine className="w-16 h-16 text-sand-400" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-khartoum-900 mb-3">الشجرة فارغة</h3>
        <p className="text-khartoum-500 text-sm leading-relaxed mb-8">
          ابدأ بإضافة الفرد الأول — نفسك أو أحد أجدادك — وستنمو الشجرة تلقائياً
        </p>
        <button onClick={onAdd} className="btn-primary px-10 py-3 text-sm shadow-lg shadow-sand-300/50">
          <Plus className="w-5 h-5" />
          إضافة أول فرد
        </button>
      </div>
    </div>
  )
}

function EmptyMembersState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" dir="rtl">
      <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-sand-200 flex items-center justify-center">
        <Users className="w-10 h-10 text-sand-300" />
      </div>
      <p className="text-khartoum-500 text-sm">لا يوجد أفراد بعد</p>
      <button onClick={onAdd} className="btn-primary text-sm py-2">
        <Plus className="w-4 h-4" /> إضافة فرد
      </button>
    </div>
  )
}

function AddMemberTile({ onAdd, onBulkAdd }: { onAdd: () => void; onBulkAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sand-200 bg-white/60 p-4 flex flex-col gap-3 min-h-[200px] justify-center">
      <button
        onClick={onAdd}
        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-sand-100 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-sand-100 group-hover:bg-sand-200 flex items-center justify-center transition-colors shrink-0">
          <Plus className="w-5 h-5 text-sand-400 group-hover:text-sand-600 transition-colors" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-khartoum-600 group-hover:text-khartoum-800 transition-colors">إضافة فرد</p>
          <p className="text-xs text-khartoum-400">نموذج تفصيلي</p>
        </div>
      </button>
      <div className="border-t border-sand-200" />
      <button
        onClick={onBulkAdd}
        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-sand-100 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-sand-100 group-hover:bg-sand-200 flex items-center justify-center transition-colors shrink-0">
          <UsersRound className="w-5 h-5 text-sand-400 group-hover:text-sand-600 transition-colors" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-khartoum-600 group-hover:text-khartoum-800 transition-colors">إضافة متعددة</p>
          <p className="text-xs text-khartoum-400">حتى ٢٠ فرداً دفعةً واحدة</p>
        </div>
      </button>
    </div>
  )
}
