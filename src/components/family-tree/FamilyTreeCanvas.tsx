'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { TreeNode, Gender } from '@/types'
import { cn } from '@/lib/utils/cn'

interface FamilyTreeCanvasProps {
  data: TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?: (parentNode: TreeNode) => void
  language?: 'ar' | 'en'
  readOnly?: boolean
}

const NODE_WIDTH  = 160
const NODE_HEIGHT = 90
const H_GAP       = 40
const V_GAP       = 80

export function FamilyTreeCanvas({
  data,
  onNodeClick,
  onNodeAdd,
  language = 'ar',
  readOnly = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip, setTooltip]       = useState<{ x: number; y: number; node: TreeNode } | null>(null)

  const renderTree = useCallback(() => {
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width  = svgRef.current.clientWidth  || 900
    const height = svgRef.current.clientHeight || 600

    // Main group with zoom/pan support
    const g = svg.append('g').attr('class', 'tree-root')

    // Zoom behaviour
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

    // Build D3 hierarchy
    const root = d3.hierarchy<TreeNode>(data, d => d.children)

    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([NODE_WIDTH + H_GAP, NODE_HEIGHT + V_GAP])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6))

    treeLayout(root)

    // Centre the tree initially
    const nodes = root.descendants()
    const xs = nodes.map(n => n.x!)
    const ys = nodes.map(n => n.y!)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)

    const initTranslateX = (width  / 2) - ((minX + maxX) / 2)
    const initTranslateY = 60 - minY

    g.attr('transform', `translate(${initTranslateX},${initTranslateY})`)
    svg.call(zoom.transform, d3.zoomIdentity.translate(initTranslateX, initTranslateY))

    // ── Links ─────────────────────────────────────────────────────────────
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'tree-link')
      .attr('d', d3.linkVertical<d3.HierarchyLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
        .x(d => d.x!)
        .y(d => d.y!)
      )

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodeGroup = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedId(d.data.id)
        onNodeClick?.(d.data)
      })
      .on('mouseenter', (event, d) => {
        const svgRect = svgRef.current!.getBoundingClientRect()
        const transform = d3.zoomTransform(svgRef.current!)
        const screenX = d.x! * transform.k + transform.x + svgRect.left
        const screenY = d.y! * transform.k + transform.y + svgRect.top
        setTooltip({ x: event.clientX - svgRect.left, y: event.clientY - svgRect.top, node: d.data })
      })
      .on('mouseleave', () => setTooltip(null))

    // Card background
    nodeGroup.append('rect')
      .attr('x', -NODE_WIDTH / 2)
      .attr('y', -NODE_HEIGHT / 2)
      .attr('width',  NODE_WIDTH)
      .attr('height', NODE_HEIGHT)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => d.data.id === selectedId ? '#faefd8' : 'white')
      .attr('stroke', d => {
        if (d.data.id === selectedId) return '#d4922d'
        return d.data.gender === 'MALE' ? '#bce1fd' : '#fba77733'
      })
      .attr('stroke-width', d => d.data.id === selectedId ? 2.5 : 1.5)
      .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))')

    // Gender indicator bar
    nodeGroup.append('rect')
      .attr('x', -NODE_WIDTH / 2)
      .attr('y', -NODE_HEIGHT / 2)
      .attr('width', 6)
      .attr('height', NODE_HEIGHT)
      .attr('rx', 12)
      .attr('fill', d => {
        if (!d.data.isAlive) return '#a1a1aa'
        return d.data.gender === 'MALE' ? '#1a75e8' : '#f1933f'
      })

    // Avatar circle
    nodeGroup.append('circle')
      .attr('cx', -NODE_WIDTH / 2 + 30)
      .attr('cy', 0)
      .attr('r', 22)
      .attr('fill', d => d.data.gender === 'MALE' ? '#dbeffe' : '#fad7ac')
      .attr('stroke', d => d.data.gender === 'MALE' ? '#8ecdfc' : '#f6ba77')
      .attr('stroke-width', 1.5)

    // Avatar initial
    nodeGroup.append('text')
      .attr('x', -NODE_WIDTH / 2 + 30)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', 16)
      .attr('font-weight', '600')
      .attr('fill', d => d.data.gender === 'MALE' ? '#155ed5' : '#b87424')
      .text(d => {
        const name = language === 'ar' ? d.data.nameArabic || d.data.name : d.data.name
        return name?.charAt(0)?.toUpperCase() || '?'
      })

    // Name text
    nodeGroup.append('text')
      .attr('x', -NODE_WIDTH / 2 + 62)
      .attr('y', -10)
      .attr('font-size', 12)
      .attr('font-weight', '600')
      .attr('fill', '#18181b')
      .attr('font-family', "'Cairo', sans-serif")
      .text(d => {
        const name = language === 'ar' ? d.data.nameArabic || d.data.name : d.data.name
        return truncate(name || 'مجهول', 14)
      })

    // Birth/Death year
    nodeGroup.append('text')
      .attr('x', -NODE_WIDTH / 2 + 62)
      .attr('y', 8)
      .attr('font-size', 10)
      .attr('fill', '#71717a')
      .text(d => {
        const parts = []
        if (d.data.birthYear) parts.push(d.data.birthYear)
        if (d.data.deathYear) parts.push(d.data.deathYear)
        return parts.join(' — ')
      })

    // Tribe badge
    nodeGroup.filter(d => !!d.data.tribe)
      .append('text')
      .attr('x', -NODE_WIDTH / 2 + 62)
      .attr('y', 24)
      .attr('font-size', 9)
      .attr('fill', '#8f5420')
      .text(d => truncate(d.data.tribe || '', 16))

    // Deceased marker
    nodeGroup.filter(d => !d.data.isAlive)
      .append('text')
      .attr('x', NODE_WIDTH / 2 - 10)
      .attr('y', -NODE_HEIGHT / 2 + 14)
      .attr('font-size', 10)
      .attr('fill', '#71717a')
      .text('†')

    // Add child button (if not read-only)
    if (!readOnly) {
      const addBtn = nodeGroup.append('g')
        .attr('class', 'add-btn')
        .attr('transform', `translate(0, ${NODE_HEIGHT / 2 + 12})`)
        .style('opacity', 0)
        .on('click', (event, d) => {
          event.stopPropagation()
          onNodeAdd?.(d.data)
        })

      addBtn.append('circle')
        .attr('r', 10)
        .attr('fill', '#d4922d')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)

      addBtn.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 5)
        .attr('font-size', 14)
        .attr('fill', 'white')
        .text('+')

      nodeGroup
        .on('mouseenter.btn', function() {
          d3.select(this).select('.add-btn').style('opacity', 1)
        })
        .on('mouseleave.btn', function() {
          d3.select(this).select('.add-btn').style('opacity', 0)
        })
    }

    // Click background to deselect
    svg.on('click', () => {
      setSelectedId(null)
      setTooltip(null)
    })
  }, [data, selectedId, language, readOnly, onNodeClick, onNodeAdd])

  useEffect(() => {
    renderTree()
  }, [renderTree])

  // Re-render on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => renderTree())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [renderTree])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gradient-desert rounded-2xl overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: 500 }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-white rounded-xl shadow-card border border-sand-200 p-3 pointer-events-none animate-fade-in"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10, maxWidth: 220 }}
        >
          <div className="font-semibold text-khartoum-900 text-sm">
            {language === 'ar' ? tooltip.node.nameArabic || tooltip.node.name : tooltip.node.name}
          </div>
          {tooltip.node.tribe && (
            <div className="text-xs text-khartoum-500 mt-0.5">{tooltip.node.tribe}</div>
          )}
          {(tooltip.node.birthYear || tooltip.node.deathYear) && (
            <div className="text-xs text-khartoum-400 mt-0.5">
              {tooltip.node.birthYear} {tooltip.node.deathYear ? `— ${tooltip.node.deathYear}` : ''}
            </div>
          )}
          {!tooltip.node.isAlive && (
            <div className="text-xs text-khartoum-400 mt-0.5">رحل إلى رحمة الله</div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <ZoomButton
          label="+"
          onClick={() => {
            if (!svgRef.current) return
            const svg = d3.select(svgRef.current)
            svg.transition().call(
              d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
              1.3
            )
          }}
        />
        <ZoomButton
          label="−"
          onClick={() => {
            if (!svgRef.current) return
            const svg = d3.select(svgRef.current)
            svg.transition().call(
              d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
              0.77
            )
          }}
        />
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 text-xs space-y-1 border border-sand-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-nile-400" />
          <span className="text-khartoum-600">ذكر</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-sahara-400" />
          <span className="text-khartoum-600">أنثى</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-khartoum-300" />
          <span className="text-khartoum-600">متوفى</span>
        </div>
      </div>
    </div>
  )
}

function ZoomButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 bg-white rounded-lg shadow-sm border border-sand-200 flex items-center justify-center text-khartoum-600 hover:bg-sand-50 font-bold text-lg"
    >
      {label}
    </button>
  )
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}
