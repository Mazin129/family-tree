'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TreePine, Printer, ChevronLeft } from 'lucide-react'
import type { TreeNode, FamilyTree } from '@/types'

export default function TreePrintPage() {
  const params = useParams()
  const treeId = params.treeId as string
  const [tree, setTree] = useState<FamilyTree | null>(null)
  const [treeData, setTreeData] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [treeRes, membersRes] = await Promise.all([
          fetch(`/api/family/trees/${treeId}`),
          fetch(`/api/family/members?treeId=${treeId}`),
        ])
        const [treeJson] = await Promise.all([treeRes.json(), membersRes.json()])
        if (!cancelled && treeJson.success) {
          setTree(treeJson.data.tree)
          setTreeData(treeJson.data.visualization)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [treeId])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-8" dir="rtl">
        <p className="text-khartoum-500">جارٍ تحميل الشجرة…</p>
      </div>
    )
  }

  if (!tree || !treeData) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center gap-4 p-8" dir="rtl">
        <p className="text-khartoum-600">الشجرة غير متوفرة</p>
        <Link href={`/tree/${treeId}`} className="btn-secondary">
          <ChevronLeft className="w-4 h-4" />
          العودة
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-sand-50 print:bg-white">
        {/* Toolbar – hidden when printing */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-sand-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href={`/tree/${treeId}`}
              className="flex items-center gap-2 text-khartoum-600 hover:text-khartoum-900 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              العودة للشجرة
            </Link>
            <span className="text-sand-300">|</span>
            <span className="font-bold text-khartoum-900">
              {tree.nameArabic || tree.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            طباعة / حفظ كـ PDF
          </button>
        </div>

        {/* Print content */}
        <div className="p-6 md:p-10 print:p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-khartoum-900 mb-2 print:text-xl" dir="rtl">
              {tree.nameArabic || tree.name}
            </h1>
            {tree.tribe && (
              <p className="text-khartoum-500 text-sm mb-8 print:mb-6">قبيلة: {tree.tribe}</p>
            )}
            <div className="print-tree">
              <PrintTreeNode node={treeData} depth={0} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PrintTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const name = node.nameArabic || node.name || '—'
  const dates = [node.birthYear, node.deathYear].filter(Boolean).join(' – ')
  const indent = depth * 24

  return (
    <div
      className="border border-sand-200 rounded-xl p-4 mb-3 bg-white shadow-sm print:shadow-none print:break-inside-avoid"
      style={{ marginInlineStart: indent }}
      dir="rtl"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-bold text-khartoum-900 text-lg">{name}</span>
        {node.tribe && (
          <span className="text-amber-700 text-sm">({node.tribe})</span>
        )}
        {!node.isAlive && <span className="text-khartoum-400 text-sm">† متوفى</span>}
      </div>
      {dates && <p className="text-khartoum-500 text-sm mt-1">{dates}</p>}

      {node.spouses && node.spouses.length > 0 && (
        <div className="mt-3 pt-3 border-t border-sand-100">
          <p className="text-xs text-khartoum-400 mb-2">زوج/زوجة:</p>
          <div className="space-y-2">
            {node.spouses.map((s) => (
              <PrintTreeNode key={s.id} node={s} depth={0} />
            ))}
          </div>
        </div>
      )}

      {node.children && node.children.length > 0 && (
        <div className="mt-3 pt-3 border-t border-sand-100">
          <p className="text-xs text-khartoum-400 mb-2">الأبناء:</p>
          <div className="space-y-2">
            {node.children.map((c) => (
              <PrintTreeNode key={c.id} node={c} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
