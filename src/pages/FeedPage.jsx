import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Blocks, CircleDot, LayoutGrid, Link2, List, LoaderCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KnowledgeCard } from '../components/feed/KnowledgeCard'
import { OmniFilterBar } from '../components/feed/OmniFilterBar'
import { useFluxStore } from '../store/useFluxStore'
import { readAiConfig } from '../utils/aiConfig'
import { classifyQuickCapture } from '../utils/ai'
import {
  buildBlockId,
  contentToPlainText,
  extractBlockReferences,
  getTodayStamp,
  normalizeBlockDimensions,
} from '../utils/blocks'

const FEED_VIEW_STORAGE_KEY = 'flux_feed_view_mode'
const visibleDimensions = ['domain', 'format', 'project']
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}
const relationToneStyles = {
  reference: {
    orbit: 'border-indigo-200 bg-indigo-50',
    core: 'bg-indigo-500',
    badge: 'border border-indigo-100 bg-indigo-50 text-indigo-600',
  },
  domain: {
    orbit: 'border-blue-200 bg-blue-50',
    core: 'bg-blue-500',
    badge: 'border border-blue-100 bg-blue-50 text-blue-600',
  },
  format: {
    orbit: 'border-zinc-200 bg-zinc-100',
    core: 'bg-zinc-500',
    badge: 'border border-zinc-200 bg-zinc-100 text-zinc-600',
  },
  project: {
    orbit: 'border-purple-200 bg-purple-50',
    core: 'bg-purple-500',
    badge: 'border border-purple-100 bg-purple-50 text-purple-600',
  },
  neutral: {
    orbit: 'border-zinc-200 bg-zinc-50',
    core: 'bg-zinc-400',
    badge: 'border border-zinc-200 bg-zinc-50 text-zinc-500',
  },
}
const relationPriority = {
  reference: 4,
  project: 3,
  domain: 2,
  format: 1,
  neutral: 0,
}

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

function buildTokenKey(token) {
  return `${token.dimension}:${token.value}`
}

function tokensToPoolFilters(tokens) {
  return tokens.reduce((accumulator, token) => {
    const currentValues = accumulator[token.dimension] ?? []
    if (!currentValues.includes(token.value)) {
      accumulator[token.dimension] = [...currentValues, token.value]
    }
    return accumulator
  }, {})
}

function formatListDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function createConnection(left, right, type, label) {
  return {
    id: right.id,
    title: right.title,
    type,
    label,
    weight: relationPriority[type] ?? 0,
  }
}

function buildRelationMap(blocks) {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  const map = new Map(blocks.map((block) => [block.id, []]))

  const pushUnique = (sourceId, connection) => {
    const bucket = map.get(sourceId)
    if (!bucket) return
    const exists = bucket.some(
      (item) => item.id === connection.id && item.type === connection.type && item.label === connection.label,
    )
    if (!exists) {
      bucket.push(connection)
    }
  }

  blocks.forEach((block) => {
    extractBlockReferences(block.content).forEach((refId) => {
      const target = byId.get(refId)
      if (!target) return
      pushUnique(block.id, createConnection(block, target, 'reference', '引用'))
      pushUnique(target.id, createConnection(target, block, 'reference', '被引用'))
    })
  })

  for (let i = 0; i < blocks.length; i += 1) {
    const left = blocks[i]
    for (let j = i + 1; j < blocks.length; j += 1) {
      const right = blocks[j]

      visibleDimensions.forEach((dimension) => {
        const overlaps = (left.dimensions[dimension] ?? []).filter((value) =>
          (right.dimensions[dimension] ?? []).includes(value),
        )

        overlaps.forEach((value) => {
          pushUnique(left.id, createConnection(left, right, dimension, value))
          pushUnique(right.id, createConnection(right, left, dimension, value))
        })
      })
    }
  }

  return map
}

function getRelationSnapshot(block, relationMap) {
  const connections = relationMap.get(block.id) ?? []
  const relatedIds = [...new Set(connections.map((item) => item.id))]
  const ordered = [...connections].sort((left, right) => {
    if (right.weight !== left.weight) return right.weight - left.weight
    return left.label.localeCompare(right.label, 'zh-Hans-CN')
  })
  const dominant = ordered[0] ?? { type: 'neutral', label: '独立条目' }
  const connectedTitles = [...new Map(ordered.map((item) => [item.id, item.title])).values()].slice(0, 2)

  return {
    totalConnections: relatedIds.length,
    dominant,
    connectedTitles,
    visibleReasons: ordered.slice(0, 3),
  }
}

function buildRelatedLabel(snapshot) {
  if (snapshot.connectedTitles.length === 0) return '尚未形成明显连接'
  if (snapshot.connectedTitles.length === 1) return `连到 ${snapshot.connectedTitles[0]}`
  return `连到 ${snapshot.connectedTitles[0]} · ${snapshot.connectedTitles[1]}`
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

  const relationMap = useMemo(() => buildRelationMap(filteredBlocks), [filteredBlocks])

  const addToken = (token) => {
    setActiveTokens((current) => {
      if (current.some((item) => buildTokenKey(item) === buildTokenKey(token))) return current
      return [...current, token]
    })
  }

  const removeToken = (tokenKey) => {
    setActiveTokens((current) => current.filter((item) => buildTokenKey(item) !== tokenKey))
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

      <motion.section
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-0"
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlocks.map((block, index) => (
              <motion.div
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
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,1),_rgba(248,250,252,0.95))] shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
            <div className="divide-y divide-zinc-100/70">
              {filteredBlocks.map((block, index) => {
                const preview = contentToPlainText(block.content)
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
                  .filter(([dimension]) => visibleDimensions.includes(dimension))
                  .flatMap(([dimension, values]) => values.map((value) => ({ dimension, value })))

                return (
                  <motion.button
                    key={block.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.012 * index }}
                    onClick={() => navigate(`/write?id=${block.id}`)}
                    className="group flex h-12 items-center justify-between border-b border-zinc-100 px-3 py-2 text-left transition hover:bg-zinc-50 last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${tone.core}`} />
                      <div className="max-w-[200px] shrink-0 truncate text-sm font-medium text-zinc-900">
                        {block.title}
                      </div>
                      <span className="shrink-0 text-xs text-zinc-300">—</span>
                      <div className="min-w-0 truncate text-xs font-light text-zinc-400">{preview}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="relative group/badge shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium cursor-default ${
                            snapshot.totalConnections > 0
                              ? 'border-indigo-100 bg-indigo-50 text-indigo-500'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                          }`}
                        >
                          <Link2 size={10} />
                          {snapshot.totalConnections}
                        </span>

                        {connections.length > 0 ? (
                          <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-zinc-700/50 bg-zinc-900 p-3 opacity-0 shadow-2xl transition-all group-hover/badge:opacity-100">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                              与之产生交集的知识块
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {connections.slice(0, 5).map((connection) => (
                                <div key={`${block.id}-${connection.id}-${connection.reason}`} className="flex flex-col gap-0.5">
                                  <span className="truncate text-xs text-zinc-200">{connection.targetTitle}</span>
                                  <span className="font-mono text-[10px] text-indigo-400">{`∵ ${connection.reason}`}</span>
                                </div>
                              ))}
                            </div>
                            {connections.length > 5 ? (
                              <div className="mt-1 text-[10px] text-zinc-500">
                                {`...及其他 ${connections.length - 5} 个节点关联`}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex max-w-[200px] shrink-0 items-center gap-1.5 overflow-hidden">
                        {itemTags.map((tag) => (
                          <span
                            key={`${block.id}-${tag.dimension}-${tag.value}`}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${dimensionStyles[tag.dimension]}`}
                          >
                            {tag.value}
                          </span>
                        ))}
                      </div>
                      <span className="w-12 text-right text-[11px] text-zinc-300">{formatListDate(block.updatedAt)}</span>
                    </div>
                  </motion.button>
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
            <p className="mt-2 text-sm text-zinc-500">可以撤掉 Token，或者尝试更宽的搜索词。</p>
          </div>
        ) : null}
      </motion.section>
    </>
  )
}
