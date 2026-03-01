'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'
import { tatweelName } from '@/lib/utils/arabic'
import { TreePine } from 'lucide-react'

interface FamilyTreeCanvasProps {
  data:         TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?:   (node: TreeNode) => void
  /** When provided, hover tooltip shows "View subtree" and this is called when user clicks it */
  onViewSubtree?: (node: TreeNode) => void
  language?:    'ar' | 'en'
  readOnly?:    boolean
}

// ── Card dimensions (portrait style, MyHeritage-inspired) ─────────────────────
const CW  = 148   // card width
const CH  = 178   // card height (portrait)
const CR  = 14    // corner radius
const AVR = 36    // avatar radius

// ── Spacing ───────────────────────────────────────────────────────────────────
const SP_GAP = 20   // gap between spouse cards
const H_GAP  = 56   // horizontal gap between family units
const V_STR  = 240  // vertical stride between generations

const NS_W = CW * 2 + SP_GAP + H_GAP
const NS_H = V_STR

// ── Colours ───────────────────────────────────────────────────────────────────
const CONN  = '#b8a898'
const C_W   = 2

// Male palette
const MALE_BG     = '#dbeafe'
const MALE_BORDER = '#93c5fd'
const MALE_ACCENT = '#2563eb'
const MALE_AV_BG  = '#bfdbfe'
const MALE_AV_FG  = '#1d4ed8'
const MALE_TEXT   = '#1e3a5f'

// Female palette
const FEMALE_BG     = '#fce7f3'
const FEMALE_BORDER = '#f9a8d4'
const FEMALE_ACCENT = '#db2777'
const FEMALE_AV_BG  = '#fbcfe8'
const FEMALE_AV_FG  = '#9d174d'
const FEMALE_TEXT   = '#5b1a33'

// Deceased palette
const DEAD_BG     = '#f1f5f9'
const DEAD_BORDER = '#cbd5e1'
const DEAD_ACCENT = '#94a3b8'
const DEAD_AV_BG  = '#e2e8f0'
const DEAD_AV_FG  = '#475569'
const DEAD_TEXT   = '#334155'

const TOOLTIP_HIDE_DELAY_MS = 400

export function FamilyTreeCanvas({
  data, onNodeClick, onNodeAdd, onViewSubtree, language = 'ar', readOnly = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const hideTooltipRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip,    setTooltip]    = useState<{ x: number; y: number; node: TreeNode } | null>(null)

  const draw = useCallback(() => {
    if (!svgRef.current || !data) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth  || 960
    const H = svgRef.current.clientHeight || 640

    // ── Defs: drop shadow filter ───────────────────────────────────────────
    const defs = svg.append('defs')
    const filter = defs.append('filter')
      .attr('id', 'card-shadow')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '150%')
    filter.append('feDropShadow')
      .attr('dx', 0).attr('dy', 3)
      .attr('stdDeviation', 5)
      .attr('flood-color', 'rgba(0,0,0,0.12)')

    const filterSel = defs.append('filter')
      .attr('id', 'card-shadow-selected')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '150%')
    filterSel.append('feDropShadow')
      .attr('dx', 0).attr('dy', 4)
      .attr('stdDeviation', 8)
      .attr('flood-color', 'rgba(217,119,6,0.35)')

    // ── Build hierarchy & layout ──────────────────────────────────────────
    const root = d3.hierarchy<TreeNode>(data, d => d.children)
    d3.tree<TreeNode>()
      .nodeSize([NS_W, NS_H])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.3)(root)

    const allNodes = root.descendants()
    const xs = allNodes.map(n => n.x!)
    const tx = W / 2 - (Math.min(...xs) + Math.max(...xs)) / 2
    const ty = 80

    // ── Root SVG group ────────────────────────────────────────────────────
    const g = svg.append('g').attr('transform', `translate(${tx},${ty})`)

    // ── Zoom ──────────────────────────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 3])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    zoomRef.current = zoom
    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty))

    type HNode = d3.HierarchyPointNode<TreeNode>

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
      const px   = parent.x
      const topY = parent.y + CH / 2 + 4
      const botY = children[0].y - CH / 2 - 4
      const midY = topY + (botY - topY) * 0.5

      connLayer.append('line')
        .attr('x1', px).attr('y1', topY)
        .attr('x2', px).attr('y2', midY)
        .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')

      if (children.length > 1) {
        const minX = Math.min(...children.map(c => c.x))
        const maxX = Math.max(...children.map(c => c.x))
        connLayer.append('line')
          .attr('x1', minX).attr('y1', midY)
          .attr('x2', maxX).attr('y2', midY)
          .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')
      }

      children.forEach(child => {
        connLayer.append('line')
          .attr('x1', child.x).attr('y1', midY)
          .attr('x2', child.x).attr('y2', botY)
          .attr('stroke', CONN).attr('stroke-width', C_W).attr('stroke-linecap', 'round')
      })
    })

    // ── Card renderer (portrait, MyHeritage-style) ─────────────────────────
    // ox = left edge of card relative to node x; oy = card top = -CH/2
    function renderCard(el: SVGGElement, person: TreeNode, ox: number, isSelected: boolean) {
      const g        = d3.select(el)
      const isMale   = person.gender === 'MALE'
      const alive    = person.isAlive

      const bg      = alive ? (isMale ? MALE_BG     : FEMALE_BG)     : DEAD_BG
      const border  = alive ? (isMale ? MALE_BORDER  : FEMALE_BORDER) : DEAD_BORDER
      const accent  = alive ? (isMale ? MALE_ACCENT  : FEMALE_ACCENT) : DEAD_ACCENT
      const avBg    = alive ? (isMale ? MALE_AV_BG   : FEMALE_AV_BG)  : DEAD_AV_BG
      const avFg    = alive ? (isMale ? MALE_AV_FG   : FEMALE_AV_FG)  : DEAD_AV_FG
      const textClr = alive ? (isMale ? MALE_TEXT    : FEMALE_TEXT)   : DEAD_TEXT

      const rawName  = language === 'ar' ? (person.nameArabic || person.name) : person.name
      const name     = language === 'ar' ? tatweelName(rawName || '', 1) : (rawName || '')

      // Card shadow
      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2)
        .attr('width', CW).attr('height', CH).attr('rx', CR)
        .attr('fill', bg)
        .attr('stroke', isSelected ? '#d97706' : border)
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('filter', isSelected ? 'url(#card-shadow-selected)' : 'url(#card-shadow)')

      // Top accent bar (full-width, rounded top)
      g.append('rect')
        .attr('x', ox).attr('y', -CH / 2)
        .attr('width', CW).attr('height', 7).attr('rx', CR)
        .attr('fill', accent)

      // Avatar circle (centered at top half)
      const avCY = -CH / 2 + 22 + AVR
      const avCX = ox + CW / 2
      g.append('circle')
        .attr('cx', avCX).attr('cy', avCY).attr('r', AVR + 3)
        .attr('fill', 'white').attr('stroke', border).attr('stroke-width', 2)
      g.append('circle')
        .attr('cx', avCX).attr('cy', avCY).attr('r', AVR)
        .attr('fill', avBg)

      // Photo in circle when available (no initial letter)
      if (person.photo) {
        const clipId = `avatar-clip-${(person as any).postgresId || person.id}-${ox}-${avCX}`
        g.append('defs')
          .append('clipPath').attr('id', clipId)
          .append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', AVR)
        g.append('image')
          .attr('href', person.photo)
          .attr('x', avCX - AVR).attr('y', avCY - AVR)
          .attr('width', AVR * 2).attr('height', AVR * 2)
          .attr('clip-path', `url(#${clipId})`)
          .attr('preserveAspectRatio', 'xMidYMid slice')
      }

      // Name (centered, below avatar)
      const nameY = avCY + AVR + 18
      const maxChr = Math.max(6, Math.floor(CW / 8.5))
      g.append('text')
        .attr('x', avCX).attr('y', nameY)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif")
        .attr('fill', textClr)
        .text(clip(name || 'مجهول', maxChr))

      // Dates row
      const dateStr = [
        person.birthYear ? `${person.birthYear}م` : '',
        !alive && person.deathYear ? `† ${person.deathYear}` : '',
      ].filter(Boolean).join('  ')
      if (dateStr) {
        g.append('text')
          .attr('x', avCX).attr('y', nameY + 18)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10.5).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#64748b')
          .text(dateStr)
      }

      // Tribe row
      if (person.tribe) {
        g.append('text')
          .attr('x', avCX).attr('y', nameY + (dateStr ? 34 : 18))
          .attr('text-anchor', 'middle')
          .attr('font-size', 9.5).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#92400e')
          .text(clip(person.tribe, maxChr + 2))
      }
    }

    // ── Node groups ────────────────────────────────────────────────────────
    const nodeGs = g.append('g').attr('class', 'nodes-layer')
      .selectAll<SVGGElement, HNode>('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    // ── Draw cards ────────────────────────────────────────────────────────
    nodeGs.each(function(d) {
      const spouse    = d.data.spouses?.[0]
      const hasSpouse = !!spouse
      const mainOX    = hasSpouse ? -(CW + SP_GAP / 2) : -CW / 2

      renderCard(this, d.data, mainOX, d.data.id === selectedId)

      if (hasSpouse && spouse) {
        const spOX = mainOX + CW + SP_GAP

        renderCard(this, spouse, spOX, spouse.id === selectedId)

        // Marriage connector with heart icon
        const gSel  = d3.select(this)
        const linkX = mainOX + CW
        const linkW = SP_GAP
        const midX  = linkX + linkW / 2

        // Horizontal dash
        gSel.append('line')
          .attr('x1', linkX).attr('y1', 0)
          .attr('x2', spOX) .attr('y2', 0)
          .attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,2')

        // Heart badge
        gSel.append('circle')
          .attr('cx', midX).attr('cy', 0).attr('r', 9)
          .attr('fill', '#fef3c7').attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
        gSel.append('text')
          .attr('x', midX).attr('y', 4.5)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10).attr('fill', '#d97706')
          .text('♥')

        // Invisible click target for spouse card
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

      // Add-relative button (bottom center, visible on hover)
      if (!readOnly) {
        const btnY = CH / 2 + 20
        const btn  = d3.select(this).append('g')
          .attr('class', 'add-btn')
          .attr('transform', `translate(0,${btnY})`)
          .style('opacity', 0)
          .style('cursor', 'pointer')
          .on('click', ev => { ev.stopPropagation(); onNodeAdd?.(d.data) })

        btn.append('circle')
          .attr('r', 15)
          .attr('fill', '#d4922d').attr('stroke', 'white').attr('stroke-width', 2.5)
          .attr('filter', 'url(#card-shadow)')
        btn.append('text')
          .attr('text-anchor', 'middle').attr('y', 6)
          .attr('font-size', 19).attr('font-weight', '700')
          .attr('fill', 'white')
          .text('+')
      }
    })

    // ── Hover events ───────────────────────────────────────────────────────
    nodeGs
      .on('mouseenter.btn', function() {
        d3.select(this).select('.add-btn')
          .transition().duration(150).style('opacity', 1)
      })
      .on('mouseleave.btn', function() {
        d3.select(this).select('.add-btn')
          .transition().duration(150).style('opacity', 0)
      })
      .on('mouseenter', (ev, d) => {
        if (hideTooltipRef.current) {
          clearTimeout(hideTooltipRef.current)
          hideTooltipRef.current = null
        }
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, node: d.data })
      })
      .on('mouseleave', () => {
        hideTooltipRef.current = setTimeout(() => setTooltip(null), TOOLTIP_HIDE_DELAY_MS)
      })
      .on('click', (ev, d) => {
        ev.stopPropagation()
        setSelectedId(d.data.id)
        onNodeClick?.(d.data)
      })

    svg.on('click', () => { setSelectedId(null); setTooltip(null) })
  }, [data, selectedId, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree])

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
  function resetView() {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(320)
      .call(zoomRef.current.transform, d3.zoomIdentity)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none tree-canvas-bg"
    >
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

      {/* ── Tooltip (MyHeritage-style: view subtree for person) ────────────── */}
      {tooltip && (
        <div
          className="absolute z-30 bg-white rounded-2xl shadow-2xl border border-sand-100 px-4 py-3.5 min-w-[200px] animate-fade-in pointer-events-auto"
          style={{ left: tooltip.x + 18, top: tooltip.y + 14, maxWidth: 280 }}
          onMouseEnter={() => {
            if (hideTooltipRef.current) {
              clearTimeout(hideTooltipRef.current)
              hideTooltipRef.current = null
            }
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <p className="text-sm text-khartoum-700 leading-snug mb-3" dir="rtl">
            {language === 'ar'
              ? `إضغط لعرض فرع الشجره التابع ل ${tatweelName(tooltip.node.nameArabic || tooltip.node.name || '', 2)}`
              : `Click to view the family tree branch belonging to ${tooltip.node.name || 'this person'}`}
          </p>
          {onViewSubtree && (
            <button
              type="button"
              onClick={() => {
                onViewSubtree(tooltip.node)
                setTooltip(null)
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-nile-100 hover:bg-nile-200 text-nile-800 font-medium text-sm transition-colors"
            >
              <TreePine className="w-4 h-4" />
              {language === 'ar' ? 'عرض فرع الشجرة' : 'View tree branch'}
            </button>
          )}
        </div>
      )}

      {/* ── Zoom controls (hidden during PDF export) ──────────────────────── */}
      <div
        className="tree-zoom-controls absolute bottom-6 right-5 flex flex-col gap-1.5"
        dir="ltr"
      >
        {([
          { label: '+', fn: () => zoomBy(1.3),  title: 'تكبير' },
          { label: '−', fn: () => zoomBy(0.77), title: 'تصغير' },
          { label: '⌂', fn: resetView,           title: 'إعادة ضبط' },
        ] as const).map(b => (
          <button
            key={b.label}
            onClick={b.fn}
            title={b.title}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-sm border border-sand-200 shadow-md flex items-center justify-center text-khartoum-600 hover:bg-white hover:shadow-lg font-bold text-base transition-all"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Legend (hidden during PDF export) ────────────────────────────── */}
      <div
        className="tree-legend absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-sand-100 shadow-md space-y-1.5"
        dir="rtl"
      >
        {([
          { color: MALE_ACCENT,   label: 'ذكر'   },
          { color: FEMALE_ACCENT, label: 'أنثى'  },
          { color: DEAD_ACCENT,   label: 'متوفى' },
          { color: '#f59e0b',     label: 'زواج'  },
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
