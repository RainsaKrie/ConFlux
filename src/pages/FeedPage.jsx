import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Blocks, CircleDot, LayoutGrid, Link, List, LoaderCircle, Orbit, Sparkles } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KnowledgeCard } from '../components/feed/KnowledgeCard'
import { OmniFilterBar } from '../components/feed/OmniFilterBar'
import {
  buildPoolContext,
  buildPoolContextKey,
  buildPoolTokenKey,
  findMatchingPoolByFilters,
  tokensToPoolFilters,
} from '../features/pools/utils'
import { useFluxStore } from '../store/useFluxStore'
import { readAiConfig } from '../utils/aiConfig'
import { classifyQuickCapture } from '../utils/ai'
import {
  buildBlockId,
  contentToPlainText,
  getTodayStamp,
  normalizeBlockDimensions,
} from '../utils/blocks'
import {
  buildRelationMap,
  getRelationSnapshot,
  relationToneStyles,
  visibleRelationDimensions,
} from '../utils/relations'

const FEED_VIEW_STORAGE_KEY = 'flux_feed_view_mode'
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}
const MotionSection = motion.section
const MotionDiv = motion.div

function parseFiltersParam(raw) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function collectTagSuggestions(blocks) {
  const counts = new Map()

  blocks.forEach((block) => {
    ;['domain', 'format', 'project'].forEach((dimension) => {
      ;(block.dimensions[dimension] ?? []).forEach((value) => {
        const key = `${dimension}:${value}`
        const current = counts.get(key)
        counts.set(key, {
          dimension,
          value,
          count: (current?.count ?? 0) + 1,
        })
      })
    })
  })

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count
    return left.value.localeCompare(right.value, 'zh-Hans-CN')
  })
}

function formatListDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function FeedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [capture, setCapture] = useState('')
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'grid'
    const stored = window.localStorage.getItem(FEED_VIEW_STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captureWarning, setCaptureWarning] = useState('')
  const warningTimeoutRef = useRef(null)
  const captureRef = useRef(null)
  const [activeTokens, setActiveTokens] = useState(() =>
    parseFiltersParam(searchParams.get('filters')),
  )
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const addBlock = useFluxStore((state) => state.addBlock)
  const deleteBlock = useFluxStore((state) => state.deleteBlock)
  const addPool = useFluxStore((state) => state.addPool)
  const savedPools = useFluxStore((state) => state.savedPools)
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const clearActivePoolContext = useFluxStore((state) => state.clearActivePoolContext)
  const recentPoolEvents = useFluxStore((state) => state.recentPoolEvents)
  const setActivePoolContext = useFluxStore((state) => state.setActivePoolContext)
  const updateBlock = useFluxStore((state) => state.updateBlock)

  useEffect(() => {
    setActiveTokens(parseFiltersParam(searchParams.get('filters')))
  }, [searchParams])

  useEffect(() => {
    window.localStorage.setItem(FEED_VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(
    () => () => {
      window.clearTimeout(warningTimeoutRef.current)
    },
    [],
  )

  const tagSuggestions = useMemo(() => collectTagSuggestions(fluxBlocks), [fluxBlocks])

  const filteredBlocks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return fluxBlocks.filter((block) => {
      const matchesTokens = activeTokens.every((token) =>
        block.dimensions[token.dimension]?.includes(token.value),
      )
      if (!matchesTokens) return false

      if (!normalizedQuery) return true

      const haystack = [
        block.id,
        block.title,
        contentToPlainText(block.content),
        ...Object.values(block.dimensions).flat(),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [activeTokens, fluxBlocks, query])

  const activeFilters = useMemo(() => tokensToPoolFilters(activeTokens), [activeTokens])

  const relationMap = useMemo(() => buildRelationMap(filteredBlocks), [filteredBlocks])

  const matchingSavedPool = useMemo(
    () => findMatchingPoolByFilters(savedPools, activeFilters),
    [activeFilters, savedPools],
  )

  const activePoolEvents = useMemo(
    () => recentPoolEvents.filter((event) => event.poolContextKey === buildPoolContextKey(activeFilters)).slice(0, 3),
    [activeFilters, recentPoolEvents],
  )

  const addToken = (token) => {
    setActiveTokens((current) => {
      if (current.some((item) => buildPoolTokenKey(item) === buildPoolTokenKey(token))) return current
      return [...current, token]
    })
  }

  const removeToken = (tokenKey) => {
    setActiveTokens((current) => current.filter((item) => buildPoolTokenKey(item) !== tokenKey))
  }

  const resizeCapture = () => {
    if (!captureRef.current) return
    captureRef.current.style.height = '0px'
    captureRef.current.style.height = `${Math.min(captureRef.current.scrollHeight, 128)}px`
  }

  const handleCaptureChange = (nextValue) => {
    setCapture(nextValue)
    window.requestAnimationFrame(resizeCapture)
  }

  const resetCaptureComposer = () => {
    setCapture('')
    if (captureRef.current) {
      captureRef.current.style.height = '80px'
    }
    setIsExpanded(false)
  }

  const showCaptureWarning = (message) => {
    setCaptureWarning(message)
    window.clearTimeout(warningTimeoutRef.current)
    warningTimeoutRef.current = window.setTimeout(() => {
      setCaptureWarning('')
    }, 3000)
  }

  const handleSubmitCapture = async () => {
    if (isSubmitting) return
    const content = capture.trim()
    if (!content) return

    const blockId = buildBlockId()
    const firstLine = content.split('\n')[0].trim()
    const fallbackDimensions = normalizeBlockDimensions({
      domain: ['未分类'],
      format: ['碎片'],
      project: [],
      stage: [],
      source: ['Quick Capture'],
    })

    addBlock({
      id: blockId,
      title: firstLine.length > 15 ? `${firstLine.slice(0, 15)}...` : firstLine,
      content,
      dimensions: fallbackDimensions,
      updatedAt: getTodayStamp(),
    })

    resetCaptureComposer()

    setIsSubmitting(true)
    const aiConfig = readAiConfig()
    if (aiConfig.apiKey?.trim()) {
      const aiTags = await classifyQuickCapture(content, aiConfig)
      const dimensions = normalizeBlockDimensions({
        domain: aiTags.domain,
        format: aiTags.format,
        project: aiTags.project,
        stage: [],
        source: ['AI AutoTag'],
      })

      updateBlock(blockId, (old) => ({
        title: aiTags.title && aiTags.title.length > 0 ? aiTags.title : old.title,
        dimensions: {
          ...dimensions,
          domain: aiTags.domain?.length ? aiTags.domain : ['未分类'],
          format: aiTags.format?.length ? aiTags.format : ['碎片'],
          project: aiTags.project || [],
        },
      }))
    } else {
      showCaptureWarning('⚠️ 离线保存成功。请配置 API Key 开启自动智能打标')
    }
    setIsSubmitting(false)
  }

  const handleCaptureKeyDown = async (event) => {
    if (event.key !== 'Enter' || event.shiftKey || isSubmitting) return

    event.preventDefault()
    await handleSubmitCapture()
  }

  const handleDeleteBlock = (block) => {
    const shouldDelete = window.confirm(`删除知识块「${block.title}」？`)
    if (!shouldDelete) return
    deleteBlock(block.id)
  }

  const activeLabel = useMemo(() => {
    if (activeTokens.length === 0) return 'Feed'
    return activeTokens.map((token) => token.value).join(' / ')
  }, [activeTokens])

  useEffect(() => {
    if (activeTokens.length === 0) {
      clearActivePoolContext()
      return
    }

    const nextContext = matchingSavedPool
      ? buildPoolContext({
          poolId: matchingSavedPool.id,
          name: matchingSavedPool.name,
          filters: matchingSavedPool.filters,
          sourceView: 'feed',
        })
      : buildPoolContext({
          name: `观察主题：${activeLabel}`,
          filters: activeFilters,
          sourceView: 'feed',
        })

    if (activePoolContext?.key === nextContext.key && activePoolContext?.name === nextContext.name) return
    setActivePoolContext(nextContext)
  }, [
    activeFilters,
    activeLabel,
    activePoolContext?.key,
    activePoolContext?.name,
    activeTokens.length,
    clearActivePoolContext,
    matchingSavedPool,
    setActivePoolContext,
  ])

  const handleSavePool = () => {
    if (activeTokens.length === 0) return

    const poolName = window.prompt('给这个引力池起个名字', activeLabel)
    if (!poolName?.trim()) return

    addPool({
      id: `pool_${Date.now()}`,
      name: poolName.trim(),
      filters: tokensToPoolFilters(activeTokens),
    })
  }

  const viewToggle = (
    <div className="inline-flex items-center rounded-xl border border-zinc-200/80 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('grid')}
        className={`rounded-lg p-2 transition ${
          viewMode === 'grid'
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('list')}
        className={`rounded-lg p-2 transition ${
          viewMode === 'list'
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'
        }`}
        aria-label="List view"
      >
        <List size={16} />
      </button>
    </div>
  )

  return (
    <>
      <OmniFilterBar
        query={query}
        onQueryChange={setQuery}
        activeTokens={activeTokens}
        onAddToken={addToken}
        onRemoveToken={removeToken}
        tagSuggestions={tagSuggestions}
        resultCount={filteredBlocks.length}
        onSaveView={activeTokens.length > 0 ? handleSavePool : null}
        actions={viewToggle}
      />

      <div className="mb-8 mt-6">
        {activePoolContext ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                <Orbit className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">当前观察主题</div>
                <div className="truncate text-sm font-medium text-zinc-900">{activePoolContext.name}</div>
              </div>
            </div>

            {activePoolEvents.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {activePoolEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate(`/write?id=${event.blockId}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="max-w-48 truncate">{event.blockTitle}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isExpanded && !capture.trim() ? (
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true)
              window.requestAnimationFrame(() => captureRef.current?.focus())
            }}
            className="flex h-12 w-full cursor-text items-center rounded-xl border border-zinc-200/50 bg-white/40 px-4 text-left text-sm text-zinc-400 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-sm"
          >
            ✨ 记录闪念... (点击或者按快捷键展开)
          </button>
        ) : (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-md transition-all duration-300">
            <textarea
              ref={captureRef}
              rows={1}
              autoFocus
              value={capture}
              onChange={(event) => handleCaptureChange(event.target.value)}
              onKeyDown={handleCaptureKeyDown}
              onBlur={() => {
                if (!capture.trim()) {
                  setIsExpanded(false)
                }
              }}
              placeholder="写下闪念... 或继续补充一段新的知识流"
              className="min-h-[80px] max-h-32 w-full resize-none bg-transparent text-zinc-700 outline-none placeholder:text-zinc-400"
            />

            <div className="mt-3 flex items-center justify-between gap-4 text-xs text-zinc-400">
              <div className="flex min-w-0 items-center gap-3">
                <span>{isSubmitting ? '正在调用 AI 静默打标...' : 'Enter 发送，Shift + Enter 换行'}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-600">
                  {isSubmitting ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5" />
                  )}
                  {activeLabel}
                </span>
              </div>

              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void handleSubmitCapture()
                }}
                className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || !capture.trim()}
              >
                写入知识流
              </button>
            </div>

            {captureWarning ? <p className="mt-3 text-sm text-amber-700">{captureWarning}</p> : null}
          </div>
        )}
      </div>

      <MotionSection
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-0"
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlocks.map((block, index) => (
              <MotionDiv
                key={block.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * index }}
                className="h-full"
              >
                <KnowledgeCard
                  block={block}
                  onOpen={(item) => navigate(`/write?id=${item.id}`)}
                  onDelete={handleDeleteBlock}
                />
              </MotionDiv>
            ))}
          </div>
        ) : (
          <div className="relative overflow-visible rounded-[28px] border border-zinc-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,1),_rgba(248,250,252,0.95))] shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
            <div>
              {filteredBlocks.map((block, index) => {
                const preview = contentToPlainText(block.content).replace(/\s+/g, ' ').trim() || '暂无摘要'
                const snapshot = getRelationSnapshot(block, relationMap)
                const dominantType = relationToneStyles[snapshot.dominant.type] ? snapshot.dominant.type : 'neutral'
                const tone = relationToneStyles[dominantType]
                const connections = (relationMap.get(block.id) ?? [])
                  .slice()
                  .sort((left, right) => {
                    if (right.weight !== left.weight) return right.weight - left.weight
                    return left.label.localeCompare(right.label, 'zh-Hans-CN')
                  })
                  .map((item) => ({
                    id: item.id,
                    targetTitle: item.title,
                    reason: item.label,
                  }))
                const itemTags = Object.entries(block.dimensions)
                  .filter(([dimension]) => visibleRelationDimensions.includes(dimension))
                  .flatMap(([dimension, values]) => values.map((value) => ({ dimension, value })))
                  .slice(0, 3)
                return (
                  <MotionDiv
                    key={block.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.012 * index }}
                    onClick={() => navigate(`/write?id=${block.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/write?id=${block.id}`)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group relative flex items-center w-full px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer hover:z-10 bg-white text-left transition last:border-b-0"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-6">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${tone.core}`} />
                      <span className="text-sm font-medium text-zinc-900 truncate shrink-0 max-w-[200px]">
                        {block.title}
                      </span>
                      <span className="text-zinc-300 shrink-0">—</span>
                      <span className="text-xs text-zinc-400 truncate min-w-0 flex-1 font-light">{preview}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-4">
                      {connections.length > 0 ? (
                        <div className="relative group/badge flex items-center justify-center">
                          <span className="flex items-center gap-1 rounded border border-indigo-100/80 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-medium text-indigo-600 shadow-sm cursor-default transition-colors group-hover/badge:bg-indigo-100">
                            <Link size={10} strokeWidth={2.5} /> {connections.length}
                          </span>
                          <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)] opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-all duration-200 z-50 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium uppercase tracking-widest mb-1 pb-2 border-b border-zinc-100">
                              <Link size={12} className="text-indigo-400" />
                              关联网络 ({connections.length})
                            </div>
                            <div className="flex flex-col gap-2.5">
                              {connections.slice(0, 5).map((c) => (
                                <div key={`${block.id}-${c.id}-${c.reason}`} className="flex flex-col gap-1">
                                  <span className="text-xs text-zinc-700 font-medium truncate">{c.targetTitle}</span>
                                  <div className="flex">
                                    <span className="text-[10px] text-indigo-500/90 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">
                                      {c.reason}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {connections.length > 5 ? (
                              <div className="mt-1 pt-2 border-t border-zinc-100 text-[10px] text-zinc-400 text-center">
                                ...及其他 {connections.length - 5} 个节点关联
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {itemTags.map((tag) => (
                          <span
                            key={`${block.id}-${tag.dimension}-${tag.value}`}
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${dimensionStyles[tag.dimension]}`}
                          >
                            {tag.value}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono tracking-tight w-16 text-right shrink-0 group-hover:text-zinc-600 transition-colors">
                        {formatListDate(block.updatedAt)}
                      </span>
                    </div>
                  </MotionDiv>
                )
              })}
            </div>
          </div>
        )}

      {filteredBlocks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <Blocks className="h-5 w-5" />
            </div>
            <p className="mt-4 text-lg font-medium text-zinc-900">这一区流暂时很安静</p>
            <p className="mt-2 text-sm text-zinc-500">
              {activePoolContext
                ? '可以调整当前观察主题，或者撤掉 Token 重新扩大视野。'
                : '可以撤掉 Token，或者尝试更宽的搜索词。'}
            </p>
          </div>
        ) : null}
      </MotionSection>
    </>
  )
}
