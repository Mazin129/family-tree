'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'
import { tatweelName } from '@/lib/utils/arabic'

interface FamilyTreeCanvasProps {
  data:            TreeNode
  onNodeClick?:    (node: TreeNode) => void
  onNodeAdd?:      (node: TreeNode) => void
  onViewSubtree?:  (node: TreeNode) => void
  language?:       'ar' | 'en'
  readOnly?:       boolean
  layout?:         'vertical' | 'horizontal' | 'centeredClassic'
  enableWifeBranch?: boolean
}

// ── Card dimensions ──────────────────────────────────────────────────────────
const CW  = 150
const CH  = 56
const CR  = 10
const AVR = 16

// ── Couple (MyHeritage style: husband + wife side by side) ──────────────────
const COUPLE_GAP  = 8
const COUPLE_W    = CW * 2 + COUPLE_GAP

// ── Spacing ──────────────────────────────────────────────────────────────────
const H_GAP  = 36
const GEN_GAP = 90

const NS_W = COUPLE_W + H_GAP
const NS_H = CH + GEN_GAP

// ── Connector lines ─────────────────────────────────────────────────────────
const CONN  = '#b0a090'
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
  enableWifeBranch = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const initialFitDone = useRef(false)
  const gRef         = useRef<SVGGElement | null>(null)
  const centerIdRef  = useRef<string | null>(null)

  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [zoomLevel,   setZoomLevel]   = useState(1)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const prevLayoutRef = useRef(layout)
  const filteredData = useMemo(() => data, [data])

  if (prevLayoutRef.current !== layout) {
    initialFitDone.current = false
    prevLayoutRef.current = layout
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DRAW
  // ═══════════════════════════════════════════════════════════════════════════
  const draw = useCallback(() => {
    if (!svgRef.current || !filteredData) return
    try {
      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const W = svgRef.current.clientWidth  || 960
      const H = svgRef.current.clientHeight || 640

      // ── Defs ────────────────────────────────────────────────────────────
      const defs = svg.append('defs')
      const f1 = defs.append('filter').attr('id', 'card-shadow')
        .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '150%')
      f1.append('feDropShadow').attr('dx', 0).attr('dy', 1.5).attr('stdDeviation', 3).attr('flood-color', 'rgba(0,0,0,0.10)')
      const f2 = defs.append('filter').attr('id', 'card-shadow-sel')
        .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '150%')
      f2.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 5).attr('flood-color', 'rgba(217,119,6,0.28)')

      // ── Hierarchy (collapsed nodes hide their children) ────────────────
      const root = d3.hierarchy<ExtTreeNode>(
        filteredData as ExtTreeNode,
        d => {
          const kids = d.children as ExtTreeNode[] | undefined
          if (!kids || kids.length === 0) return undefined
          if (collapsedIds.has(d.id)) {
            d._collapsed = true
            d._childCount = kids.length
            return undefined
          }
          d._collapsed = false
          d._childCount = kids.length
          return kids
        },
      )

      type HNode = d3.HierarchyPointNode<ExtTreeNode>

      const hasSpouse = (n: HNode) => (n.data.spouses?.length ?? 0) > 0

      // Half-width of a node's visual bounding box (couple or single)
      const halfW = (n: HNode) => hasSpouse(n) ? COUPLE_W / 2 : CW / 2

      // ── Layout ──────────────────────────────────────────────────────────
      if (layout === 'centeredClassic') {
        const X_GAP = COUPLE_W + H_GAP + 40
        const MIN_Y_GAP = CH + 28
        const V_CHAIN_GAP = CH + GEN_GAP

        function nodeYExtent(node: HNode): number {
          let ext = MIN_Y_GAP
          if (hasSpouse(node)) {
            const spouse = node.data.spouses![0] as ExtTreeNode
            const pCount = (spouse.parents?.length ?? 0)
            const sCount = (spouse.siblings?.length ?? 0)
            if (pCount > 0 || sCount > 0) {
              let bc = 0
              for (const pp of (spouse.parents ?? []) as ExtTreeNode[]) {
                bc += 1 + (pp.spouses?.length ?? 0)
              }
              ext = Math.max(ext, CH + 24 + (bc * (CH + 8)) / 2 + sCount * (CH + 10) + 30)
            }
          }
          return Math.max(ext, MIN_Y_GAP)
        }

        const allFlat = root.descendants() as HNode[]
        let centerNode: HNode | null = centerIdRef.current
          ? allFlat.find(n => n.data.id === centerIdRef.current) ?? null
          : null

        if (!centerNode) {
          let c = root as unknown as HNode
          while (c.children && c.children.length === 1) c = c.children[0] as HNode
          centerNode = c
        }
        centerIdRef.current = centerNode.data.id

        const ancestorChain: HNode[] = []
        let pp = centerNode.parent as HNode | null
        while (pp) { ancestorChain.unshift(pp); pp = pp.parent as HNode | null }

        centerNode.x = 0
        centerNode.y = 0

        for (let i = ancestorChain.length - 1; i >= 0; i--) {
          ancestorChain[i].x = 0
          ancestorChain[i].y = -(ancestorChain.length - i) * V_CHAIN_GAP
        }

        // Layout each ancestor's OTHER children (siblings of the path node)
        for (let i = 0; i < ancestorChain.length; i++) {
          const anc = ancestorChain[i]
          const pathChild = i < ancestorChain.length - 1 ? ancestorChain[i + 1] : centerNode
          const otherKids = ((anc.children || []) as HNode[]).filter(c => c !== pathChild)

          if (otherKids.length > 0) {
            const leftKids = otherKids.filter((_, idx) => idx % 2 === 0)
            const rightKids = otherKids.filter((_, idx) => idx % 2 === 1)

            let lx = -X_GAP
            leftKids.forEach(k => { k.x = lx; k.y = anc.y; lx -= X_GAP; layoutDescendants(k, -1) })
            let rx = X_GAP
            rightKids.forEach(k => { k.x = rx; k.y = anc.y; rx += X_GAP; layoutDescendants(k, 1) })
          }
        }

        const directChildren = (centerNode.children || []) as HNode[]
        const mid = Math.floor(directChildren.length / 2)
        const leftChildren  = directChildren.slice(mid)
        const rightChildren = directChildren.slice(0, mid)

        function layoutSubtree(node: HNode, depth: number, side: -1 | 1, yStart: number): number {
          node.x = side * depth * X_GAP
          const kids = (node.children || []) as HNode[]
          if (kids.length === 0) { node.y = yStart; return yStart + nodeYExtent(node) }
          let nextY = yStart
          for (const child of kids) nextY = layoutSubtree(child, depth + 1, side, nextY)
          node.y = (kids[0].y + kids[kids.length - 1].y) / 2
          return nextY
        }

        function layoutDescendants(node: HNode, side: -1 | 1) {
          const kids = (node.children || []) as HNode[]
          if (kids.length === 0) return
          let y = node.y + V_CHAIN_GAP
          kids.forEach(k => {
            k.x = node.x + side * X_GAP
            k.y = y
            y += nodeYExtent(k)
            layoutDescendants(k, side)
          })
          const midY = (kids[0].y + kids[kids.length - 1].y) / 2
          const shift = node.y + V_CHAIN_GAP / 2 - midY
          kids.forEach(k => shiftSubtree(k, shift))
        }

        function shiftSubtree(node: HNode, dy: number) {
          node.y += dy
          for (const c of (node.children || []) as HNode[]) shiftSubtree(c, dy)
        }

        let leftNextY = 0
        for (const child of leftChildren) leftNextY = layoutSubtree(child, 1, -1, leftNextY)
        if (leftChildren.length) {
          const ls = -(leftNextY - MIN_Y_GAP) / 2
          for (const child of leftChildren) shiftSubtree(child, ls)
        }

        let rightNextY = 0
        for (const child of rightChildren) rightNextY = layoutSubtree(child, 1, 1, rightNextY)
        if (rightChildren.length) {
          const rs = -(rightNextY - MIN_Y_GAP) / 2
          for (const child of rightChildren) shiftSubtree(child, rs)
        }

      } else {
        d3.tree<ExtTreeNode>()
          .nodeSize([NS_W, NS_H])
          .separation((a, b) => a.parent === b.parent ? 1.0 : 1.25)(root)

        if (layout === 'horizontal') {
          (root as any).each((n: HNode) => { const ox = n.x; n.x = n.y; n.y = ox })
        }
      }

      // ── Computed bounds ─────────────────────────────────────────────────
      const allNodes = root.descendants() as HNode[]
      const xs = allNodes.map(n => n.x!)
      const ys = allNodes.map(n => n.y!)
      const treeW = (Math.max(...xs) - Math.min(...xs)) + NS_W * 2
      const treeH = (Math.max(...ys) - Math.min(...ys)) + NS_H * 2

      // ── Root group ──────────────────────────────────────────────────────
      const g = svg.append('g')
      gRef.current = g.node()

      // ── Zoom ────────────────────────────────────────────────────────────
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
        const scale = Math.max(Math.min(scaleX, scaleY, 1.2), 0.3)
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

      // ══════════════════════════════════════════════════════════════════════
      //  CONNECTORS
      // ══════════════════════════════════════════════════════════════════════
      const connLayer = g.append('g').attr('class', 'conn-layer')
      const byParent = new Map<HNode, HNode[]>()
      root.links().forEach(({ source, target }) => {
        const s = source as HNode, t = target as HNode
        if (!byParent.has(s)) byParent.set(s, [])
        byParent.get(s)!.push(t)
      })

      if (layout === 'centeredClassic') {
        function drawHConn(parent: HNode, kids: HNode[], side: -1 | 1) {
          if (kids.length === 0) return
          const edgeX = parent.x + side * (halfW(parent) + 6)
          const gap = Math.abs(kids[0].x - parent.x) - halfW(parent) - halfW(kids[0])
          const midX = edgeX + side * (gap > 0 ? gap / 2 : 20)

          connLayer.append('line')
            .attr('x1', edgeX).attr('y1', parent.y)
            .attr('x2', midX).attr('y2', parent.y)
            .attr('stroke', CONN).attr('stroke-width', C_W)

          if (kids.length > 1) {
            connLayer.append('line')
              .attr('x1', midX).attr('y1', Math.min(...kids.map(c => c.y)))
              .attr('x2', midX).attr('y2', Math.max(...kids.map(c => c.y)))
              .attr('stroke', CONN).attr('stroke-width', C_W)
          } else {
            connLayer.append('line')
              .attr('x1', midX).attr('y1', parent.y)
              .attr('x2', midX).attr('y2', kids[0].y)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          }

          kids.forEach(child => {
            const childEdge = child.x - side * (halfW(child) + 6)
            connLayer.append('line')
              .attr('x1', midX).attr('y1', child.y)
              .attr('x2', childEdge).attr('y2', child.y)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          })
        }

        byParent.forEach((children, parent) => {
          const vert  = children.filter(c => c.x === parent.x)
          const left  = children.filter(c => c.x < parent.x)
          const right = children.filter(c => c.x > parent.x)

          vert.forEach(child => {
            connLayer.append('line')
              .attr('x1', parent.x).attr('y1', parent.y + CH / 2 + 4)
              .attr('x2', child.x).attr('y2', child.y - CH / 2 - 4)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          })

          if (left.length > 0)  drawHConn(parent, left, -1)
          if (right.length > 0) drawHConn(parent, right, 1)
        })
      } else {
        // Vertical / horizontal: orthogonal L-connectors
        byParent.forEach((children, parent) => {
          const px = parent.x
          const topY = parent.y + CH / 2 + 4
          const botY = children[0].y - CH / 2 - 4
          const midY = topY + (botY - topY) * 0.5

          connLayer.append('line')
            .attr('x1', px).attr('y1', topY)
            .attr('x2', px).attr('y2', midY)
            .attr('stroke', CONN).attr('stroke-width', C_W)

          if (children.length > 1) {
            const minCX = Math.min(...children.map(c => c.x))
            const maxCX = Math.max(...children.map(c => c.x))
            connLayer.append('line')
              .attr('x1', minCX).attr('y1', midY)
              .attr('x2', maxCX).attr('y2', midY)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          }

          children.forEach(child => {
            connLayer.append('line')
              .attr('x1', child.x).attr('y1', midY)
              .attr('x2', child.x).attr('y2', botY)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          })
        })
      }

      // ══════════════════════════════════════════════════════════════════════
      //  HELPERS
      // ══════════════════════════════════════════════════════════════════════
      function pal(p: ExtTreeNode) {
        const m = p.gender === 'MALE'
        return {
          bg:     m ? MALE_BG     : FEMALE_BG,
          border: m ? MALE_BORDER : FEMALE_BORDER,
          avBg:   m ? MALE_AV_BG  : FEMALE_AV_BG,
          text:   m ? MALE_TEXT   : FEMALE_TEXT,
          accent: p.isAlive ? (m ? MALE_ACCENT : FEMALE_ACCENT) : DEAD_ACCENT,
        }
      }

      function getName(p: ExtTreeNode) {
        return (language === 'ar' ? (p.nameArabic || p.name) : p.name) || ''
      }

      // ── Draw a single card (no spouse logic) ─────────────────────────────
      function drawSingleCard(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        person: ExtTreeNode,
        isSel: boolean,
      ) {
        const c = pal(person)
        const name = getName(person)
        const ox = -CW / 2

        g.append('rect')
          .attr('x', ox).attr('y', -CH / 2).attr('width', CW).attr('height', CH).attr('rx', CR)
          .attr('fill', c.bg).attr('stroke', isSel ? '#d97706' : c.border)
          .attr('stroke-width', isSel ? 2 : 1.2)
          .attr('filter', isSel ? 'url(#card-shadow-sel)' : 'url(#card-shadow)')

        g.append('rect')
          .attr('x', ox).attr('y', -CH / 2).attr('width', 4).attr('height', CH)
          .attr('rx', 2).attr('fill', c.accent)

        const avCX = ox + 26
        g.append('circle').attr('cx', avCX).attr('cy', 0).attr('r', AVR)
          .attr('fill', c.avBg).attr('stroke', c.border).attr('stroke-width', 1)

        if (person.photo) {
          const cid = `ac-${person.id}`
          g.append('defs').append('clipPath').attr('id', cid)
            .append('circle').attr('cx', avCX).attr('cy', 0).attr('r', AVR)
          g.append('image').attr('href', person.photo)
            .attr('x', avCX - AVR).attr('y', -AVR)
            .attr('width', AVR * 2).attr('height', AVR * 2)
            .attr('clip-path', `url(#${cid})`).attr('preserveAspectRatio', 'xMidYMid slice')
        } else {
          const headR = AVR * 0.52
          const headCY = -3
          g.append('rect')
            .attr('x', avCX - AVR * 0.75).attr('y', headCY + headR * 0.4)
            .attr('width', AVR * 1.5).attr('height', AVR * 1.3)
            .attr('rx', AVR * 0.45).attr('fill', c.accent).attr('opacity', 0.16)
          g.append('circle').attr('cx', avCX).attr('cy', headCY).attr('r', headR)
            .attr('fill', '#f9fafb').attr('stroke', c.border).attr('stroke-width', 0.7)
          g.append('circle').attr('cx', avCX).attr('cy', headCY + 0.8).attr('r', headR * 0.6)
            .attr('fill', person.gender === 'MALE' ? '#dbeafe' : '#fce7f3').attr('opacity', 0.9)
        }

        const textX = ox + CW / 2
        g.append('text').attr('x', textX).attr('y', -2)
          .attr('text-anchor', 'middle').attr('font-size', 11.5).attr('font-weight', '700')
          .attr('font-family', "'Cairo','Tajawal',sans-serif").attr('fill', c.text)
          .text(clip(name || 'مجهول', 16))

        const meta: string[] = []
        if (person.tribe) meta.push(person.tribe)
        if (person.birthYear) meta.push(`${person.birthYear}`)
        if (person.deathYear) meta.push(`† ${person.deathYear}`)
        if (meta.length) {
          g.append('text').attr('x', textX).attr('y', 13)
            .attr('text-anchor', 'middle').attr('font-size', 9).attr('font-family', "'Cairo',sans-serif")
            .attr('fill', '#64748b')
            .text(clip(meta.join(' · '), 22))
        }
      }

      // ── Recursive wife-branch renderer ───────────────────────────────────
      const GEN_X_STEP = CW + 60

      function renderWifeBranch(
        container: d3.Selection<SVGGElement, unknown, null, undefined>,
        ancestors: ExtTreeNode[],
        siblings: ExtTreeNode[],
        originX: number,
        originY: number,
      ) {
        if (ancestors.length === 0 && siblings.length === 0) return

        const cardCX = originX + GEN_X_STEP / 2 + CW / 2
        const allCards: ExtTreeNode[] = []
        for (const a of ancestors) {
          allCards.push(a)
          for (const sp of (a.spouses ?? []) as ExtTreeNode[])
            if (!allCards.some(x => x.id === sp.id)) allCards.push(sp)
        }

        container.append('line')
          .attr('x1', originX).attr('y1', originY)
          .attr('x2', cardCX - CW / 2 - 4).attr('y2', originY)
          .attr('stroke', CONN).attr('stroke-width', C_W)

        let yPos = originY - ((allCards.length - 1) * (CH + 8)) / 2
        allCards.forEach(a => {
          const isSel = a.id === selectedId
          const pg = container.append('g')
            .attr('transform', `translate(${cardCX},${yPos})`).style('cursor', 'pointer')
          drawSingleCard(pg, a, isSel)
          pg.on('click', (ev) => { ev.stopPropagation(); setSelectedId(a.id); onNodeClick?.(a) })
            .on('dblclick', (ev) => { ev.stopPropagation(); onViewSubtree?.(a) })

          const pP = (a.parents ?? []) as ExtTreeNode[]
          const pS = (a.siblings ?? []) as ExtTreeNode[]
          if (pP.length > 0 || pS.length > 0)
            renderWifeBranch(container, pP, pS, cardCX + CW / 2, yPos)

          yPos += CH + 8
        })

        if (siblings.length > 0) {
          const sibStartY = yPos + 8
          const spineX = cardCX - CW / 2 - 8
          container.append('line')
            .attr('x1', spineX).attr('y1', sibStartY)
            .attr('x2', spineX).attr('y2', sibStartY + (siblings.length - 1) * (CH + 10) + CH / 2)
            .attr('stroke', CONN).attr('stroke-width', C_W)
          container.append('line')
            .attr('x1', cardCX - CW / 2 - 4).attr('y1', originY)
            .attr('x2', spineX).attr('y2', sibStartY)
            .attr('stroke', CONN).attr('stroke-width', C_W)

          let sibY = sibStartY
          siblings.forEach(sib => {
            const isSel = (sib as ExtTreeNode).id === selectedId
            const sg = container.append('g')
              .attr('transform', `translate(${cardCX},${sibY})`).style('cursor', 'pointer')
            container.append('line')
              .attr('x1', spineX).attr('y1', sibY)
              .attr('x2', cardCX - CW / 2).attr('y2', sibY)
              .attr('stroke', CONN).attr('stroke-width', C_W)
            drawSingleCard(sg, sib as ExtTreeNode, isSel)
            sg.on('click', (ev) => { ev.stopPropagation(); setSelectedId((sib as ExtTreeNode).id); onNodeClick?.(sib) })
              .on('dblclick', (ev) => { ev.stopPropagation(); onViewSubtree?.(sib) })
            sibY += CH + 10
          })
        }
      }

      // ── Render couple unit (MyHeritage style: side by side) ──────────────
      function renderCoupleNode(
        el: SVGGElement,
        person: ExtTreeNode,
        isSel: boolean,
      ) {
        const g = d3.select(el)
        const showSpouse = (person.spouses?.length ?? 0) > 0
        const personShiftX = showSpouse ? -(CW + COUPLE_GAP) / 2 : 0

        // Person card (shifted left if couple)
        const personG = g.append('g')
          .attr('transform', `translate(${personShiftX},0)`)
        drawSingleCard(personG, person, isSel)

        if (showSpouse) {
          const spouse = person.spouses![0] as ExtTreeNode
          const spouseShiftX = (CW + COUPLE_GAP) / 2

          // Marriage line between husband and wife
          g.append('line')
            .attr('x1', personShiftX + CW / 2).attr('y1', 0)
            .attr('x2', spouseShiftX - CW / 2).attr('y2', 0)
            .attr('stroke', CONN).attr('stroke-width', 2)

          // Two small parallel lines (= symbol) for marriage
          const mx = (personShiftX + CW / 2 + spouseShiftX - CW / 2) / 2
          g.append('line')
            .attr('x1', mx - 3).attr('y1', -3)
            .attr('x2', mx + 3).attr('y2', -3)
            .attr('stroke', CONN).attr('stroke-width', 1.5)
          g.append('line')
            .attr('x1', mx - 3).attr('y1', 3)
            .attr('x2', mx + 3).attr('y2', 3)
            .attr('stroke', CONN).attr('stroke-width', 1.5)

          // Spouse card
          const spouseG = g.append('g')
            .attr('class', 'spouse-node')
            .attr('transform', `translate(${spouseShiftX},0)`)
            .style('cursor', 'pointer')
          drawSingleCard(spouseG, spouse, spouse.id === selectedId)

          spouseG
            .on('click', (ev) => { ev.stopPropagation(); setSelectedId(spouse.id); onNodeClick?.(spouse) })
            .on('dblclick', (ev) => { ev.stopPropagation(); onViewSubtree?.(spouse) })

          // Wife's ancestor branch (to the right of spouse card)
          if (enableWifeBranch) {
            const spouseParents  = (spouse.parents  ?? []) as ExtTreeNode[]
            const spouseSiblings = (spouse.siblings ?? []) as ExtTreeNode[]
            if (spouseParents.length > 0 || spouseSiblings.length > 0) {
              const branchG = spouseG.append('g').attr('class', 'spouse-branch')
              renderWifeBranch(branchG, spouseParents, spouseSiblings, CW / 2 + 12, 0)
            }
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      //  NODE GROUPS
      // ══════════════════════════════════════════════════════════════════════
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
        renderCoupleNode(this, person, isSel)

        const totalKids = person._childCount ?? (person.children?.length ?? 0)
        const isCollapsed = person._collapsed === true

        // ── Collapse / expand toggle (right side of card) ──────────────────
        if (totalKids > 0) {
          const showSpouse = (person.spouses?.length ?? 0) > 0
          const toggleX = showSpouse ? (CW + COUPLE_GAP) / 2 + CW / 2 + 14 : CW / 2 + 14
          const toggleG = d3.select(this).append('g')
            .attr('class', 'collapse-btn')
            .attr('transform', `translate(${toggleX},0)`)
            .style('cursor', 'pointer')
            .on('click', (ev) => {
              ev.stopPropagation()
              setCollapsedIds(prev => {
                const next = new Set(prev)
                if (next.has(person.id)) next.delete(person.id)
                else next.add(person.id)
                return next
              })
            })

          if (isCollapsed) {
            toggleG.append('rect')
              .attr('x', -22).attr('y', -10).attr('width', 44).attr('height', 20)
              .attr('rx', 10).attr('fill', '#f59e0b').attr('stroke', 'white').attr('stroke-width', 1.5)
            toggleG.append('text')
              .attr('text-anchor', 'middle').attr('y', 4.5)
              .attr('font-size', 10).attr('font-weight', '700').attr('fill', 'white')
              .text(`+${totalKids}`)
          } else {
            toggleG.append('circle')
              .attr('r', 9).attr('fill', '#e5e7eb').attr('stroke', '#9ca3af').attr('stroke-width', 1)
            toggleG.append('text')
              .attr('text-anchor', 'middle').attr('y', 3.5)
              .attr('font-size', 11).attr('font-weight', '600').attr('fill', '#6b7280')
              .text('−')
          }
        }

        // ── Add button ────────────────────────────────────────────────────
        if (!readOnly) {
          const addBtnY = CH / 2 + (totalKids > 0 ? 32 : 6)
          const addBtn = d3.select(this).append('g')
            .attr('class', 'add-btn')
            .attr('transform', `translate(0,${addBtnY})`)
            .style('opacity', 0).style('cursor', 'pointer')
            .on('click', (ev) => { ev.stopPropagation(); onNodeAdd?.(person) })

          addBtn.append('circle').attr('r', 10)
            .attr('fill', '#d4922d').attr('stroke', 'white').attr('stroke-width', 2)
          addBtn.append('text').attr('text-anchor', 'middle').attr('y', 4.5)
            .attr('font-size', 14).attr('font-weight', '700').attr('fill', 'white').text('+')
        }
      })

      nodeGs
        .on('mouseenter', function() {
          d3.select(this).select('.add-btn').transition().duration(150).style('opacity', 1)
        })
        .on('mouseleave', function() {
          d3.select(this).select('.add-btn').transition().duration(150).style('opacity', 0)
        })
        .on('click', (ev, d) => {
          ev.stopPropagation(); setSelectedId(d.data.id); onNodeClick?.(d.data)
        })
        .on('dblclick', (ev, d) => {
          ev.stopPropagation(); onViewSubtree?.(d.data)
        })

      svg.on('click', () => { setSelectedId(null) })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[FamilyTreeCanvas] draw error', err)
    }
  }, [filteredData, selectedId, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree, layout, enableWifeBranch, collapsedIds])

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
  function fitView() { initialFitDone.current = false; draw() }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none tree-canvas-bg">
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

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
