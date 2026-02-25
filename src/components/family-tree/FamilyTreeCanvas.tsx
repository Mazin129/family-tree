'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'

interface FamilyTreeCanvasProps {
  data: TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?:   (parentNode: TreeNode) => void
  language?:    'ar' | 'en'
  readOnly?:    boolean
}

const NODE_W  = 190
const NODE_H  = 100
const H_GAP   = 48
const V_GAP   = 90

export function FamilyTreeCanvas({
  data,
  onNodeClick,
  onNodeAdd,
  language  = 'ar',
  readOnly  = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip,    setTooltip]    = useState<{ x: number; y: number; node: TreeNode } | null>(null)

  const renderTree = useCallback(() => {
    if (!svgRef.current || !data) return
    const svg    = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = svgRef.current.clientWidth  || 960
    const H = svgRef.current.clientHeight || 640

    const g = svg.append('g').attr('class', 'tree-root')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    zoomRef.current = zoom
    svg.call(zoom)

    // Layout
    const root = d3.hierarchy<TreeNode>(data, d => d.children)
    d3.tree<TreeNode>()
      .nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
      .separation((a, b) => (a.parent === b.parent ? 1.3 : 1.7))(root)

    // Centre initially
    const nodes = root.descendants()
    const xs    = nodes.map(n => n.x!)
    const tx    = (W / 2) - ((Math.min(...xs) + Math.max(...xs)) / 2)
    const ty    = 70 - Math.min(...nodes.map(n => n.y!))
    g.attr('transform', `translate(${tx},${ty})`)
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty))

    // ── Links ──────────────────────────────────────────────────────────
    g.selectAll('.link')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'tree-link')
      .attr('d', d3.linkVertical<d3.HierarchyLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
        .x(d => d.x!).y(d => d.y!))

    // ── Nodes ──────────────────────────────────────────────────────────
    const nodeG = g.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedId(d.data.id)
        onNodeClick?.(d.data)
      })
      .on('mouseenter', (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d.data })
      })
      .on('mouseleave', () => setTooltip(null))

    // Card shadow (fake)
    nodeG.append('rect')
      .attr('x', -NODE_W / 2 + 3).attr('y', -NODE_H / 2 + 4)
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 14).attr('ry', 14)
      .attr('fill', 'rgba(0,0,0,0.06)')

    // Card background
    nodeG.append('rect')
      .attr('x', -NODE_W / 2).attr('y', -NODE_H / 2)
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 14).attr('ry', 14)
      .attr('fill', d => d.data.id === selectedId ? '#fef3e2' : 'white')
      .attr('stroke', d => {
        if (d.data.id === selectedId) return '#d4922d'
        return d.data.gender === 'MALE' ? '#bfdbfe' : '#fed7aa'
      })
      .attr('stroke-width', d => d.data.id === selectedId ? 2.5 : 1.5)

    // Gender accent bar (left edge)
    nodeG.append('rect')
      .attr('x', -NODE_W / 2).attr('y', -NODE_H / 2)
      .attr('width', 5).attr('height', NODE_H)
      .attr('rx', 14).attr('ry', 14)
      .attr('fill', d => {
        if (!d.data.isAlive) return '#a1a1aa'
        return d.data.gender === 'MALE' ? '#3b82f6' : '#f97316'
      })

    // Avatar circle
    nodeG.append('circle')
      .attr('cx', -NODE_W / 2 + 32).attr('cy', 0).attr('r', 24)
      .attr('fill', d => d.data.gender === 'MALE' ? '#dbeafe' : '#ffedd5')
      .attr('stroke', d => d.data.gender === 'MALE' ? '#93c5fd' : '#fdba74')
      .attr('stroke-width', 1.5)

    // Avatar initial
    nodeG.append('text')
      .attr('x', -NODE_W / 2 + 32).attr('y', 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', 18).attr('font-weight', '700')
      .attr('font-family', "'Cairo', sans-serif")
      .attr('fill', d => d.data.gender === 'MALE' ? '#1d4ed8' : '#c2410c')
      .text(d => {
        const name = language === 'ar' ? d.data.nameArabic || d.data.name : d.data.name
        return name?.charAt(0)?.toUpperCase() || '؟'
      })

    // Name
    nodeG.append('text')
      .attr('x', -NODE_W / 2 + 68).attr('y', -14)
      .attr('font-size', 12.5).attr('font-weight', '700')
      .attr('font-family', "'Cairo', sans-serif")
      .attr('fill', '#18181b')
      .text(d => {
        const name = language === 'ar' ? d.data.nameArabic || d.data.name : d.data.name
        return trunc(name || 'مجهول', 15)
      })

    // Sub-info line
    nodeG.append('text')
      .attr('x', -NODE_W / 2 + 68).attr('y', 4)
      .attr('font-size', 10.5)
      .attr('font-family', "'Cairo', sans-serif")
      .attr('fill', '#71717a')
      .text(d => {
        const parts: string[] = []
        if (d.data.birthYear) parts.push(String(d.data.birthYear))
        if (d.data.deathYear) parts.push(String(d.data.deathYear))
        return parts.join(' — ')
      })

    // Tribe badge
    nodeG.filter(d => !!d.data.tribe)
      .append('text')
      .attr('x', -NODE_W / 2 + 68).attr('y', 20)
      .attr('font-size', 9.5)
      .attr('font-family', "'Cairo', sans-serif")
      .attr('fill', '#92400e')
      .text(d => trunc(d.data.tribe || '', 18))

    // Deceased cross marker
    nodeG.filter(d => !d.data.isAlive)
      .append('text')
      .attr('x', NODE_W / 2 - 12).attr('y', -NODE_H / 2 + 16)
      .attr('font-size', 11).attr('fill', '#a1a1aa')
      .text('†')

    // Add-relative button (hover)
    if (!readOnly) {
      const addBtn = nodeG.append('g')
        .attr('class', 'add-btn')
        .attr('transform', `translate(0,${NODE_H / 2 + 14})`)
        .style('opacity', 0)
        .on('click', (event, d) => {
          event.stopPropagation()
          onNodeAdd?.(d.data)
        })

      addBtn.append('circle')
        .attr('r', 11)
        .attr('fill', '#d4922d')
        .attr('stroke', 'white')
        .attr('stroke-width', 2.5)

      addBtn.append('text')
        .attr('text-anchor', 'middle').attr('y', 5.5)
        .attr('font-size', 16).attr('fill', 'white').attr('font-weight', '700')
        .text('+')

      nodeG
        .on('mouseenter.btn', function() { d3.select(this).select('.add-btn').style('opacity', 1) })
        .on('mouseleave.btn', function() { d3.select(this).select('.add-btn').style('opacity', 0) })
    }

    svg.on('click', () => { setSelectedId(null); setTooltip(null) })
  }, [data, selectedId, language, readOnly, onNodeClick, onNodeAdd])

  useEffect(() => { renderTree() }, [renderTree])

  useEffect(() => {
    const ro = new ResizeObserver(() => renderTree())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [renderTree])

  function zoomBy(k: number) {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250)
      .call(zoomRef.current.scaleBy, k)
  }

  function resetZoom() {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(350)
      .call(zoomRef.current.transform, d3.zoomIdentity)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{
      background: 'radial-gradient(circle at 1px 1px, #e8dfc8 1px, transparent 0)',
      backgroundSize: '28px 28px',
      backgroundColor: '#f7f1e3',
    }}>
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-white rounded-2xl shadow-xl border border-sand-200 p-4 min-w-[180px] animate-fade-in"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14, maxWidth: 230 }}
        >
          <div className="font-bold text-khartoum-900 text-sm leading-snug">
            {language === 'ar' ? tooltip.node.nameArabic || tooltip.node.name : tooltip.node.name}
          </div>
          {tooltip.node.tribe && (
            <div className="text-xs text-sand-700 font-medium mt-1">قبيلة {tooltip.node.tribe}</div>
          )}
          {(tooltip.node.birthYear || tooltip.node.deathYear) && (
            <div className="text-xs text-khartoum-400 mt-1">
              {tooltip.node.birthYear}{tooltip.node.deathYear ? ` — ${tooltip.node.deathYear}` : ''}
            </div>
          )}
          {!tooltip.node.isAlive && (
            <div className="text-xs text-khartoum-400 mt-1 flex items-center gap-1">
              <span>†</span> رحل إلى رحمة الله
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-1.5">
        <button onClick={() => zoomBy(1.35)}  className="zoom-btn">＋</button>
        <button onClick={() => zoomBy(0.74)}  className="zoom-btn">－</button>
        <button onClick={resetZoom}            className="zoom-btn text-xs font-bold">⌂</button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 border border-sand-100 shadow-sm space-y-1.5">
        <LegendDot color="#3b82f6" label="ذكر" />
        <LegendDot color="#f97316" label="أنثى" />
        <LegendDot color="#a1a1aa" label="متوفى" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs text-khartoum-600">{label}</span>
    </div>
  )
}

function trunc(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
