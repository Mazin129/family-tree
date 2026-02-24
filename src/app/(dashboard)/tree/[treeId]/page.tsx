'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FamilyTreeCanvas }  from '@/components/family-tree/FamilyTreeCanvas'
import { MemberCard }        from '@/components/family-tree/MemberCard'
import { AddMemberModal }    from '@/components/family-tree/AddMemberModal'
import { AIInsightsPanel }   from '@/components/ai/AIInsightsPanel'
import { toast }             from 'sonner'
import {
  TreePine, Plus, Settings, Share2, Download,
  ZoomIn, Network, Users, Sparkles, ChevronLeft,
  Info, ArrowLeft,
} from 'lucide-react'
import type { TreeNode, TreeMember, FamilyTree } from '@/types'
import Link from 'next/link'

type Tab = 'tree' | 'members' | 'ai'

export default function TreeViewPage() {
  const params = useParams()
  const router = useRouter()
  const treeId = params.treeId as string

  const [tree,          setTree]          = useState<FamilyTree | null>(null)
  const [treeData,      setTreeData]      = useState<TreeNode | null>(null)
  const [members,       setMembers]       = useState<TreeMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null)
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [addRelativeTo, setAddRelativeTo] = useState<TreeMember | null>(null)
  const [activeTab,     setActiveTab]     = useState<Tab>('tree')
  const [loading,       setLoading]       = useState(true)

  const fetchTree = useCallback(async () => {
    try {
      const [treeRes, membersRes] = await Promise.all([
        fetch(`/api/family/trees/${treeId}`),
        fetch(`/api/family/members?treeId=${treeId}`),
      ])

      const [treeJson, membersJson] = await Promise.all([
        treeRes.json(), membersRes.json(),
      ])

      if (treeJson.success) {
        setTree(treeJson.data.tree)
        setTreeData(treeJson.data.visualization)
      }
      if (membersJson.success) {
        setMembers(membersJson.data)
      }
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
    if (member) {
      setAddRelativeTo(member)
      setShowAddModal(true)
    }
  }

  async function handleDeleteMember(memberId: string) {
    try {
      const res  = await fetch(`/api/family/members/${memberId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('تم حذف الفرد')
      setSelectedMember(null)
      fetchTree()
    } catch {
      toast.error('فشل حذف الفرد')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sand-200 border-t-sand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-khartoum-500">جارٍ تحميل الشجرة...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-sand-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tree" className="btn-ghost p-2">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 bg-gradient-heritage rounded-lg flex items-center justify-center">
            <TreePine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-khartoum-900 text-sm leading-tight">
              {tree?.nameArabic || tree?.name || '...'}
            </h1>
            <p className="text-xs text-khartoum-400">{members.length} فرد</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-sand-50 rounded-xl p-1">
          {([
            { id: 'tree',    label: 'الشجرة',    icon: TreePine   },
            { id: 'members', label: 'الأفراد',   icon: Users      },
            { id: 'ai',      label: 'الذكاء',    icon: Sparkles   },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-sand-700'
                  : 'text-khartoum-500 hover:text-khartoum-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddRelativeTo(null); setShowAddModal(true) }}
            className="btn-primary text-sm py-2"
          >
            <Plus className="w-4 h-4" />
            إضافة فرد
          </button>
          <button className="btn-secondary p-2" title="مشاركة">
            <Share2 className="w-4 h-4" />
          </button>
          <Link href={`/tree/${treeId}/settings`} className="btn-ghost p-2">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'tree' && (
            <>
              {treeData ? (
                <FamilyTreeCanvas
                  data={treeData}
                  onNodeClick={handleNodeClick}
                  onNodeAdd={handleNodeAdd}
                  language="ar"
                />
              ) : (
                <EmptyTreeState onAdd={() => setShowAddModal(true)} />
              )}
            </>
          )}

          {activeTab === 'members' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    onEdit={() => setSelectedMember(m)}
                    onDelete={handleDeleteMember}
                    onAddRelative={(member) => {
                      setAddRelativeTo(member)
                      setShowAddModal(true)
                    }}
                  />
                ))}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="card border-dashed border-sand-300 bg-transparent hover:bg-sand-50 p-6 flex flex-col items-center justify-center gap-2 min-h-[200px] transition-colors"
                >
                  <Plus className="w-8 h-8 text-sand-300" />
                  <span className="text-sm text-khartoum-400">إضافة فرد</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="p-6 overflow-y-auto h-full">
              <AIInsightsPanel treeId={treeId} members={members} />
            </div>
          )}
        </div>

        {/* Member detail panel */}
        {selectedMember && (
          <div className="w-80 border-r border-sand-200 bg-white overflow-y-auto p-4 animate-slide-in-rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-khartoum-900">تفاصيل الفرد</h3>
              <button onClick={() => setSelectedMember(null)} className="btn-ghost p-1.5">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <MemberCard
              member={selectedMember}
              onEdit={() => {}}
              onDelete={handleDeleteMember}
              onAddRelative={(member) => {
                setAddRelativeTo(member)
                setShowAddModal(true)
              }}
            />
          </div>
        )}
      </div>

      {/* Add member modal */}
      {showAddModal && (
        <AddMemberModal
          treeId={treeId}
          relativeOf={addRelativeTo || undefined}
          onSuccess={() => { fetchTree(); setAddRelativeTo(null) }}
          onClose={() => { setShowAddModal(false); setAddRelativeTo(null) }}
        />
      )}
    </div>
  )
}

function EmptyTreeState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 bg-sand-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float">
          <TreePine className="w-12 h-12 text-sand-400" />
        </div>
        <h3 className="text-xl font-bold text-khartoum-900 mb-3">الشجرة فارغة</h3>
        <p className="text-khartoum-500 mb-6 leading-relaxed">
          ابدأ بإضافة الفرد الأول — نفسك أو أحد أجدادك — وستنمو الشجرة تلقائياً
        </p>
        <button onClick={onAdd} className="btn-primary px-8 py-3">
          <Plus className="w-5 h-5" />
          إضافة أول فرد
        </button>
      </div>
    </div>
  )
}
