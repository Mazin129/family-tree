'use client'

/**
 * Family Tree Canvas — primary visualization for the Sudan Heritage Platform.
 * Layout: expandable vertical pedigree (root top, generations down, even horizontal spacing).
 * See docs/FAMILY_TREE_VISUALIZATION_DESIGN.md for research, concepts, and UX.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'
import { tatweelName } from '@/lib/utils/arabic'

interface FamilyTreeCanvasProps {
  data:         TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?:   (node: TreeNode) => void
  onViewSubtree?: (node: TreeNode) => void
  language?:    'ar' | 'en'
  readOnly?:    boolean
}

// ── Layout constants (single source of truth) ─────────────────────────────────
const CARD_W = 176
const CARD_H = 138
const CARD_R = 14
const CARD_PADDING_X = 16
const AVATAR_R = 20
const LINE_HEIGHT = 18

const EX_CARD_W = 200
const EX_CARD_H = 150
const EX_AVATAR_R = 30

// Node spacing: generous gap so nodes and lines never feel cramped
const NODE_DX = 280
const NODE_DY = 150

// Connector: clear, visible lines; gap so they don’t touch card edges
const CONN_CARD_HALF = Math.max(CARD_H, EX_CARD_H) / 2
const CONN_GAP = 14

// Semantic zoom: card style by scale
const ZOOM_DOT = 0.22
const ZOOM_EXPANDED = 0.65

const CONN_COLOR = '#6b5b4f'
const CONN_WIDTH = 2

const MALE_BG     = '#dbeafe'
const MALE_BORDER = '#93c5fd'
const MALE_ACCENT = '#2563eb'
const MALE_AV_BG  = '#bfdbfe'
const MALE_TEXT   = '#1e3a5f'

const FEMALE_BG     = '#fce7f3'
const FEMALE_BORDER = '#f9a8d4'
const FEMALE_ACCENT = '#db2777'
const FEMALE_AV_BG  = '#fbcfe8'
const FEMALE_TEXT   = '#5b1a33'

const DEAD_BG     = '#f1f5f9'
const DEAD_BORDER = '#cbd5e1'
const DEAD_ACCENT = '#94a3b8'
const DEAD_AV_BG  = '#e2e8f0'
const DEAD_TEXT   = '#334155'

const DEFAULT_MAX_DEPTH = 8
const MAX_DEPTH_LIMIT = 30

type SemanticZoomMode = 'dot' | 'compact' | 'expanded'

function getSemanticMode(k: number): SemanticZoomMode {
  if (k < ZOOM_DOT) return 'dot'
  if (k >= ZOOM_EXPANDED) return 'expanded'
  return 'compact'
}

function countDescendants(node: TreeNode): number {
  const n = node.children?.length ?? 0
  return n + (node.children?.reduce((s, c) => s + countDescendants(c), 0) ?? 0)
}

function filterByDepthAndCollapsed(
  node: TreeNode,
  collapsedIds: Set<string>,
  depth: number,
  maxDepth: number
): TreeNode & { _collapsed?: boolean; _childCount?: number } {
  const totalBelow = countDescendants(node)
  const hideChildren = collapsedIds.has(node.id) || depth >= maxDepth
  if (hideChildren || !node.children?.length) {
    return { ...node, children: undefined, _collapsed: totalBelow > 0, _childCount: totalBelow }
  }
  return {
    ...node,
    children: node.children.map((c) =>
      filterByDepthAndCollapsed(c, collapsedIds, depth + 1, maxDepth)
    ),
    _collapsed: false,
  }
}

function clipText(s: string, maxLen: number): string {
  const m = Math.max(2, maxLen)
  return s.length > m ? s.slice(0, m - 1) + '…' : s
}

export function FamilyTreeCanvas({
  data,
  onNodeClick,
  onNodeAdd,
  onViewSubtree,
  language = 'ar',
  readOnly = false,
}: FamilyTreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef(d3.zoomIdentity)
  const didInitialFit = useRef(false)
  const lastSemanticModeRef = useRef<SemanticZoomMode | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [maxDepth, setMaxDepth] = useState(DEFAULT_MAX_DEPTH)
  const [semanticMode, setSemanticMode] = useState<SemanticZoomMode>('compact')
  const [zoomScale, setZoomScale] = useState(1)
  const [generations, setGenerations] = useState<{ depth: number; y: number; label: string }[]>([])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const filteredTree = useMemo(() => {
    if (!data?.id) return null
    return filterByDepthAndCollapsed(data, collapsed, 0, maxDepth)
  }, [data, collapsed, maxDepth])

  // When tree data identity changes (e.g. switch to subtree), fit again on next draw
  const dataIdRef = useRef(data?.id)
  useEffect(() => {
    if (data?.id !== dataIdRef.current) {
      dataIdRef.current = data?.id
      didInitialFit.current = false
    }
  }, [data])

  const draw = useCallback(() => {
    const svgEl = svgRef.current
    if (!svgEl || !filteredTree || !data?.id) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const width = svgEl.clientWidth || 800
    const height = svgEl.clientHeight || 500

    // ── Defs ─────────────────────────────────────────────────────────────
    const defs = svg.append('defs')
    defs.append('filter').attr('id', 'tree-card-shadow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%')
      .append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 3).attr('flood-color', 'rgba(0,0,0,0.12)')
    defs.append('filter').attr('id', 'tree-card-shadow-sel').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%')
      .append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4).attr('flood-color', 'rgba(217,119,6,0.25)')

    // ── Hierarchy & layout ──────────────────────────────────────────────
    const root = d3.hierarchy(filteredTree, (d) => d.children)
    d3.tree<TreeNode & { children?: TreeNode[] }>()
      .nodeSize([NODE_DX, NODE_DY])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.1))(root)

    const nodes = root.descendants()
    if (nodes.length === 0) return

    // Even horizontal spacing per generation (avoids messy variable gaps from Reingold–Tilford)
    const byDepth = new Map<number, typeof nodes>()
    nodes.forEach((n) => {
      const d = n.depth
      if (!byDepth.has(d)) byDepth.set(d, [])
      byDepth.get(d)!.push(n)
    })
    byDepth.forEach((levelNodes) => {
      levelNodes.sort((a, b) => (a.x ?? 0) - (b.x ?? 0))
      const k = levelNodes.length
      const startX = -((k - 1) * NODE_DX) / 2
      levelNodes.forEach((n, i) => { n.x = startX + i * NODE_DX })
    })

    const xs = nodes.map((n) => n.x!)
    const ys = nodes.map((n) => n.y!)
    const treeWidth = Math.max(...xs) - Math.min(...xs) + NODE_DX
    const treeHeight = Math.max(...ys) - Math.min(...ys) + NODE_DY
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (ev) => {
        transformRef.current = ev.transform
        g.attr('transform', ev.transform.toString())
        const mode = getSemanticMode(ev.transform.k)
        if (lastSemanticModeRef.current !== mode) {
          lastSemanticModeRef.current = mode
          setSemanticMode(mode)
        }
      })
      .on('end', (ev) => setZoomScale(ev.transform.k))
    zoomBehaviorRef.current = zoom
    svg.call(zoom)

    if (!didInitialFit.current) {
      const padding = 60
      const scale = Math.min(
        (width - padding * 2) / treeWidth,
        (height - padding * 2) / treeHeight,
        1.4
      )
      const t = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY)
      svg.call(zoom.transform, t)
      transformRef.current = t
      didInitialFit.current = true
      lastSemanticModeRef.current = getSemanticMode(t.k)
      setSemanticMode(lastSemanticModeRef.current)
      setZoomScale(t.k)
    } else {
      svg.call(zoom.transform, transformRef.current)
      setZoomScale(transformRef.current.k)
    }

    // Generation strip data (by depth → y)
    const genByDepth = new Map<number, number>()
    nodes.forEach((n) => { if (!genByDepth.has(n.depth)) genByDepth.set(n.depth, n.y!) })
    setGenerations(
      Array.from(genByDepth.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([depth, y]) => ({ depth, y, label: `الجيل ${depth + 1}` }))
    )

    type HNode = d3.HierarchyPointNode<TreeNode & { _collapsed?: boolean; _childCount?: number }>

    // ── Connectors (parent above, children below; one height for all zoom levels) ─
    const linkGroup = g.append('g').attr('class', 'connectors').attr('aria-hidden', 'true')
    const byParent = new Map<HNode, HNode[]>()
    root.links().forEach(({ source, target }) => {
      const s = source as HNode
      const t = target as HNode
      if (!byParent.has(s)) byParent.set(s, [])
      byParent.get(s)!.push(t)
    })

    byParent.forEach((children, parent) => {
      const py = parent.y + CONN_CARD_HALF + CONN_GAP
      const cyMin = Math.min(...children.map((c) => c.y)) - CONN_CARD_HALF - CONN_GAP
      const midY = (py + cyMin) / 2
      const minX = Math.min(...children.map((c) => c.x))
      const maxX = Math.max(...children.map((c) => c.x))

      linkGroup.append('line')
        .attr('x1', parent.x).attr('y1', parent.y + CONN_CARD_HALF + CONN_GAP)
        .attr('x2', parent.x).attr('y2', midY)
        .attr('stroke', CONN_COLOR).attr('stroke-width', CONN_WIDTH).attr('stroke-linecap', 'round')
      linkGroup.append('line')
        .attr('x1', minX).attr('y1', midY).attr('x2', maxX).attr('y2', midY)
        .attr('stroke', CONN_COLOR).attr('stroke-width', CONN_WIDTH).attr('stroke-linecap', 'round')
      children.forEach((child) => {
        linkGroup.append('line')
          .attr('x1', child.x).attr('y1', midY)
          .attr('x2', child.x).attr('y2', child.y - CONN_CARD_HALF - CONN_GAP)
          .attr('stroke', CONN_COLOR).attr('stroke-width', CONN_WIDTH).attr('stroke-linecap', 'round')
      })
    })

    // ── Helpers ─────────────────────────────────────────────────────────
    function palette(p: TreeNode) {
      const male = p.gender === 'MALE'
      const alive = p.isAlive
      return {
        bg: alive ? (male ? MALE_BG : FEMALE_BG) : DEAD_BG,
        border: alive ? (male ? MALE_BORDER : FEMALE_BORDER) : DEAD_BORDER,
        accent: alive ? (male ? MALE_ACCENT : FEMALE_ACCENT) : DEAD_ACCENT,
        avBg: alive ? (male ? MALE_AV_BG : FEMALE_AV_BG) : DEAD_AV_BG,
        text: alive ? (male ? MALE_TEXT : FEMALE_TEXT) : DEAD_TEXT,
      }
    }
    function displayName(p: TreeNode) {
      const raw = language === 'ar' ? (p.nameArabic || p.name) : p.name
      return language === 'ar' ? tatweelName(raw ?? '', 1) : (raw ?? '')
    }

    const mode = semanticMode

    // ── Nodes ──────────────────────────────────────────────────────────
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const nodeEls = nodeGroup
      .selectAll<SVGGElement, HNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    nodeEls.each(function (d) {
      const p = d.data
      const ext = p as TreeNode & { _collapsed?: boolean; _childCount?: number }
      const isSelected = p.id === selectedId
      const col = palette(p)
      const name = displayName(p)

      if (mode === 'dot') {
        d3.select(this)
          .append('circle').attr('r', 10).attr('fill', col.accent).attr('stroke', '#fff').attr('stroke-width', 2)
        return
      }

      const isExpanded = mode === 'expanded'
      const w = isExpanded ? EX_CARD_W : CARD_W
      const h = isExpanded ? EX_CARD_H : CARD_H
      const ox = -w / 2

      d3.select(this)
        .append('rect')
        .attr('x', ox).attr('y', -h / 2).attr('width', w).attr('height', h).attr('rx', CARD_R)
        .attr('fill', col.bg).attr('stroke', isSelected ? '#d97706' : col.border)
        .attr('stroke-width', isSelected ? 2.5 : 1.2)
        .attr('filter', isSelected ? 'url(#tree-card-shadow-sel)' : 'url(#tree-card-shadow)')
      d3.select(this)
        .append('rect')
        .attr('x', ox).attr('y', -h / 2).attr('width', 5).attr('height', h).attr('rx', 2.5)
        .attr('fill', col.accent)

      const avCx = ox + (isExpanded ? w / 2 : CARD_PADDING_X + AVATAR_R)
      const avCy = isExpanded ? -h / 2 + 24 + EX_AVATAR_R : 0
      const avR = isExpanded ? EX_AVATAR_R : AVATAR_R
      const textGap = 14

      d3.select(this)
        .append('circle').attr('cx', avCx).attr('cy', avCy).attr('r', avR)
        .attr('fill', col.avBg).attr('stroke', col.border).attr('stroke-width', 1.2)

      if (p.photo) {
        const clipId = `av-${p.id}-${d.x}-${d.y}`
        d3.select(this).append('defs').append('clipPath').attr('id', clipId)
          .append('circle').attr('cx', avCx).attr('cy', avCy).attr('r', avR)
        d3.select(this)
          .append('image').attr('href', p.photo)
          .attr('x', avCx - avR).attr('y', avCy - avR).attr('width', avR * 2).attr('height', avR * 2)
          .attr('clip-path', `url(#${clipId})`).attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        d3.select(this)
          .append('text').attr('x', avCx).attr('y', avCy + (isExpanded ? 6 : 5))
          .attr('text-anchor', 'middle').attr('font-size', isExpanded ? 18 : 14).attr('font-weight', '700')
          .attr('font-family', "'Cairo', sans-serif").attr('fill', col.accent)
          .text((name || '؟').charAt(0))
      }

      const textX = ox + (isExpanded ? w / 2 : CARD_PADDING_X + AVATAR_R * 2 + textGap)
      // Compact: name below avatar (avatar y=0, r=18) so name/tribe/† don’t overlap the circle.
      const nameY = isExpanded ? avCy + avR + 16 : AVATAR_R + 10
      d3.select(this)
        .append('text').attr('x', textX).attr('y', nameY)
        .attr('text-anchor', isExpanded ? 'middle' : 'start').attr('font-size', isExpanded ? 13 : 12.5).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif").attr('fill', col.text)
        .text(clipText(name || '—', isExpanded ? 18 : 14))

      const meta: string[] = []
      if (p.tribe) meta.push(p.tribe)
      if (isExpanded && p.birthYear != null && p.deathYear != null) {
        meta.push(`${p.birthYear} – ${p.deathYear}`)
      } else if (p.birthYear != null) {
        meta.push(String(p.birthYear))
      }
      if (!p.isAlive && !meta.some((m) => m.includes('†'))) meta.push('†')
      const metaStr = meta.filter(Boolean).join(isExpanded ? ' ' : ' · ')
      if (metaStr) {
        d3.select(this)
          .append('text').attr('x', textX).attr('y', nameY + LINE_HEIGHT)
          .attr('text-anchor', isExpanded ? 'middle' : 'start').attr('font-size', 10)
          .attr('font-family', "'Cairo', sans-serif").attr('fill', '#64748b')
          .text(clipText(metaStr, 32))
      }

      const spouseCount = p.spouses?.length ?? 0
      if (spouseCount > 0) {
        const spName = displayName(p.spouses![0])
        d3.select(this)
          .append('text').attr('x', textX).attr('y', nameY + LINE_HEIGHT * 2)
          .attr('text-anchor', isExpanded ? 'middle' : 'start').attr('font-size', 9)
          .attr('font-family', "'Cairo', sans-serif").attr('fill', '#92400e')
          .text('♥ ' + clipText(spName, 12) + (spouseCount > 1 ? ` +${spouseCount - 1}` : ''))
      }

      const hasChildren = (ext._collapsed && (ext._childCount ?? 0) > 0) || (ext.children && ext.children.length > 0)
      if (hasChildren) {
        const btnY = h / 2 + 6
        const badge = d3.select(this).append('g').attr('transform', `translate(0,${btnY})`).style('cursor', 'pointer')
          .on('click', (ev) => { ev.stopPropagation(); toggleCollapse(p.id) })
        if (ext._collapsed) {
          badge.append('rect').attr('x', -28).attr('y', -10).attr('width', 56).attr('height', 20).attr('rx', 10)
            .attr('fill', '#d4922d').attr('stroke', '#fff').attr('stroke-width', 1.5)
          badge.append('text').attr('x', 0).attr('y', 5).attr('text-anchor', 'middle')
            .attr('font-size', 10).attr('font-weight', '700').attr('fill', '#fff').attr('font-family', "'Cairo', sans-serif")
            .text(`▼ ${ext._childCount ?? ''}`)
        } else {
          badge.append('circle').attr('r', 9).attr('fill', '#e2e8f0').attr('stroke', '#94a3b8').attr('stroke-width', 1)
          badge.append('text').attr('x', 0).attr('y', 4).attr('text-anchor', 'middle')
            .attr('font-size', 10).attr('font-weight', '700').attr('fill', '#475569').text('▲')
        }
      }

      if (!readOnly && !ext._collapsed) {
        const addY = h / 2 + (hasChildren ? 32 : 10)
        const addBtn = d3.select(this).append('g').attr('class', 'add-btn').attr('transform', `translate(0,${addY})`)
          .style('opacity', 0).style('cursor', 'pointer')
          .on('click', (ev) => { ev.stopPropagation(); onNodeAdd?.(p) })
        addBtn.append('circle').attr('r', 12).attr('fill', '#d4922d').attr('stroke', '#fff').attr('stroke-width', 2)
        addBtn.append('text').attr('text-anchor', 'middle').attr('y', 5).attr('font-size', 16).attr('font-weight', '700').attr('fill', '#fff').text('+')
      }
    })

    nodeEls
      .on('mouseenter', function () { d3.select(this).select('.add-btn').transition().duration(120).style('opacity', 1) })
      .on('mouseleave', function () { d3.select(this).select('.add-btn').transition().duration(120).style('opacity', 0) })
      .on('click', (ev, d) => { ev.stopPropagation(); setSelectedId(d.data.id); onNodeClick?.(d.data) })
      .on('dblclick', (ev, d) => { ev.stopPropagation(); onViewSubtree?.(d.data) })

    svg.on('click', () => setSelectedId(null))
  }, [filteredTree, selectedId, semanticMode, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree, toggleCollapse])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(el)
    return () => ro.disconnect()
  }, [draw])

  const zoomBy = useCallback((k: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, k)
  }, [])

  const fitView = useCallback(() => {
    didInitialFit.current = false
    draw()
  }, [draw])

  const expandAll = useCallback(() => {
    setCollapsed(new Set())
    setMaxDepth(MAX_DEPTH_LIMIT)
  }, [])

  const collapseAll = useCallback(() => {
    const ids = new Set<string>()
    function walk(n: TreeNode, depth: number) {
      if (depth >= 1 && n.children?.length) ids.add(n.id)
      n.children?.forEach((c) => walk(c, depth + 1))
    }
    walk(data, 0)
    setCollapsed(ids)
    setMaxDepth(DEFAULT_MAX_DEPTH)
  }, [data])

  const showMoreLevels = useCallback(() => {
    setMaxDepth((d) => Math.min(d + 5, MAX_DEPTH_LIMIT))
  }, [])

  if (!data?.id) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-sand-50/80" aria-live="polite">
        <p className="text-khartoum-500 text-sm" dir="rtl">لا توجد بيانات للشجرة</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-sand-50/80">
      <svg ref={svgRef} className="w-full h-full block" style={{ minHeight: 400 }} aria-label="شجرة العائلة" role="img" />

      {generations.length > 1 && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col gap-1 z-20" dir="rtl">
          {generations.map((gen) => (
            <button
              key={gen.depth}
              type="button"
              onClick={() => {
                if (!svgRef.current || !zoomBehaviorRef.current) return
                const t = transformRef.current
                const newTy = -(gen.y * t.k) + (svgRef.current.clientHeight / 2)
                const newT = d3.zoomIdentity.translate(t.x, newTy).scale(t.k)
                d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, newT)
              }}
              className="w-8 h-8 rounded-lg bg-white/95 border border-sand-200 shadow-sm flex items-center justify-center text-xs font-bold text-khartoum-600 hover:bg-sand-100"
              title={gen.label}
              aria-label={gen.label}
            >
              {gen.depth + 1}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20" dir="ltr">
        {[
          { label: '+', fn: () => zoomBy(1.3), title: 'تكبير' },
          { label: '−', fn: () => zoomBy(1 / 1.3), title: 'تصغير' },
          { label: '⌂', fn: fitView, title: 'ملائمة الشجرة' },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.fn}
            title={b.title}
            aria-label={b.title}
            className="w-10 h-10 rounded-xl bg-white/95 border border-sand-200 shadow-md flex items-center justify-center text-khartoum-600 hover:bg-white font-bold text-sm"
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 flex flex-wrap gap-2 z-20" dir="rtl">
        <button
          type="button"
          onClick={expandAll}
          title="عرض كل المستويات حتى 30"
          aria-label="توسيع الكل — عرض كل المستويات حتى 30"
          className="px-3 py-1.5 rounded-lg bg-white/95 border border-sand-200 shadow-sm text-xs font-semibold text-khartoum-600 hover:bg-sand-100"
        >
          توسيع الكل
        </button>
        <button
          type="button"
          onClick={showMoreLevels}
          title="إضافة 5 مستويات"
          aria-label="أجيال أكثر — إضافة 5 مستويات"
          className="px-3 py-1.5 rounded-lg bg-nile-100 border border-nile-200 text-xs font-semibold text-nile-700 hover:bg-nile-200"
        >
          أجيال +
        </button>
        <button
          type="button"
          onClick={collapseAll}
          title="طي الفروع"
          aria-label="طي الفروع"
          className="px-3 py-1.5 rounded-lg bg-white/95 border border-sand-200 shadow-sm text-xs font-semibold text-khartoum-600 hover:bg-sand-100"
        >
          طي
        </button>
      </div>

      <div className="absolute bottom-4 left-3 bg-white/95 rounded-xl px-3 py-2 border border-sand-100 shadow-sm z-20" dir="rtl">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MALE_ACCENT }} aria-hidden /> ذكر</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FEMALE_ACCENT }} aria-hidden /> أنثى</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DEAD_ACCENT }} aria-hidden /> متوفى</span>
        </div>
        <p className="text-[10px] text-khartoum-400 mt-1.5 pt-1.5 border-t border-sand-100">
          ♥ زوج/زوجة · ▼ فرع مطوي · نقر مزدوج = عرض الفرع
        </p>
      </div>

      <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-2.5 py-1.5 border border-sand-200 shadow-sm text-[11px] font-medium text-khartoum-500 tabular-nums z-10" title="مستوى التكبير">
        {Math.round(zoomScale * 100)}%
      </div>
    </div>
  )
}
