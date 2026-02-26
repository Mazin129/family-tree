'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'

interface FamilyTreeCanvasProps {
  data:         TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?:   (node: TreeNode) => void
  language?:    'ar' | 'en'
  readOnly?:    boolean
}

// ── Card dimensions ───────────────────────────────────────────────────────────
const CW  = 186   // card width
const CH  = 98    // card height
const CR  = 13    // corner radius
const AVR = 27    // avatar circle radius

// ── Spacing ───────────────────────────────────────────────────────────────────
const SP_GAP = 18   // gap between spouse cards
const H_GAP  = 52   // horizontal gap between family units
const V_STR  = 210  // vertical stride between generations (center-to-center)

// D3 tree node allocation: room for one couple unit + gap
const NS_W = CW * 2 + SP_GAP + H_GAP  // nodeSize width
const NS_H = V_STR                      // nodeSize height

// ── Colours ───────────────────────────────────────────────────────────────────
const CONN  = '#c8b89a'   // connector lines
const C_W   = 2           // connector stroke-width

export function FamilyTreeCanvas({
  data, onNodeClick, onNodeAdd, language = 'ar', readOnly = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip,    setTooltip]    = useState<{ x: number; y: number; node: TreeNode } | null>(null)

  const draw = useCallback(() => {
    if (!svgRef.current || !data) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth  || 960
    const H = svgRef.current.clientHeight || 640

    // ── Build hierarchy & layout ──────────────────────────────────────────────
    const root = d3.hierarchy<TreeNode>(data, d => d.children)
    d3.tree<TreeNode>()
      .nodeSize([NS_W, NS_H])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.35)(root)

    const allNodes = root.descendants()
    const xs = allNodes.map(n => n.x!)
    const tx = W / 2 - (Math.min(...xs) + Math.max(...xs)) / 2
    const ty = 72

    // ── Root SVG group ────────────────────────────────────────────────────────
    const g = svg.append('g').attr('transform', `translate(${tx},${ty})`)

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    zoomRef.current = zoom
    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty))

    // ── Helper: couple anchor X (connector origin from parent down) ───────────
    type HNode = d3.HierarchyPointNode<TreeNode>
    function coupleAnchorX(d: HNode) {
      // If node has a spouse, anchor is the midpoint of the couple unit
      return d.data.spouses?.length
        ? d.x   // node.x is already centered between couple (see card drawing below)
        : d.x
    }

    // ── Connectors (family-tree step style) ───────────────────────────────────
    const connLayer = g.append('g').attr('class', 'conn-layer')

    const byParent = new Map<HNode, HNode[]>()
    root.links().forEach(({ source, target }) => {
      const s = source as HNode
      const t = target as HNode
      if (!byParent.has(s)) byParent.set(s, [])
      byParent.get(s)!.push(t)
    })

    byParent.forEach((children, parent) => {
      const px   = coupleAnchorX(parent)
      const topY = parent.y + CH / 2        // bottom of parent card row
      const botY = children[0].y - CH / 2   // top of children card row
      const midY = topY + (botY - topY) * 0.45

      // Vertical drop from parent/couple center
      connLayer.append('line')
        .attr('x1', px).attr('y1', topY)
        .attr('x2', px).attr('y2', midY)
        .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')

      if (children.length > 1) {
        // Horizontal bar spanning all siblings
        const minX = Math.min(...children.map(c => c.x))
        const maxX = Math.max(...children.map(c => c.x))
        connLayer.append('line')
          .attr('x1', minX).attr('y1', midY)
          .attr('x2', maxX).attr('y2', midY)
          .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')
      }

      // Vertical lines from bar down to each child
      children.forEach(child => {
        connLayer.append('line')
          .attr('x1', child.x).attr('y1', midY)
          .attr('x2', child.x).attr('y2', botY)
          .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')
      })
    })

    // ── Card renderer ─────────────────────────────────────────────────────────
    // ox = left edge of card relative to node center (d.x, d.y)
    function renderCard(el: SVGGElement, person: TreeNode, ox: number, isSelected: boolean) {
      const g        = d3.select(el)
      const isMale   = person.gender === 'MALE'
      const alive    = person.isAlive
      const accent   = !alive ? '#94a3b8' : isMale ? '#3b82f6' : '#ec4899'
      const bg       = isSelected ? '#fef9ec'
                     : !alive     ? '#f8fafc'
                     : isMale     ? '#eff6ff'
                     :              '#fdf2f8'
      const border   = isSelected ? '#d97706'
                     : !alive     ? '#cbd5e1'
                     : isMale     ? '#bfdbfe'
                     :              '#fbcfe8'
      const name     = language === 'ar' ? (person.nameArabic || person.name) : person.name
      const initChar = (name || '؟').charAt(0).toUpperCase()

      // Drop shadow
      g.append('rect')
        .attr('x', ox + 2).attr('y', -CH / 2 + 3)
        .attr('width', CW).attr('height', CH).attr('rx', CR)
        .attr('fill', 'rgba(0,0,0,0.08)')

      // Card background
      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2)
        .attr('width', CW).attr('height', CH).attr('rx', CR)
        .attr('fill', bg)
        .attr('stroke', border)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)

      // Left accent bar
      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2)
        .attr('width', 6).attr('height', CH).attr('rx', CR)
        .attr('fill', accent)

      // Avatar circle
      const avCX = ox + 6 + AVR + 8
      g.append('circle')
        .attr('cx', avCX).attr('cy', 0).attr('r', AVR)
        .attr('fill', !alive ? '#e2e8f0' : isMale ? '#dbeafe' : '#fce7f3')
        .attr('stroke', accent).attr('stroke-width', 2)

      // Avatar initial
      g.append('text')
        .attr('x', avCX).attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', 21).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif")
        .attr('fill', !alive ? '#64748b' : isMale ? '#1d4ed8' : '#be185d')
        .text(initChar)

      // Text area
      const textX  = ox + 6 + AVR * 2 + 18
      const maxChr = Math.max(5, Math.floor((CW - (6 + AVR * 2 + 18) - 10) / 7.2))

      // Name
      g.append('text')
        .attr('x', textX).attr('y', -22)
        .attr('font-size', 12).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif")
        .attr('fill', '#0f172a')
        .text(clip(name || 'مجهول', maxChr))

      // Dates
      const dateStr = [
        person.birthYear ? `${person.birthYear}م` : '',
        !alive && person.deathYear ? `† ${person.deathYear}` : '',
      ].filter(Boolean).join('  ')
      if (dateStr) {
        g.append('text')
          .attr('x', textX).attr('y', -5)
          .attr('font-size', 10).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#64748b')
          .text(dateStr)
      }

      // Tribe
      if (person.tribe) {
        g.append('text')
          .attr('x', textX).attr('y', 13)
          .attr('font-size', 9.5).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#92400e')
          .text(clip(person.tribe, maxChr + 3))
      }

      // Deceased dagger
      if (!alive) {
        g.append('text')
          .attr('x', ox + CW - 12).attr('y', -CH / 2 + 18)
          .attr('text-anchor', 'middle')
          .attr('font-size', 13).attr('fill', '#94a3b8')
          .text('†')
      }
    }

    // ── Node groups ───────────────────────────────────────────────────────────
    const nodeGs = g.append('g').attr('class', 'nodes-layer')
      .selectAll<SVGGElement, HNode>('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    // ── Draw cards ────────────────────────────────────────────────────────────
    nodeGs.each(function(d) {
      const spouse    = d.data.spouses?.[0]
      const hasSpouse = !!spouse

      // Center couple unit around node.x:
      // total couple width = CW + SP_GAP + CW, so main card offset:
      const mainOX = hasSpouse ? -(CW + SP_GAP / 2) : -CW / 2

      // Main person card
      renderCard(this, d.data, mainOX, d.data.id === selectedId)

      // Spouse card
      if (hasSpouse && spouse) {
        const spOX = mainOX + CW + SP_GAP
        renderCard(this, spouse, spOX, spouse.id === selectedId)

        // Marriage connector (dashed line + ring)
        const gSel   = d3.select(this)
        const ringX  = mainOX + CW + SP_GAP / 2
        gSel.append('line')
          .attr('x1', mainOX + CW + 1).attr('y1', 0)
          .attr('x2', spOX - 1).attr('y2', 0)
          .attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,2')
        gSel.append('circle')
          .attr('cx', ringX).attr('cy', 0).attr('r', 8)
          .attr('fill', '#fef3c7').attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
        gSel.append('text')
          .attr('x', ringX).attr('y', 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10).attr('fill', '#d97706')
          .text('♥')

        // Spouse card click
        gSel.append('rect')
          .attr('x', spOX).attr('y', -CH / 2)
          .attr('width', CW).attr('height', CH).attr('rx', CR)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', ev => {
            ev.stopPropagation()
            setSelectedId(spouse.id)
            onNodeClick?.(spouse)
          })
      }

      // Add-relative button (shown on hover)
      if (!readOnly) {
        const btn = d3.select(this).append('g')
          .attr('class', 'add-btn')
          .attr('transform', `translate(0,${CH / 2 + 18})`)
          .style('opacity', 0)
          .style('cursor', 'pointer')
          .on('click', ev => { ev.stopPropagation(); onNodeAdd?.(d.data) })

        btn.append('circle')
          .attr('r', 14)
          .attr('fill', '#d4922d').attr('stroke', 'white').attr('stroke-width', 2.5)
        btn.append('text')
          .attr('text-anchor', 'middle').attr('y', 5.5)
          .attr('font-size', 18).attr('font-weight', '700')
          .attr('fill', 'white')
          .text('+')
      }
    })

    // ── Hover: show/hide add button + tooltip ─────────────────────────────────
    nodeGs
      .on('mouseenter.btn', function() {
        d3.select(this).select('.add-btn').style('opacity', 1)
      })
      .on('mouseleave.btn', function() {
        d3.select(this).select('.add-btn').style('opacity', 0)
      })
      .on('mouseenter', (ev, d) => {
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, node: d.data })
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (ev, d) => {
        ev.stopPropagation()
        setSelectedId(d.data.id)
        onNodeClick?.(d.data)
      })

    svg.on('click', () => { setSelectedId(null); setTooltip(null) })
  }, [data, selectedId, language, readOnly, onNodeClick, onNodeAdd])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  function zoomBy(k: number) {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(240).call(zoomRef.current.scaleBy, k)
  }
  function resetView() {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(340)
      .call(zoomRef.current.transform, d3.zoomIdentity)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: '#f6f1e8',
        backgroundImage: 'radial-gradient(circle, #d3c8b0 1.2px, transparent 1.2px)',
        backgroundSize: '26px 26px',
      }}
    >
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

      {/* ── Tooltip ─────────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none bg-white rounded-2xl shadow-xl border border-sand-100 px-4 py-3 min-w-[170px] animate-fade-in"
          style={{ left: tooltip.x + 16, top: tooltip.y + 14, maxWidth: 250 }}
        >
          <p className="font-bold text-sm text-khartoum-900 leading-snug">
            {language === 'ar'
              ? tooltip.node.nameArabic || tooltip.node.name
              : tooltip.node.name}
          </p>
          {tooltip.node.tribe && (
            <p className="text-xs text-amber-700 mt-1">قبيلة {tooltip.node.tribe}</p>
          )}
          {(tooltip.node.birthYear || tooltip.node.deathYear) && (
            <p className="text-xs text-khartoum-400 mt-0.5">
              {tooltip.node.birthYear ? `${tooltip.node.birthYear}م` : ''}
              {tooltip.node.deathYear ? ` — ${tooltip.node.deathYear}` : ''}
            </p>
          )}
          {!tooltip.node.isAlive && (
            <p className="text-xs text-khartoum-400 mt-0.5">† رحل إلى رحمة الله</p>
          )}
        </div>
      )}

      {/* ── Zoom controls ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-5 flex flex-col gap-1.5" dir="ltr">
        {([
          { label: '+', fn: () => zoomBy(1.3),  title: 'تكبير' },
          { label: '−', fn: () => zoomBy(0.77), title: 'تصغير' },
          { label: '⌂', fn: resetView,           title: 'إعادة ضبط' },
        ] as const).map(b => (
          <button
            key={b.label}
            onClick={b.fn}
            title={b.title}
            className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm border border-sand-200 shadow-md flex items-center justify-center text-khartoum-600 hover:bg-white hover:shadow-lg font-bold text-base transition-all"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-sand-100 shadow-md space-y-1.5"
        dir="rtl"
      >
        {([
          { color: '#3b82f6', label: 'ذكر'   },
          { color: '#ec4899', label: 'أنثى'  },
          { color: '#94a3b8', label: 'متوفى' },
          { color: '#f59e0b', label: 'زواج'  },
        ]).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs text-khartoum-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function clip(s: string, max: number): string {
  const m = Math.max(3, Math.floor(max))
  return s.length > m ? s.slice(0, m - 1) + '…' : s
}
