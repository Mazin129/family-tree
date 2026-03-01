'use client'

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

// ── Compact card dimensions ──────────────────────────────────────────────────
const CW  = 160
const CH  = 64
const CR  = 12
const AVR = 18

// ── Expanded card (zoomed in) ────────────────────────────────────────────────
const EX_CW = 180
const EX_CH = 130
const EX_AVR = 28

// ── Spacing ──────────────────────────────────────────────────────────────────
const SP_GAP = 16
const H_GAP  = 40
const V_STR  = 120

const NS_W = CW * 2 + SP_GAP + H_GAP
const NS_H = V_STR

// ── Zoom thresholds for semantic zoom ────────────────────────────────────────
const ZOOM_EXPANDED = 0.7
const ZOOM_COMPACT  = 0.25
// > ZOOM_EXPANDED  → expanded card with details
// ZOOM_COMPACT..ZOOM_EXPANDED → compact card (name only)
// < ZOOM_COMPACT → dot/pill mode

// ── Colours ──────────────────────────────────────────────────────────────────
const CONN  = '#b8a898'
const C_W   = 1.5

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

/** No depth limit: show all generations. Collapse only via explicit expand/collapse. */
const DEFAULT_EXPAND_DEPTH = 999

function countChildren(node: TreeNode): number {
  return (node.children?.length ?? 0) + (node.children?.reduce((s, c) => s + countChildren(c), 0) ?? 0)
}

function filterCollapsed(node: TreeNode, collapsed: Set<string>, depth: number, maxDepth: number): TreeNode {
  const isCollapsed = collapsed.has(node.id) || depth >= maxDepth
  const childCount = countChildren(node)
  if (isCollapsed || !node.children?.length) {
    return { ...node, children: undefined, _collapsed: childCount > 0, _childCount: childCount }
  }
  return {
    ...node,
    children: node.children.map(c => filterCollapsed(c, collapsed, depth + 1, maxDepth)),
    _collapsed: false,
  }
}

interface ExtTreeNode extends TreeNode {
  _collapsed?: boolean
  _childCount?: number
}

export function FamilyTreeCanvas({
  data, onNodeClick, onNodeAdd, onViewSubtree, language = 'ar', readOnly = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const initialFitDone = useRef(false)
  const gRef         = useRef<SVGGElement | null>(null)

  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set())
  const [zoomLevel,   setZoomLevel]   = useState(1)

  const filteredData = useMemo(() => {
    return filterCollapsed(data, collapsed, 0, DEFAULT_EXPAND_DEPTH)
  }, [data, collapsed])

  const draw = useCallback(() => {
    if (!svgRef.current || !filteredData) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth  || 960
    const H = svgRef.current.clientHeight || 640

    // ── Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs')
    const f1 = defs.append('filter').attr('id', 'card-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '150%')
    f1.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4).attr('flood-color', 'rgba(0,0,0,0.10)')
    const f2 = defs.append('filter').attr('id', 'card-shadow-sel')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '150%')
    f2.append('feDropShadow').attr('dx', 0).attr('dy', 3).attr('stdDeviation', 6).attr('flood-color', 'rgba(217,119,6,0.30)')

    // ── Hierarchy & layout ────────────────────────────────────────────────
    const root = d3.hierarchy<ExtTreeNode>(filteredData as ExtTreeNode, d => d.children as ExtTreeNode[] | undefined)
    d3.tree<ExtTreeNode>()
      .nodeSize([NS_W, NS_H])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.2)(root)

    const allNodes = root.descendants()
    const xs = allNodes.map(n => n.x!)
    const ys = allNodes.map(n => n.y!)
    const treeW = (Math.max(...xs) - Math.min(...xs)) + NS_W
    const treeH = (Math.max(...ys) - Math.min(...ys)) + NS_H

    // ── Root group ────────────────────────────────────────────────────────
    const g = svg.append('g')
    gRef.current = g.node()

    // ── Zoom ──────────────────────────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.02, 5])
      .on('zoom', (e) => {
        g.attr('transform', e.transform.toString())
        transformRef.current = e.transform
        const k = e.transform.k
        if (Math.abs(k - zoomLevel) > 0.02) setZoomLevel(k)
      })
    zoomRef.current = zoom
    svg.call(zoom)

    if (!initialFitDone.current) {
      const padX = 80, padY = 60
      const scaleX = W / (treeW + padX * 2)
      const scaleY = H / (treeH + padY * 2)
      const scale = Math.min(scaleX, scaleY, 1.2)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2
      const initT = d3.zoomIdentity
        .translate(W / 2, H / 2)
        .scale(scale)
        .translate(-cx, -cy)
      svg.call(zoom.transform, initT)
      transformRef.current = initT
      initialFitDone.current = true
    } else {
      svg.call(zoom.transform, transformRef.current)
    }

    type HNode = d3.HierarchyPointNode<ExtTreeNode>

    // ── Connectors ────────────────────────────────────────────────────────
    const connLayer = g.append('g').attr('class', 'conn-layer')
    const byParent = new Map<HNode, HNode[]>()
    root.links().forEach(({ source, target }) => {
      const s = source as HNode
      const t = target as HNode
      if (!byParent.has(s)) byParent.set(s, [])
      byParent.get(s)!.push(t)
    })

    byParent.forEach((children, parent) => {
      const px = parent.x
      const topY = parent.y + CH / 2 + 6
      const botY = children[0].y - CH / 2 - 6
      const midY = topY + (botY - topY) * 0.5

      const path = d3.path()
      path.moveTo(px, topY)
      path.lineTo(px, midY)
      connLayer.append('path').attr('d', path.toString())
        .attr('fill', 'none').attr('stroke', CONN).attr('stroke-width', C_W)

      if (children.length > 1) {
        const minCX = Math.min(...children.map(c => c.x))
        const maxCX = Math.max(...children.map(c => c.x))
        connLayer.append('line')
          .attr('x1', minCX).attr('y1', midY).attr('x2', maxCX).attr('y2', midY)
          .attr('stroke', CONN).attr('stroke-width', C_W)
      }

      children.forEach(child => {
        connLayer.append('line')
          .attr('x1', child.x).attr('y1', midY).attr('x2', child.x).attr('y2', botY)
          .attr('stroke', CONN).attr('stroke-width', C_W)
      })
    })

    // ── Palette helper ────────────────────────────────────────────────────
    function pal(p: ExtTreeNode) {
      const m = p.gender === 'MALE'
      const a = p.isAlive
      return {
        bg:     a ? (m ? MALE_BG     : FEMALE_BG)     : DEAD_BG,
        border: a ? (m ? MALE_BORDER : FEMALE_BORDER)  : DEAD_BORDER,
        accent: a ? (m ? MALE_ACCENT : FEMALE_ACCENT)  : DEAD_ACCENT,
        avBg:   a ? (m ? MALE_AV_BG  : FEMALE_AV_BG)  : DEAD_AV_BG,
        text:   a ? (m ? MALE_TEXT   : FEMALE_TEXT)    : DEAD_TEXT,
      }
    }

    function getName(p: ExtTreeNode) {
      const raw = language === 'ar' ? (p.nameArabic || p.name) : p.name
      return language === 'ar' ? tatweelName(raw || '', 1) : (raw || '')
    }

    // ── Compact card (default) ────────────────────────────────────────────
    function renderCompactCard(el: SVGGElement, person: ExtTreeNode, ox: number, isSel: boolean) {
      const g = d3.select(el)
      const c = pal(person)
      const name = getName(person)

      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2).attr('width', CW).attr('height', CH).attr('rx', CR)
        .attr('fill', c.bg).attr('stroke', isSel ? '#d97706' : c.border)
        .attr('stroke-width', isSel ? 2 : 1.2)
        .attr('filter', isSel ? 'url(#card-shadow-sel)' : 'url(#card-shadow)')

      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2).attr('width', 5).attr('height', CH)
        .attr('rx', 2.5).attr('fill', c.accent)

      const avCX = ox + 30
      const avCY = 0
      g.append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', AVR)
        .attr('fill', c.avBg).attr('stroke', c.border).attr('stroke-width', 1.2)

      if (person.photo) {
        const cid = `ac-${person.id}-${ox}`
        g.append('defs').append('clipPath').attr('id', cid)
          .append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', AVR)
        g.append('image').attr('href', person.photo)
          .attr('x', avCX - AVR).attr('y', avCY - AVR)
          .attr('width', AVR * 2).attr('height', AVR * 2)
          .attr('clip-path', `url(#${cid})`).attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        g.append('text').attr('x', avCX).attr('y', avCY + 5)
          .attr('text-anchor', 'middle').attr('font-size', 14).attr('font-weight', '700')
          .attr('font-family', "'Cairo', sans-serif").attr('fill', c.accent)
          .text((name || '؟').charAt(0))
      }

      const textX = ox + 56
      g.append('text').attr('x', textX).attr('y', -6)
        .attr('text-anchor', 'start').attr('font-size', 12.5).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif").attr('fill', c.text)
        .text(clip(name || 'مجهول', 14))

      const meta: string[] = []
      if (person.tribe) meta.push(person.tribe)
      if (person.birthYear) meta.push(`${person.birthYear}`)
      if (!person.isAlive) meta.push('†')
      if (meta.length) {
        g.append('text').attr('x', textX).attr('y', 12)
          .attr('text-anchor', 'start').attr('font-size', 10).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#64748b')
          .text(clip(meta.join(' · '), 20))
      }

      const spouseCount = person.spouses?.length ?? 0
      if (spouseCount > 0) {
        const sp = person.spouses![0]
        const spName = getName(sp)
        g.append('text').attr('x', textX).attr('y', 26)
          .attr('text-anchor', 'start').attr('font-size', 9).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#92400e')
          .text(`♥ ${clip(spName, 12)}${spouseCount > 1 ? ` (+${spouseCount - 1})` : ''}`)
      }
    }

    // ── Expanded card (zoomed in) ─────────────────────────────────────────
    function renderExpandedCard(el: SVGGElement, person: ExtTreeNode, ox: number, isSel: boolean) {
      const g = d3.select(el)
      const c = pal(person)
      const name = getName(person)
      const w = EX_CW
      const h = EX_CH

      g.append('rect').attr('x', ox).attr('y', -h / 2).attr('width', w).attr('height', h).attr('rx', CR)
        .attr('fill', c.bg).attr('stroke', isSel ? '#d97706' : c.border)
        .attr('stroke-width', isSel ? 2.5 : 1.5)
        .attr('filter', isSel ? 'url(#card-shadow-sel)' : 'url(#card-shadow)')

      g.append('rect').attr('x', ox).attr('y', -h / 2).attr('width', w).attr('height', 6).attr('rx', CR)
        .attr('fill', c.accent)

      const avCX = ox + w / 2
      const avCY = -h / 2 + 18 + EX_AVR
      g.append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', EX_AVR + 2)
        .attr('fill', 'white').attr('stroke', c.border).attr('stroke-width', 1.5)
      g.append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', EX_AVR).attr('fill', c.avBg)

      if (person.photo) {
        const cid = `ae-${person.id}-${ox}`
        g.append('defs').append('clipPath').attr('id', cid)
          .append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', EX_AVR)
        g.append('image').attr('href', person.photo)
          .attr('x', avCX - EX_AVR).attr('y', avCY - EX_AVR)
          .attr('width', EX_AVR * 2).attr('height', EX_AVR * 2)
          .attr('clip-path', `url(#${cid})`).attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        g.append('text').attr('x', avCX).attr('y', avCY + 6)
          .attr('text-anchor', 'middle').attr('font-size', 18).attr('font-weight', '700')
          .attr('font-family', "'Cairo', sans-serif").attr('fill', c.accent)
          .text((name || '؟').charAt(0))
      }

      const nameY = avCY + EX_AVR + 16
      g.append('text').attr('x', avCX).attr('y', nameY)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif").attr('fill', c.text)
        .text(clip(name || 'مجهول', 16))

      const meta: string[] = []
      if (person.tribe) meta.push(person.tribe)
      if (person.birthYear) meta.push(`${person.birthYear}${person.deathYear ? ` – ${person.deathYear}` : ''}`)
      if (!person.isAlive && !person.deathYear) meta.push('†')
      if (meta.length) {
        g.append('text').attr('x', avCX).attr('y', nameY + 16)
          .attr('text-anchor', 'middle').attr('font-size', 10).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#64748b')
          .text(clip(meta.join(' · '), 24))
      }

      const spouseCount = person.spouses?.length ?? 0
      if (spouseCount > 0) {
        const spName = getName(person.spouses![0])
        g.append('text').attr('x', avCX).attr('y', nameY + 30)
          .attr('text-anchor', 'middle').attr('font-size', 9.5).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#92400e')
          .text(`♥ ${clip(spName, 14)}${spouseCount > 1 ? ` (+${spouseCount - 1})` : ''}`)
      }
    }

    // ── Dot/pill mode (far zoom) ──────────────────────────────────────────
    function renderDot(el: SVGGElement, person: ExtTreeNode) {
      const g = d3.select(el)
      const c = pal(person)
      g.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 8)
        .attr('fill', c.accent).attr('stroke', 'white').attr('stroke-width', 1.5)
    }

    // ── Node groups ───────────────────────────────────────────────────────
    const nodeGs = g.append('g').attr('class', 'nodes-layer')
      .selectAll<SVGGElement, HNode>('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    nodeGs.each(function(d) {
      const person = d.data
      const isSel = person.id === selectedId
      const z = transformRef.current.k

      if (z < ZOOM_COMPACT) {
        renderDot(this, person)
      } else if (z >= ZOOM_EXPANDED) {
        renderExpandedCard(this, person, -EX_CW / 2, isSel)
      } else {
        renderCompactCard(this, person, -CW / 2, isSel)
      }

      const node = person as ExtTreeNode
      const hasKids = (node.children && node.children.length > 0)

      // ── Add button ────────────────────────────────────────────────────
      if (!readOnly && !node._collapsed) {
        const cardH = z >= ZOOM_EXPANDED ? EX_CH : CH
        const addBtnY = cardH / 2 + (hasKids ? 28 : 8)
        const addBtn = d3.select(this).append('g')
          .attr('class', 'add-btn')
          .attr('transform', `translate(0,${addBtnY})`)
          .style('opacity', 0).style('cursor', 'pointer')
          .on('click', (ev) => { ev.stopPropagation(); onNodeAdd?.(person) })

        addBtn.append('circle').attr('r', 12)
          .attr('fill', '#d4922d').attr('stroke', 'white').attr('stroke-width', 2)
        addBtn.append('text').attr('text-anchor', 'middle').attr('y', 5)
          .attr('font-size', 16).attr('font-weight', '700').attr('fill', 'white').text('+')
      }
    })

    // ── Hover / click ─────────────────────────────────────────────────────
    nodeGs
      .on('mouseenter', function() {
        d3.select(this).select('.add-btn').transition().duration(150).style('opacity', 1)
      })
      .on('mouseleave', function() {
        d3.select(this).select('.add-btn').transition().duration(150).style('opacity', 0)
      })
      .on('click', (ev, d) => {
        ev.stopPropagation()
        setSelectedId(d.data.id)
        onNodeClick?.(d.data)
      })
      .on('dblclick', (ev, d) => {
        ev.stopPropagation()
        onViewSubtree?.(d.data)
      })

    svg.on('click', () => { setSelectedId(null) })
  }, [filteredData, selectedId, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree, zoomLevel])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  function zoomBy(k: number) {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(220).call(zoomRef.current.scaleBy, k)
  }
  function fitView() {
    initialFitDone.current = false
    draw()
  }

  function expandAll() { setCollapsed(new Set()) }
  function collapseAll() {
    const ids = new Set<string>()
    function walk(n: TreeNode, depth: number) {
      if (depth >= 2 && n.children?.length) ids.add(n.id)
      n.children?.forEach(c => walk(c, depth + 1))
    }
    walk(data, 0)
    setCollapsed(ids)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none tree-canvas-bg">
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

      {/* ── Zoom controls ──────────────────────────────────────────────── */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-20" dir="ltr">
        {([
          { label: '+', fn: () => zoomBy(1.4),  title: 'تكبير' },
          { label: '−', fn: () => zoomBy(0.7),  title: 'تصغير' },
          { label: '⌂', fn: fitView,            title: 'ملائمة' },
        ] as const).map(b => (
          <button key={b.label} onClick={b.fn} title={b.title}
            className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-sm border border-sand-200 shadow-md flex items-center justify-center text-khartoum-600 hover:bg-white hover:shadow-lg font-bold text-sm transition-all">
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Expand/Collapse all ────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-20" dir="rtl">
        <button onClick={expandAll} title="توسيع الكل"
          className="px-2.5 py-1 rounded-lg bg-white/90 border border-sand-200 shadow-sm text-[10px] font-semibold text-khartoum-600 hover:bg-sand-100 transition-colors">
          توسيع ▼
        </button>
        <button onClick={collapseAll} title="طي الكل"
          className="px-2.5 py-1 rounded-lg bg-white/90 border border-sand-200 shadow-sm text-[10px] font-semibold text-khartoum-600 hover:bg-sand-100 transition-colors">
          طي ▲
        </button>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-2 border border-sand-100 shadow-sm space-y-1 z-20" dir="rtl">
        {([
          { color: MALE_ACCENT,   label: 'ذكر'   },
          { color: FEMALE_ACCENT, label: 'أنثى'  },
          { color: DEAD_ACCENT,   label: 'متوفى' },
        ]).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-khartoum-600 font-medium">{label}</span>
          </div>
        ))}
        <div className="text-[9px] text-khartoum-400 pt-1 border-t border-sand-100">
          نقر مزدوج = عرض الفرع
        </div>
      </div>

      {/* ── Zoom level indicator ───────────────────────────────────────── */}
      <div className="absolute top-3 left-3 bg-white/80 rounded-lg px-2 py-1 border border-sand-100 text-[10px] text-khartoum-500 font-mono z-10">
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  )
}

function clip(s: string, max: number): string {
  const m = Math.max(3, Math.floor(max))
  return s.length > m ? s.slice(0, m - 1) + '…' : s
}
