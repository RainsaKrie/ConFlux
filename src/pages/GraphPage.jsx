import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useFluxStore } from '../store/useFluxStore'
import { extractBlockReferences } from '../utils/blocks'

function buildGraphData(blocks) {
  const total = blocks.length
  const baseRadius = Math.max(72, total * 12)
  const nodes = blocks.map((block, index) => {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2
    const radialOffset = (index % 3) * 18
    const radius = baseRadius + radialOffset

    return {
      id: block.id,
      title: block.title,
      block,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  })

  const links = []
  const seen = new Set()

  const addLink = (source, target) => {
    if (source === target) return
    const key = [source, target].sort().join('::')
    if (seen.has(key)) return
    seen.add(key)
    links.push({ source, target })
  }

  for (let i = 0; i < blocks.length; i += 1) {
    const left = blocks[i]
    extractBlockReferences(left.content).forEach((ref) => addLink(left.id, ref))

    for (let j = i + 1; j < blocks.length; j += 1) {
      const right = blocks[j]
      const keys = ['domain', 'format', 'project']
      const connected = keys.some((key) =>
        (left.dimensions[key] ?? []).some((value) => (right.dimensions[key] ?? []).includes(value)),
      )

      if (connected) {
        addLink(left.id, right.id)
      }
    }
  }

  const degreeMap = new Map(nodes.map((node) => [node.id, 0]))
  links.forEach((link) => {
    degreeMap.set(link.source, (degreeMap.get(link.source) ?? 0) + 1)
    degreeMap.set(link.target, (degreeMap.get(link.target) ?? 0) + 1)
  })

  nodes.forEach((node) => {
    node.degree = degreeMap.get(node.id) ?? 0
  })

  return { nodes, links }
}

function truncateLabel(label = '') {
  return label.length > 10 ? `${label.slice(0, 10)}...` : label
}

export function GraphPage() {
  const navigate = useNavigate()
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const graphData = useMemo(() => buildGraphData(fluxBlocks), [fluxBlocks])
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const nextWidth = containerRef.current.offsetWidth
      const nextHeight = containerRef.current.offsetHeight

      if (!nextWidth || !nextHeight) return

      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current
        }

        return {
          width: nextWidth,
          height: nextHeight,
        }
      })
    }

    updateSize()
    const observer = new ResizeObserver(() => updateSize())
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    window.addEventListener('resize', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  useEffect(() => {
    if (!graphRef.current || !size.width || !size.height) return

    const fg = graphRef.current
    const chargeForce = fg.d3Force('charge')
    if (chargeForce) {
      chargeForce.strength(-80)
    }

    const collisionForce = fg.d3Force('collision')
    if (collisionForce) {
      collisionForce.radius(18)
      collisionForce.strength(0.9)
    }

    const linkForce = fg.d3Force('link')
    if (linkForce) {
      linkForce.distance(60)
      linkForce.strength(0.22)
    }

    const centerForce = fg.d3Force('center')
    if (centerForce) {
      centerForce.x(0)
      centerForce.y(0)
    }

    fg.d3ReheatSimulation()

    const fitGraph = () => {
      fg.zoomToFit(520, 96)
    }

    let timeoutId = 0
    const rafId = window.requestAnimationFrame(() => {
      fitGraph()
      timeoutId = window.setTimeout(fitGraph, 720)
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [graphData, size.width, size.height])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.style.cursor = hoveredNode ? 'pointer' : 'grab'
  }, [hoveredNode])

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-48px)] flex-col overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">
            {'\u661f\u7cfb\u56fe\u8c31'}
          </div>
          <h1 className="mt-1 font-['Space_Grotesk',_'Noto_Sans_SC',_sans-serif] text-2xl font-semibold tracking-tight text-zinc-950">
            {'\u77e5\u8bc6\u7269\u7406\u5173\u8054\u56fe'}
          </h1>
        </div>
        <div className="text-xs font-normal text-zinc-400">
          {graphData.nodes.length} nodes / {graphData.links.length} links
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-[#FAFAFA]" ref={containerRef}>
        {size.width > 0 && size.height > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={size.width}
            height={size.height}
            graphData={graphData}
            backgroundColor="#FAFAFA"
            nodeRelSize={4}
            warmupTicks={100}
            cooldownTicks={200}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.25}
            linkColor={() => 'rgba(165, 180, 252, 0.3)'}
            linkWidth={() => 1}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.003}
            linkDirectionalParticleColor={() => 'rgba(99, 102, 241, 0.4)'}
            onNodeHover={setHoveredNode}
            onNodeClick={(node) => navigate(`/write?id=${node.id}`)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const isHovered = hoveredNode?.id === node.id
              const linkCount = node.degree ?? 0
              const baseRadius = Math.max(3, Math.min(8, 2 + linkCount * 1))
              const coreRadius = baseRadius * (isHovered ? 0.75 : 0.5)
              const outerHaloRadius = baseRadius * (isHovered ? 2.9 : 2.5)
              const midHaloRadius = baseRadius * (isHovered ? 1.6 : 1.3)
              const label = truncateLabel(node.title)
              const fontSize = 10
              const labelOffset = baseRadius * 2.5

              ctx.beginPath()
              ctx.arc(node.x, node.y, outerHaloRadius, 0, 2 * Math.PI, false)
              ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.2)' : 'rgba(129, 140, 248, 0.06)'
              ctx.fill()

              ctx.beginPath()
              ctx.arc(node.x, node.y, midHaloRadius, 0, 2 * Math.PI, false)
              ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.2)' : 'rgba(129, 140, 248, 0.12)'
              ctx.fill()

              ctx.beginPath()
              ctx.arc(node.x, node.y, coreRadius, 0, 2 * Math.PI, false)
              ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 1)' : 'rgba(99, 102, 241, 0.85)'
              ctx.fill()

              ctx.font = `${isHovered ? '600' : '500'} ${fontSize}px system-ui, sans-serif`
              ctx.fillStyle = isHovered ? '#18181b' : '#52525b'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'top'
              ctx.fillText(label, node.x, node.y + labelOffset)
            }}
          />
        ) : null}
      </div>
    </motion.section>
  )
}
