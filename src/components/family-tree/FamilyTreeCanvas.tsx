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
  layout?:      'vertical' | 'horizontal' | 'centeredClassic'
}

// ── Card dimensions (single consistent size) ────────────────────────────────
const CW  = 160
const CH  = 64
const CR  = 12
const AVR = 18

// ── Spacing ──────────────────────────────────────────────────────────────────
const SP_GAP = 16
const H_GAP  = 40
const V_STR  = 120

const NS_W = CW * 2 + SP_GAP + H_GAP
const NS_H = V_STR

// ── Connector lines ─────────────────────────────────────────────────────────
const CONN  = '#b8a898'
const C_W   = 1.5

// ── Colours ──────────────────────────────────────────────────────────────────
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

// When a person is deceased, keep the normal gender colours for the card,
// but use a black accent strip (instead of blue/pink) to signal death.
const DEAD_ACCENT = '#111827'

interface ExtTreeNode extends TreeNode {
  _collapsed?: boolean
  _childCount?: number
}

export function FamilyTreeCanvas({
  data,
  onNodeClick,
  onNodeAdd,
  onViewSubtree,
  language = 'ar',
  readOnly = false,
  layout = 'vertical',
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const initialFitDone = useRef(false)
  const gRef         = useRef<SVGGElement | null>(null)

  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [zoomLevel,   setZoomLevel]   = useState(1)

  const filteredData = useMemo(() => data, [data])

  const draw = useCallback(() => {
    if (!svgRef.current || !filteredData) return
    try {
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
      const root = d3.hierarchy<ExtTreeNode>(
        filteredData as ExtTreeNode,
        d => d.children as ExtTreeNode[] | undefined,
      )

      type HNode = d3.HierarchyPointNode<ExtTreeNode>

      if (layout === 'centeredClassic') {
        // Classic centered layout:
        // - Root in the middle
        // - Descendants spread symmetrically to left and right by generation
        const levels = new Map<number, HNode[]>()
        ;(root as any).each((n: HNode) => {
          const d = n.depth || 0
          if (!levels.has(d)) levels.set(d, [])
          levels.get(d)!.push(n)
        })

        const baseYGap = NS_H * 0.9
        const baseXGap = NS_W * 0.9

        // Root at center
        const rootNode = root as unknown as HNode
        rootNode.x = 0
        rootNode.y = 0

        // For each generation, place nodes half to the left and half to the right
        ;[...levels.entries()]
          .filter(([d]) => d > 0)
          .sort(([a], [b]) => a - b)
          .forEach(([depth, nodes]) => {
            const genOffset = depth * baseXGap
            const sorted = nodes.slice().sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''))

            const mid = Math.ceil(sorted.length / 2)
            const left = sorted.slice(0, mid)
            const right = sorted.slice(mid)

            const placeSide = (items: HNode[], side: -1 | 1) => {
              if (items.length === 0) return
              const total = items.length
              const span = (total - 1) * baseYGap
              const startY = -span / 2
              items.forEach((n, i) => {
                n.x = side * genOffset
                n.y = startY + i * baseYGap
              })
            }

            placeSide(left, -1)
            placeSide(right, 1)
          })
      } else {
        // Original vertical layout (also used as base for horizontal)
        d3.tree<ExtTreeNode>()
          .nodeSize([NS_W, NS_H])
          .separation((a, b) => a.parent === b.parent ? 1 : 1.2)(root)

        if (layout === 'horizontal') {
          // Rotate layout: root on the left, branches to the right
          (root as any).each((n: HNode) => {
            const ox = n.x
            n.x = n.y
            n.y = ox
          })
        }
      }

      const allNodes = root.descendants() as HNode[]
      const xs = allNodes.map(n => n.x!)
      const ys = allNodes.map(n => n.y!)
      const treeW = (Math.max(...xs) - Math.min(...xs)) + NS_W
      const treeH = (Math.max(...ys) - Math.min(...ys)) + NS_H

      // ── Root group (zoom transforms this, not individual nodes) ──────────
      const g = svg.append('g')
      gRef.current = g.node()

      // ── Zoom (only transforms the group — never redraws) ────────────────
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.02, 5])
        .on('zoom', (e) => {
          g.attr('transform', e.transform.toString())
          transformRef.current = e.transform
          setZoomLevel(Math.round(e.transform.k * 100))
        })
      zoomRef.current = zoom
      svg.call(zoom)

      if (!initialFitDone.current) {
        const padX = 80, padY = 60
        const scaleX = W / (treeW + padX * 2)
        const scaleY = H / (treeH + padY * 2)
        const scale = Math.max(Math.min(scaleX, scaleY, 1.2), 0.35)
        const rootX = allNodes[0].x!
        const rootY = allNodes[0].y!
        const initT = d3.zoomIdentity
          .translate(W / 2, padY + 40)
          .scale(scale)
          .translate(-rootX, -rootY)
        svg.call(zoom.transform, initT)
        transformRef.current = initT
        initialFitDone.current = true
      } else {
        svg.call(zoom.transform, transformRef.current)
      }

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
      const base = {
        bg:     m ? MALE_BG     : FEMALE_BG,
        border: m ? MALE_BORDER : FEMALE_BORDER,
        avBg:   m ? MALE_AV_BG  : FEMALE_AV_BG,
        text:   m ? MALE_TEXT   : FEMALE_TEXT,
      }
      const accent = p.isAlive ? (m ? MALE_ACCENT : FEMALE_ACCENT) : DEAD_ACCENT
      return { ...base, accent }
    }

    function getName(p: ExtTreeNode) {
      const raw = language === 'ar' ? (p.nameArabic || p.name) : p.name
      // Show the clean name without decorative tatweel / stretching
      return raw || ''
    }

    // ── Render card (always the same size — stable) ─────────────────────
    function renderCard(
      el: SVGGElement,
      person: ExtTreeNode,
      isSel: boolean,
      opts?: { renderSpouses?: boolean },
    ) {
      const g = d3.select(el)
      const c = pal(person)
      const name = getName(person)
      const ox = -CW / 2
      const renderSpouses = opts?.renderSpouses ?? true

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
        const cid = `ac-${person.id}`
        g.append('defs').append('clipPath').attr('id', cid)
          .append('circle').attr('cx', avCX).attr('cy', avCY).attr('r', AVR)
        g.append('image').attr('href', person.photo)
          .attr('x', avCX - AVR).attr('y', avCY - AVR)
          .attr('width', AVR * 2).attr('height', AVR * 2)
          .attr('clip-path', `url(#${cid})`).attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        // Gender-specific silhouette avatar inside the circle (MyHeritage-style)
        const headR = AVR * 0.55
        const headCY = avCY - 4
        const bodyTop = headCY + headR * 0.4
        const bodyHeight = AVR * 1.4
        const bodyWidth = AVR * 1.6
        const bodyX = avCX - bodyWidth / 2

        // Body (torso / shoulders)
        g.append('rect')
          .attr('x', bodyX)
          .attr('y', bodyTop)
          .attr('width', bodyWidth)
          .attr('height', bodyHeight)
          .attr('rx', AVR * 0.5)
          .attr('fill', c.accent)
          .attr('opacity', 0.18)

        // Outer head
        g.append('circle')
          .attr('cx', avCX)
          .attr('cy', headCY)
          .attr('r', headR)
          .attr('fill', '#f9fafb')
          .attr('stroke', c.border)
          .attr('stroke-width', 0.8)

        // Inner face color hint (slightly different per gender)
        g.append('circle')
          .attr('cx', avCX)
          .attr('cy', headCY + 1)
          .attr('r', headR * 0.65)
          .attr('fill', person.gender === 'MALE' ? '#dbeafe' : '#fce7f3')
          .attr('opacity', 0.95)
      }

      // Center the main name text within the card
      const textX = ox + CW / 2
      g.append('text').attr('x', textX).attr('y', 0)
        .attr('text-anchor', 'middle').attr('font-size', 12.5).attr('font-weight', '700')
        .attr('font-family', "'Cairo', 'Tajawal', sans-serif").attr('fill', c.text)
        .text(clip(name || 'مجهول', 14))

      const meta: string[] = []
      if (person.tribe) meta.push(person.tribe)
      if (person.birthYear) meta.push(`${person.birthYear}`)
      if (meta.length) {
        g.append('text').attr('x', textX).attr('y', 16)
          .attr('text-anchor', 'middle').attr('font-size', 10).attr('font-family', "'Cairo', sans-serif")
          .attr('fill', '#64748b')
          .text(clip(meta.join(' · '), 20))
      }

      // ── Spouse as separate linked card (to the right) ─────────────────────
      if (renderSpouses && person.spouses && person.spouses.length > 0) {
        const primaryRightX = CW / 2
        const spouseCenterX = primaryRightX + SP_GAP + CW / 2

        // Connector line between spouses
        g.append('line')
          .attr('x1', primaryRightX)
          .attr('y1', 0)
          .attr('x2', spouseCenterX - CW / 2 + 4)
          .attr('y2', 0)
          .attr('stroke', CONN)
          .attr('stroke-width', C_W)

        const spouse = person.spouses[0] as ExtTreeNode
        const spouseG = g.append('g')
          .attr('class', 'spouse-node')
          .attr('transform', `translate(${spouseCenterX},0)`)
          .style('cursor', 'pointer')

        const spouseSelected = spouse.id === selectedId
        renderCard(spouseG.node() as SVGGElement, spouse, spouseSelected, { renderSpouses: false })

        // Interactions for spouse card
        spouseG
          .on('click', (ev) => {
            ev.stopPropagation()
            setSelectedId(spouse.id)
            onNodeClick?.(spouse)
          })
          .on('dblclick', (ev) => {
            ev.stopPropagation()
            onViewSubtree?.(spouse)
          })
      }
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
        renderCard(this, person, isSel)

        const hasKids = (person.children && person.children.length > 0)

        // ── Add button ────────────────────────────────────────────────────
        if (!readOnly) {
          const addBtnY = CH / 2 + (hasKids ? 28 : 8)
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
    } catch (err) {
      // Prevent D3 runtime errors from tearing down the whole dashboard
      // and surface them only in the console instead.
      // eslint-disable-next-line no-console
      console.error('[FamilyTreeCanvas] draw error', err)
    }
  }, [filteredData, selectedId, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree, layout])

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
        {zoomLevel}%
      </div>
    </div>
  )
}

function clip(s: string, max: number): string {
  const m = Math.max(3, Math.floor(max))
  return s.length > m ? s.slice(0, m - 1) + '…' : s
}
