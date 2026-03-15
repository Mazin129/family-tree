'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { TreeNode } from '@/types'

interface FamilyTree3DCanvasProps {
  data: TreeNode
  onNodeClick?: (node: TreeNode) => void
  onNodeAdd?: (node: TreeNode) => void
  onViewSubtree?: (node: TreeNode) => void
  language?: 'ar' | 'en'
  readOnly?: boolean
}

const RADIUS = 3.5
const Y_STEP = 2.8
const CARD_WIDTH = 140
const CARD_HEIGHT = 52

const MALE_COLOR = '#2563eb'
const FEMALE_COLOR = '#db2777'
const DEAD_ACCENT = '#374151'
const CONN_COLOR = '#b0a090'

export function FamilyTree3DCanvas({
  data,
  onNodeClick,
  onNodeAdd,
  onViewSubtree,
  language = 'ar',
  readOnly = false,
}: FamilyTree3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const labelRendererRef = useRef<CSS2DRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationRef = useRef<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const getName = useCallback((n: TreeNode) => (language === 'ar' ? (n.nameArabic || n.name) : n.name) || '—', [language])

  const draw = useCallback(() => {
    if (!containerRef.current || !data) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfaf8f5)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 12, 18)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xfaf8f5, 1)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(width, height)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.left = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(labelRenderer.domElement)
    labelRendererRef.current = labelRenderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 5
    controls.maxDistance = 80
    controlsRef.current = controls

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(10, 20, 10)
    scene.add(dir)

    const positions = new Map<string, THREE.Vector3>()

    function layout(node: TreeNode, parentPos: THREE.Vector3 | null, siblingIndex: number, siblingCount: number, depth: number) {
      const x = parentPos ? parentPos.x + RADIUS * Math.cos((2 * Math.PI * siblingIndex) / siblingCount) : 0
      const z = parentPos ? parentPos.z + RADIUS * Math.sin((2 * Math.PI * siblingIndex) / siblingCount) : 0
      const y = -depth * Y_STEP
      const pos = new THREE.Vector3(x, y, z)
      positions.set(node.id, pos)

      const children = node.children ?? []
      children.forEach((child, i) => layout(child, pos, i, children.length, depth + 1))
    }

    layout(data, null, 0, 1, 0)

    const linkGeometry = new THREE.BufferGeometry()
    const linkPositions: number[] = []
    let lineMat: THREE.LineBasicMaterial | null = null
    const visit = (node: TreeNode) => {
      const pos = positions.get(node.id)!
      for (const child of node.children ?? []) {
        const cpos = positions.get(child.id)!
        linkPositions.push(pos.x, pos.y, pos.z, cpos.x, cpos.y, cpos.z)
        visit(child)
      }
    }
    visit(data)

    if (linkPositions.length > 0) {
      linkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3))
      lineMat = new THREE.LineBasicMaterial({ color: CONN_COLOR })
      const segs = new THREE.LineSegments(linkGeometry, lineMat)
      scene.add(segs)
    }

    const cards: { node: TreeNode; obj: CSS2DObject }[] = []
    positions.forEach((pos, id) => {
      const node = findNode(data, id)
      if (!node) return
      const div = document.createElement('div')
      div.style.width = `${CARD_WIDTH}px`
      div.style.minHeight = `${CARD_HEIGHT}px`
      div.style.padding = '6px 10px'
      div.style.borderRadius = '10px'
      div.style.border = selectedId === node.id ? '2px solid #d97706' : '1px solid #e5e7eb'
      div.style.background = node.gender === 'MALE' ? '#dbeafe' : '#fce7f3'
      div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
      div.style.cursor = 'pointer'
      div.style.pointerEvents = 'auto'
      div.style.fontFamily = "'Cairo','Tajawal',sans-serif"
      div.style.textAlign = 'center'
      div.style.color = node.gender === 'MALE' ? '#1e3a5f' : '#5b1a33'
      const accent = node.isAlive ? (node.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR) : DEAD_ACCENT
      div.style.borderLeft = `4px solid ${accent}`

      const nameEl = document.createElement('div')
      nameEl.style.fontWeight = '700'
      nameEl.style.fontSize = '12px'
      nameEl.textContent = getName(node).slice(0, 18) + (getName(node).length > 18 ? '…' : '')
      div.appendChild(nameEl)

      const meta: string[] = []
      if (node.tribe) meta.push(node.tribe)
      if (node.birthYear) meta.push(String(node.birthYear))
      if (meta.length) {
        const metaEl = document.createElement('div')
        metaEl.style.fontSize = '10px'
        metaEl.style.color = '#64748b'
        metaEl.textContent = meta.join(' · ')
        div.appendChild(metaEl)
      }

      div.onclick = (e) => {
        e.stopPropagation()
        setSelectedId(node.id)
        onNodeClick?.(node)
      }
      div.ondblclick = (e) => {
        e.stopPropagation()
        onViewSubtree?.(node)
      }

      const label = new CSS2DObject(div)
      label.position.set(pos.x, pos.y, pos.z)
      scene.add(label)
      cards.push({ node, obj: label })
    })

    function animate() {
      animationRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      labelRenderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      controls.dispose()
      renderer.dispose()
      linkGeometry.dispose()
      if (lineMat) lineMat.dispose()
      container.removeChild(renderer.domElement)
      container.removeChild(labelRenderer.domElement)
      sceneRef.current = null
      rendererRef.current = null
      labelRendererRef.current = null
      controlsRef.current = null
    }
  }, [data, language, selectedId, onNodeClick, onViewSubtree, getName])

  useEffect(() => { const cleanup = draw(); return cleanup }, [draw])

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-[#faf8f5] rounded-xl overflow-hidden" />
  )
}

function findNode(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const f = findNode(c, id)
    if (f) return f
  }
  return null
}
