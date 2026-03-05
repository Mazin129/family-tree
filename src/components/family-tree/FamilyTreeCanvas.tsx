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

// ── Card dimensions (single consistent size) ────────────────────────────────
const CW  = 160
const CH  = 64
const CR  = 12
const AVR = 18

// ── Spacing ──────────────────────────────────────────────────────────────────
const SP_GAP = 16
const H_GAP  = 40
// Increase vertical stride so stacked spouse cards have room
const V_STR  = 180

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
  enableWifeBranch = false,
}: FamilyTreeCanvasProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const initialFitDone = useRef(false)
  const gRef         = useRef<SVGGElement | null>(null)

  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [zoomLevel,   setZoomLevel]   = useState(1)

  const prevLayoutRef = useRef(layout)
  const filteredData = useMemo(() => data, [data])

  // Reset fit when layout changes so the view re-centers
  if (prevLayoutRef.current !== layout) {
    initialFitDone.current = false
    prevLayoutRef.current = layout
  }

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
        // Classic centered patriarch layout:
        //
        //           [great-grandfather]      ← ancestor chain (vertical)
        //                  |
        //             [grandfather]
        //                  |
        //              [مقبول]               ← branching node (CENTER)
        //             /        \
        //     LEFT side        RIGHT side    ← children split horizontally
        //      ↙    ↙            ↘    ↘
        //   subtrees              subtrees   ← expand further outward
        //
        // 1. Walk single-child path from root → place vertically above center
        // 2. First node with 2+ children = CENTER branching point
        // 3. First ceil(n/2) children → LEFT, rest → RIGHT
        // 4. Each side's subtrees expand horizontally outward
        // 5. No lines cross between left and right

        const X_GAP = CW + H_GAP + 40
        const Y_GAP = CH + 24
        const V_CHAIN_GAP = CH + 50

        const rootNode = root as unknown as HNode

        // Walk down single-child paths to find the branching node
        const ancestorChain: HNode[] = []
        let branchNode = rootNode
        while (branchNode.children && branchNode.children.length === 1) {
          ancestorChain.push(branchNode)
          branchNode = branchNode.children[0] as HNode
        }

        // Place branching node at center
        branchNode.x = 0
        branchNode.y = 0

        // Place ancestor chain vertically above center
        for (let i = ancestorChain.length - 1; i >= 0; i--) {
          ancestorChain[i].x = 0
          ancestorChain[i].y = -(ancestorChain.length - i) * V_CHAIN_GAP
        }

        // Split branching node's direct children: second half LEFT, first half RIGHT
        // (older sons go right, younger sons go left — matching RTL heritage style)
        const directChildren = (branchNode.children || []) as HNode[]
        const mid = Math.floor(directChildren.length / 2)
        const rightChildren = directChildren.slice(0, mid)
        const leftChildren  = directChildren.slice(mid)

        // Recursively lay out a subtree expanding horizontally.
        // side = -1 for left, +1 for right.
        // depth = how many generations from the branching center.
        // Returns next available y position.
        function layoutSubtree(node: HNode, depth: number, side: -1 | 1, yStart: number): number {
          node.x = side * depth * X_GAP
          const kids = (node.children || []) as HNode[]

          if (kids.length === 0) {
            node.y = yStart
            return yStart + Y_GAP
          }

          let nextY = yStart
          for (const child of kids) {
            nextY = layoutSubtree(child, depth + 1, side, nextY)
          }

          const firstY = kids[0].y
          const lastY  = kids[kids.length - 1].y
          node.y = (firstY + lastY) / 2

          return nextY
        }

        function shiftSubtree(node: HNode, dy: number) {
          node.y += dy
          for (const c of (node.children || []) as HNode[]) shiftSubtree(c, dy)
        }

        // Layout LEFT side
        let leftNextY = 0
        for (const child of leftChildren) {
          leftNextY = layoutSubtree(child, 1, -1, leftNextY)
        }
        const leftShift = -(leftNextY - Y_GAP) / 2
        for (const child of leftChildren) shiftSubtree(child, leftShift)

        // Layout RIGHT side
        let rightNextY = 0
        for (const child of rightChildren) {
          rightNextY = layoutSubtree(child, 1, 1, rightNextY)
        }
        const rightShift = -(rightNextY - Y_GAP) / 2
        for (const child of rightChildren) shiftSubtree(child, rightShift)

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

      if (layout === 'centeredClassic') {
        // CenteredClassic has TWO types of connectors:
        // A) Vertical lines for the ancestor chain (parent & child both at x=0)
        // B) Horizontal lines for left/right subtrees

        function drawHConn(parent: HNode, kids: HNode[], side: -1 | 1) {
          if (kids.length === 0) return
          const edgeX = parent.x + side * (CW / 2 + 6)
          const gap = Math.abs(kids[0].x - parent.x) - CW
          const midX = edgeX + side * (gap > 0 ? gap / 2 : 20)

          connLayer.append('line')
            .attr('x1', edgeX).attr('y1', parent.y)
            .attr('x2', midX).attr('y2', parent.y)
            .attr('stroke', CONN).attr('stroke-width', C_W)

          if (kids.length > 1) {
            const minCY = Math.min(...kids.map(c => c.y))
            const maxCY = Math.max(...kids.map(c => c.y))
            connLayer.append('line')
              .attr('x1', midX).attr('y1', minCY)
              .attr('x2', midX).attr('y2', maxCY)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          } else {
            connLayer.append('line')
              .attr('x1', midX).attr('y1', parent.y)
              .attr('x2', midX).attr('y2', kids[0].y)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          }

          kids.forEach(child => {
            const childEdgeX = child.x - side * (CW / 2 + 6)
            connLayer.append('line')
              .attr('x1', midX).attr('y1', child.y)
              .attr('x2', childEdgeX).attr('y2', child.y)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          })
        }

        byParent.forEach((children, parent) => {
          const verticalKids = children.filter(c => c.x === parent.x)
          const leftKids     = children.filter(c => c.x < parent.x)
          const rightKids    = children.filter(c => c.x > parent.x)

          // (A) Vertical connectors for ancestor chain
          verticalKids.forEach(child => {
            const topY = parent.y + CH / 2 + 6
            const botY = child.y  - CH / 2 - 6
            connLayer.append('line')
              .attr('x1', parent.x).attr('y1', topY)
              .attr('x2', child.x).attr('y2', botY)
              .attr('stroke', CONN).attr('stroke-width', C_W)
          })

          // (B) Horizontal connectors for left/right subtrees
          if (leftKids.length > 0)  drawHConn(parent, leftKids, -1)
          if (rightKids.length > 0) drawHConn(parent, rightKids, 1)
        })
      } else {
        // Vertical connectors (default / horizontal layout)
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
      }

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

    // ── Recursive ancestor chain renderer ──────────────────────────────
    // Draws parents to the right, then their parents further right, etc.
    // Each generation: parent cards (+ spouse) stacked vertically, siblings below,
    // then recurse for grandparents.
    const GEN_X_STEP = CW + 60

    function renderAncestorChain(
      container: d3.Selection<SVGGElement, unknown, null, undefined>,
      ancestors: ExtTreeNode[],
      siblings: ExtTreeNode[],
      originX: number,
      originY: number,
    ) {
      if (ancestors.length === 0 && siblings.length === 0) return

      const cardCenterX = originX + GEN_X_STEP / 2 + CW / 2

      // Collect parent cards including their spouses (father + mother pair)
      const allCards: ExtTreeNode[] = []
      for (const p of ancestors) {
        allCards.push(p)
        for (const ps of (p.spouses ?? []) as ExtTreeNode[]) {
          if (!allCards.some(x => x.id === ps.id)) allCards.push(ps)
        }
      }

      // Horizontal connector from origin to the first generation
      container.append('line')
        .attr('x1', originX).attr('y1', originY)
        .attr('x2', cardCenterX - CW / 2 - 6).attr('y2', originY)
        .attr('stroke', CONN).attr('stroke-width', C_W)

      // Stack parent cards vertically, centred around originY
      let yPos = originY - ((allCards.length - 1) * (CH + 10)) / 2

      allCards.forEach(p => {
        const isSel = p.id === selectedId
        const pg = container.append('g')
          .attr('transform', `translate(${cardCenterX},${yPos})`)
          .style('cursor', 'pointer')

        renderCard(pg.node() as SVGGElement, p, isSel, { renderSpouses: false })

        pg.on('click', (ev) => {
          ev.stopPropagation(); setSelectedId(p.id); onNodeClick?.(p)
        }).on('dblclick', (ev) => {
          ev.stopPropagation(); onViewSubtree?.(p)
        })

        // Recurse: if this parent also has parents, draw them one step further right
        const pParents  = (p.parents  ?? []) as ExtTreeNode[]
        const pSiblings = (p.siblings ?? []) as ExtTreeNode[]
        if (pParents.length > 0 || pSiblings.length > 0) {
          renderAncestorChain(container, pParents, pSiblings, cardCenterX + CW / 2, yPos)
        }

        yPos += CH + 10
      })

      // Draw siblings below the parent cards
      if (siblings.length > 0) {
        const sibStartY = yPos + 12
        const spineX = cardCenterX - CW / 2 - 10

        // Vertical spine for siblings
        container.append('line')
          .attr('x1', spineX).attr('y1', sibStartY)
          .attr('x2', spineX).attr('y2', sibStartY + (siblings.length - 1) * (CH + 12) + CH / 2)
          .attr('stroke', CONN).attr('stroke-width', C_W)

        // Connector from parent area to sibling spine
        container.append('line')
          .attr('x1', cardCenterX - CW / 2 - 6)
          .attr('y1', originY)
          .attr('x2', spineX)
          .attr('y2', sibStartY)
          .attr('stroke', CONN).attr('stroke-width', C_W)

        let sibY = sibStartY
        siblings.forEach(sib => {
          const isSel = (sib as ExtTreeNode).id === selectedId
          const sg = container.append('g')
            .attr('transform', `translate(${cardCenterX},${sibY})`)
            .style('cursor', 'pointer')

          container.append('line')
            .attr('x1', spineX).attr('y1', sibY)
            .attr('x2', cardCenterX - CW / 2).attr('y2', sibY)
            .attr('stroke', CONN).attr('stroke-width', C_W)

          renderCard(sg.node() as SVGGElement, sib as ExtTreeNode, isSel, { renderSpouses: false })

          sg.on('click', (ev) => {
            ev.stopPropagation(); setSelectedId((sib as ExtTreeNode).id); onNodeClick?.(sib)
          }).on('dblclick', (ev) => {
            ev.stopPropagation(); onViewSubtree?.(sib)
          })

          sibY += CH + 12
        })
      }
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

      // ── Spouse as separate linked card (below main card with connector) ────
      if (renderSpouses && person.spouses && person.spouses.length > 0) {
        // Vertical offset used in the earlier version that you preferred
        const spouseOffsetY = CH + 20
        const spouseCenterX = 0

        // Draw a vertical connector on the left side linking both cards,
        // plus short horizontal stubs into each card (like a marriage line).
        const leftX = -CW / 2 - 10

        // Vertical line between person and spouse
        g.append('line')
          .attr('x1', leftX)
          .attr('y1', 0)
          .attr('x2', leftX)
          .attr('y2', spouseOffsetY)
          .attr('stroke', CONN)
          .attr('stroke-width', C_W)

        // Horizontal into main card
        g.append('line')
          .attr('x1', leftX)
          .attr('y1', 0)
          .attr('x2', -CW / 2)
          .attr('y2', 0)
          .attr('stroke', CONN)
          .attr('stroke-width', C_W)

        // Horizontal into spouse card
        g.append('line')
          .attr('x1', leftX)
          .attr('y1', spouseOffsetY)
          .attr('x2', -CW / 2)
          .attr('y2', spouseOffsetY)
          .attr('stroke', CONN)
          .attr('stroke-width', C_W)

        const spouse = person.spouses[0] as ExtTreeNode
        const spouseG = g.append('g')
          .attr('class', 'spouse-node')
          .attr('transform', `translate(${spouseCenterX},${spouseOffsetY})`)
          .style('cursor', 'pointer')

        const spouseSelected = spouse.id === selectedId
        renderCard(spouseG.node() as SVGGElement, spouse, spouseSelected, { renderSpouses: false })

        // Wife's full ancestor branch — recursive, supports unlimited generations.
        if (enableWifeBranch) {
          const spouseParents  = (spouse.parents  ?? []) as ExtTreeNode[]
          const spouseSiblings = (spouse.siblings ?? []) as ExtTreeNode[]

          if (spouseParents.length > 0 || spouseSiblings.length > 0) {
            const branchGroup = spouseG.append('g').attr('class', 'spouse-branch')
            renderAncestorChain(branchGroup, spouseParents, spouseSiblings, CW / 2 + 4, 0)
          }
        }

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
  }, [filteredData, selectedId, language, readOnly, onNodeClick, onNodeAdd, onViewSubtree, layout, enableWifeBranch])

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
