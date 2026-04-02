import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { motion } from 'framer-motion'
import { ArrowUpRight, Hash, Orbit, Search, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GRAPH_PHYSICS, GRAPH_VIEW } from '../features/graph/constants'
import { paintGraphNodePointerArea, renderGraphNode } from '../features/graph/rendering'
import { useGraphCamera } from '../features/graph/useGraphCamera'
import { useGraphSearch } from '../features/graph/useGraphSearch'
import { getGraphLinkNodeId, getNodeSpreadRadius, linkTouchesNode } from '../features/graph/utils'
import { filtersMatchBlock } from '../features/pools/utils'
import { useFluxStore } from '../store/useFluxStore'
import { contentToPlainText } from '../utils/blocks'
import {
  buildGraphData,
  getRelationSnapshot,
  relationToneStyles,
  secondaryRelationDimensions,
  visibleRelationDimensions,
} from '../utils/relations'

const MotionSection = motion.section

export function GraphPage() {
  const navigate = useNavigate()
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const recentPoolEvents = useFluxStore((state) => state.recentPoolEvents)
  const scopedBlocks = useMemo(() => {
    if (!activePoolContext?.filters) return fluxBlocks
    return fluxBlocks.filter((block) => filtersMatchBlock(block, activePoolContext.filters))
  }, [activePoolContext, fluxBlocks])
  const graphData = useMemo(() => buildGraphData(scopedBlocks), [scopedBlocks])
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { handleSearchChange, highlightNodes, isSearchActive, searchQuery, searchResults, setSearchQuery } =
    useGraphSearch(scopedBlocks)
  const graphNodeMap = useMemo(() => new Map(graphData.nodes.map((node) => [node.id, node])), [graphData.nodes])
  const { clearSelection, focusNode, selectedNode } = useGraphCamera({
    graphData,
    graphNodeMap,
    graphRef,
    size,
  })

  const activeNode = selectedNode ?? hoveredNode
  const activeBlock = activeNode?.block ?? null
  const relationSnapshot = activeBlock ? getRelationSnapshot(activeBlock, graphData.relationMap) : null
  const dominantType =
    relationSnapshot && relationToneStyles[relationSnapshot.dominant.type]
      ? relationSnapshot.dominant.type
      : 'neutral'
  const dominantTone = relationToneStyles[dominantType]
  const preview = activeBlock ? contentToPlainText(activeBlock.content) : ''
  const previewTags = activeBlock
    ? Object.entries(activeBlock.dimensions)
        .filter(([dimension]) => visibleRelationDimensions.includes(dimension))
        .flatMap(([dimension, values]) => values.map((value) => ({ dimension, value })))
        .slice(0, 4)
    : []
  const secondaryMetadata = activeBlock
    ? Object.entries(activeBlock.dimensions)
        .filter(([dimension]) => secondaryRelationDimensions.includes(dimension))
        .flatMap(([dimension, values]) => values.map((value) => ({ dimension, value })))
        .slice(0, 3)
    : []
  const activeNeighborIds = useMemo(() => {
    if (!activeBlock) return new Set()

    return new Set((graphData.relationMap.get(activeBlock.id) ?? []).map((connection) => connection.id))
  }, [activeBlock, graphData.relationMap])
  const activePoolEvents = useMemo(() => {
    if (!activePoolContext?.key) return []
    return recentPoolEvents.filter((event) => event.poolContextKey === activePoolContext.key).slice(0, 3)
  }, [activePoolContext, recentPoolEvents])

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
      chargeForce.strength(GRAPH_PHYSICS.chargeStrength)
    }

    const collisionForce = fg.d3Force('collision')
    if (collisionForce) {
      collisionForce.radius((node) => getNodeSpreadRadius(node) + GRAPH_PHYSICS.collisionPadding)
      collisionForce.strength(GRAPH_PHYSICS.collisionStrength)
    }

    const linkForce = fg.d3Force('link')
    if (linkForce) {
      linkForce.distance(GRAPH_PHYSICS.linkDistance)
      linkForce.strength(GRAPH_PHYSICS.linkStrength)
    }

    const centerForce = fg.d3Force('center')
    if (centerForce) {
      centerForce.x(0)
      centerForce.y(0)
    }

    fg.d3ReheatSimulation()
  }, [graphData, size.height, size.width])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.style.cursor = hoveredNode || selectedNode ? 'pointer' : 'grab'
  }, [hoveredNode, selectedNode])

  const clearActiveSelection = useMemo(
    () => () => {
      clearSelection()
      setHoveredNode(null)
    },
    [clearSelection],
  )

  const focusNodeById = useMemo(
    () => (nodeId) => {
      const node = graphNodeMap.get(nodeId)
      if (!node) return

      focusNode(node)
      setHoveredNode(node)
      setSearchQuery(node.title ?? '')
    },
    [focusNode, graphNodeMap, setSearchQuery],
  )

  const handleNodeHover = useMemo(
    () => (node) => {
      if (selectedNode) return
      setHoveredNode(node)
    },
    [selectedNode],
  )

  const handleNodeClick = useMemo(
    () => (node) => {
      focusNode(node)
      setHoveredNode(node)
    },
    [focusNode],
  )

  const getLinkColor = useMemo(
    () => (link) => {
      const baseColor = relationToneStyles[link.type]?.link ?? relationToneStyles.neutral.link
      if (isSearchActive) {
        const touchesMatch =
          highlightNodes.has(getGraphLinkNodeId(link.source)) || highlightNodes.has(getGraphLinkNodeId(link.target))
        return touchesMatch ? baseColor : 'rgba(228, 228, 231, 0.12)'
      }
      if (!activeNode) return baseColor

      return linkTouchesNode(link, activeNode.id) ? baseColor : 'rgba(212, 212, 216, 0.12)'
    },
    [activeNode, highlightNodes, isSearchActive],
  )

  const getLinkWidth = useMemo(
    () => (link) => {
      const baseWidth = link.type === 'source' ? 2.8 : 1
      if (!activeNode) return baseWidth
      return linkTouchesNode(link, activeNode.id) ? baseWidth + 0.8 : baseWidth
    },
    [activeNode],
  )

  const getLinkDirectionalParticles = useMemo(
    () => (link) => {
      if (isSearchActive) {
        const touchesMatch =
          highlightNodes.has(getGraphLinkNodeId(link.source)) || highlightNodes.has(getGraphLinkNodeId(link.target))
        if (!touchesMatch) return 0
      }
      if (!activeNode) return link.type === 'lens' || link.type === 'reference' ? 2 : link.type === 'source' ? 0 : 1
      if (!linkTouchesNode(link, activeNode.id)) return 0
      return link.type === 'lens' || link.type === 'reference' ? 2 : link.type === 'source' ? 0 : 1
    },
    [activeNode, highlightNodes, isSearchActive],
  )

  const getLinkDirectionalParticleWidth = useMemo(() => (link) => (link.type === 'lens' ? 2.6 : 2), [])

  const getLinkDirectionalParticleSpeed = useMemo(() => (link) => (link.type === 'lens' ? 0.004 : 0.003), [])

  const getLinkDirectionalParticleColor = useMemo(
    () => (link) => {
      if (isSearchActive) {
        const touchesMatch =
          highlightNodes.has(getGraphLinkNodeId(link.source)) || highlightNodes.has(getGraphLinkNodeId(link.target))
        return touchesMatch
          ? relationToneStyles[link.type]?.particle ?? relationToneStyles.neutral.particle
          : 'rgba(228, 228, 231, 0.12)'
      }
      if (!activeNode) return relationToneStyles[link.type]?.particle ?? relationToneStyles.neutral.particle
      return linkTouchesNode(link, activeNode.id)
        ? relationToneStyles[link.type]?.particle ?? relationToneStyles.neutral.particle
        : 'rgba(212, 212, 216, 0.14)'
    },
    [activeNode, highlightNodes, isSearchActive],
  )

  const handleNodePointerAreaPaint = useMemo(
    () => (node, color, ctx) => {
      paintGraphNodePointerArea(node, color, ctx)
    },
    [],
  )

  const handleNodeCanvasObject = useMemo(
    () => (node, ctx, globalScale) => {
      renderGraphNode(node, ctx, globalScale, {
        activeNeighborIds,
        activeNode,
        highlightNodes,
        hoveredNode,
        searchQuery,
        selectedNode,
      })
    },
    [activeNeighborIds, activeNode, highlightNodes, hoveredNode, searchQuery, selectedNode],
  )

  return (
    <MotionSection
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-48px)] overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">星系图谱</div>
            <h1 className="mt-1 font-['Space_Grotesk',_'Noto_Sans_SC',_sans-serif] text-2xl font-semibold tracking-tight text-zinc-950">
              知识物理关联图
            </h1>
            {activePoolContext ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
                  <Orbit className="h-3.5 w-3.5" />
                  {activePoolContext.name}
                </span>
                {activePoolEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate(`/write?id=${event.blockId}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="max-w-44 truncate">{event.blockTitle}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="text-xs font-normal text-zinc-400">
            {graphData.nodes.length} 个节点 / {graphData.links.length} 条关联线
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#FAFAFA]" ref={containerRef}>
          <div className="absolute top-6 left-6 z-10 w-72">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-2.5 shadow-lg backdrop-blur-md">
              <Search size={12} className="text-zinc-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="在图中定位知识块..."
                className="w-full bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
              />
            </div>

            {isSearchActive ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-md">
                {searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => focusNodeById(result.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 last:border-b-0"
                    >
                      <span className="truncate">{result.title}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-zinc-400">定位</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-zinc-400">未找到匹配知识块</div>
                )}
              </div>
            ) : null}
          </div>

          {size.width > 0 && size.height > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              width={size.width}
              height={size.height}
              graphData={graphData}
              backgroundColor={GRAPH_VIEW.backgroundColor}
              nodeRelSize={4}
              warmupTicks={GRAPH_PHYSICS.warmupTicks}
              cooldownTicks={GRAPH_PHYSICS.cooldownTicks}
              d3AlphaDecay={GRAPH_PHYSICS.d3AlphaDecay}
              d3VelocityDecay={GRAPH_PHYSICS.d3VelocityDecay}
              linkColor={getLinkColor}
              linkWidth={getLinkWidth}
              linkDirectionalParticles={getLinkDirectionalParticles}
              linkDirectionalParticleWidth={getLinkDirectionalParticleWidth}
              linkDirectionalParticleSpeed={getLinkDirectionalParticleSpeed}
              linkDirectionalParticleColor={getLinkDirectionalParticleColor}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              onBackgroundClick={clearActiveSelection}
              nodePointerAreaPaint={handleNodePointerAreaPaint}
              nodeCanvasObject={handleNodeCanvasObject}
            />
          ) : null}
        </div>
      </div>

      <aside className="min-h-0 w-[340px] shrink-0 overflow-y-auto border-l border-zinc-100 bg-white/90 p-5">
        {activeBlock && relationSnapshot ? (
          <div className="flex min-h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                {selectedNode ? '已锁定透视' : '关联透视'}
              </div>
              {selectedNode ? (
                <button
                  type="button"
                  onClick={clearActiveSelection}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                  关闭
                </button>
              ) : null}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{activeBlock.title}</h2>
              <p className="mt-2 line-clamp-8 text-sm leading-6 text-zinc-500">
                {preview || '这张知识块暂时还没有正文摘要。'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {previewTags.map((tag) => (
                <span
                  key={`${activeBlock.id}-${tag.dimension}-${tag.value}`}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    relationToneStyles[tag.dimension]?.badge ?? relationToneStyles.neutral.badge
                  }`}
                >
                  {tag.value}
                </span>
              ))}
            </div>

            {secondaryMetadata.length ? (
              <div className="flex flex-wrap items-center gap-2 text-zinc-300">
                <span className="select-none text-[10px]">|</span>
                {secondaryMetadata.map((tag) => (
                  <span
                    key={`${activeBlock.id}-${tag.dimension}-${tag.value}`}
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-400/80"
                  >
                    <Hash size={8} strokeWidth={2} className="shrink-0" />
                    <span>{tag.value}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className={`rounded-2xl p-3 ${dominantTone.badge}`}>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">当前主关系</div>
              <div className="mt-1 text-sm font-medium">{relationSnapshot.dominant.label}</div>
              <div className="mt-1 text-xs opacity-80">{relationSnapshot.totalConnections} 个直接关联节点</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-zinc-500">主要关联理由</div>
              {(graphData.relationMap.get(activeBlock.id) ?? [])
                .slice()
                .sort((left, right) => {
                  if (right.weight !== left.weight) return right.weight - left.weight
                  return left.label.localeCompare(right.label, 'zh-Hans-CN')
                })
                .slice(0, 5)
                .map((connection) => {
                  const tone = relationToneStyles[connection.type] ?? relationToneStyles.neutral
                  return (
                    <div
                      key={`${activeBlock.id}-${connection.id}-${connection.type}-${connection.label}`}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2"
                    >
                      <div className="truncate text-sm font-medium text-zinc-800">{connection.title}</div>
                      <div className="mt-1 flex">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${tone.badge}`}>
                          {connection.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>

            <button
              type="button"
              onClick={() => navigate(`/write?id=${activeBlock.id}`)}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <ArrowUpRight className="h-4 w-4" />
              打开这张知识块
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3 text-zinc-400">
            <div className="text-[11px] uppercase tracking-[0.24em]">关联透视</div>
            <p className="text-sm leading-6">
              把鼠标悬停在图中的某个节点上，这里会显示和知识流一致的关系语义、正文摘要与主要关联理由。点击节点后可以锁定右侧面板并滚动查看细节。
            </p>
          </div>
        )}
      </aside>
    </MotionSection>
  )
}
