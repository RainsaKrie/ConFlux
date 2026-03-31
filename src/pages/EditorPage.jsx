import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LoaderCircle, Plus, Sparkles, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EditorToolbar, FluxEditor } from '../components/editor/FluxEditor'
import { useFluxStore } from '../store/useFluxStore'
import { classifyQuickCapture } from '../utils/ai'
import { readAiConfig } from '../utils/aiConfig'
import { contentToPlainText, getTodayStamp, normalizeBlockDimensions } from '../utils/blocks'

const editableDimensions = ['domain', 'format', 'project']
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}

function buildFallbackTitleCandidate(text) {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? ''
  if (!firstLine) return ''
  return firstLine.length > 15 ? `${firstLine.slice(0, 15)}...` : firstLine
}

function shouldReplaceWithAiTitle(currentTitle, content, aiTitle) {
  const normalizedCurrentTitle = currentTitle?.trim() ?? ''
  const normalizedAiTitle = aiTitle?.trim() ?? ''
  if (!normalizedAiTitle) return false
  if (!normalizedCurrentTitle) return true

  const plainContent = contentToPlainText(content)
  const fallbackFromPlainContent = buildFallbackTitleCandidate(plainContent)

  if (normalizedCurrentTitle === fallbackFromPlainContent) return true
  if (plainContent.startsWith(normalizedCurrentTitle)) return true

  return false
}

export function EditorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [saveState, setSaveState] = useState('所有修改已自动保存')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [isRetagging, setIsRetagging] = useState(false)
  const [editorInstance, setEditorInstance] = useState(null)
  const titleSaveTimeoutRef = useRef(null)
  const contentSaveTimeoutRef = useRef(null)
  const pendingCreatedIdRef = useRef(null)
  const aiEnrichedIdsRef = useRef(new Set())
  const isHydratingRef = useRef(false)
  const blockId = searchParams.get('id')
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const addBlock = useFluxStore((state) => state.addBlock)
  const updateBlock = useFluxStore((state) => state.updateBlock)

  const block = useMemo(
    () => fluxBlocks.find((item) => item.id === blockId) ?? null,
    [blockId, fluxBlocks],
  )

  const currentDimensions = useMemo(
    () => normalizeBlockDimensions(block?.dimensions ?? {}),
    [block?.dimensions],
  )
  const noteBadge = block?.id ? block.id.replace('block_', '').slice(-6) : 'new'

  useEffect(
    () => () => {
      window.clearTimeout(titleSaveTimeoutRef.current)
      window.clearTimeout(contentSaveTimeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    isHydratingRef.current = true
    window.clearTimeout(titleSaveTimeoutRef.current)
    window.clearTimeout(contentSaveTimeoutRef.current)
    if (block?.id && pendingCreatedIdRef.current === block.id) {
      pendingCreatedIdRef.current = null
    }
    setTitle(block?.title ?? '')
    setContent(block?.content ?? '')
    setSaveState('所有修改已自动保存')
  }, [block?.content, block?.id, block?.title])

  const enrichBlockWithAi = async (targetId, rawTitle, rawContent) => {
    if (!targetId || aiEnrichedIdsRef.current.has(targetId)) return

    const plainContent = contentToPlainText(rawContent)
    const mergedText = [rawTitle?.trim(), plainContent].filter(Boolean).join('\n')
    if (!mergedText.trim()) return

    const aiConfig = readAiConfig()
    if (!aiConfig.apiKey?.trim()) return

    aiEnrichedIdsRef.current.add(targetId)
    try {
      const aiTags = await classifyQuickCapture(mergedText, aiConfig)
      const normalized = normalizeBlockDimensions({
        domain: aiTags.domain,
        format: aiTags.format,
        project: aiTags.project,
      })

      updateBlock(targetId, (old) => ({
        title: shouldReplaceWithAiTitle(old.title, old.content, aiTags.title)
          ? aiTags.title.trim()
          : old.title,
        dimensions: {
          ...old.dimensions,
          ...normalized,
          domain: aiTags.domain?.length ? aiTags.domain : ['未分类'],
          format: aiTags.format?.length ? aiTags.format : ['碎片'],
          project: aiTags.project || [],
        },
        updatedAt: getTodayStamp(),
      }))
    } finally {
      aiEnrichedIdsRef.current.delete(targetId)
    }
  }

  const persistDocument = (nextTitle, nextContent) => {
    const plainTitle = nextTitle.trim()
    const plainContent = contentToPlainText(nextContent)
    if (!plainTitle && !plainContent) {
      setSaveState('所有修改已自动保存')
      return
    }

    const activeBlockId = blockId || pendingCreatedIdRef.current
    const timestamp = getTodayStamp()

    if (activeBlockId) {
      updateBlock(activeBlockId, () => ({
        title: nextTitle,
        content: nextContent,
        updatedAt: timestamp,
      }))
      setSaveState('所有修改已自动保存')
      return
    }

    const newId = `block_${Date.now()}`
    pendingCreatedIdRef.current = newId
    addBlock({
      id: newId,
      title: nextTitle,
      content: nextContent,
      dimensions: normalizeBlockDimensions({
        domain: ['未分类'],
        format: ['碎片'],
        project: [],
      }),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    navigate(`/write?id=${newId}`, { replace: true })
    void enrichBlockWithAi(newId, nextTitle, nextContent)
    setSaveState('所有修改已自动保存')
  }

  const handleRemoveDimension = (dimension, value) => {
    const activeBlockId = blockId || pendingCreatedIdRef.current
    if (!activeBlockId) return

    updateBlock(activeBlockId, (old) => ({
      dimensions: {
        ...normalizeBlockDimensions(old.dimensions),
        [dimension]: (old.dimensions?.[dimension] ?? []).filter((item) => item !== value),
      },
      updatedAt: getTodayStamp(),
    }))
  }

  const handleAddTag = () => {
    const activeBlockId = blockId || pendingCreatedIdRef.current
    if (!activeBlockId) {
      window.alert('请先输入标题或正文，系统创建笔记后再管理标签。')
      return
    }

    const normalizedValue = tagInput.trim()
    if (!normalizedValue) return

    updateBlock(activeBlockId, (old) => {
      const dimensions = normalizeBlockDimensions(old.dimensions)
      const currentValues = dimensions.project ?? []
      if (currentValues.includes(normalizedValue)) {
        return {
          dimensions,
          updatedAt: getTodayStamp(),
        }
      }

      return {
        dimensions: {
          ...dimensions,
          project: [...currentValues, normalizedValue],
        },
        updatedAt: getTodayStamp(),
      }
    })

    setTagInput('')
    setIsAddingTag(false)
  }

  const handleRetagWithAi = async () => {
    const activeBlockId = blockId || pendingCreatedIdRef.current
    if (!activeBlockId) {
      window.alert('请先输入内容并等待笔记创建后，再让 AI 重新审视标签。')
      return
    }

    const latestText = editorInstance?.getText?.() ?? contentToPlainText(content)
    const mergedText = [title.trim(), latestText.trim()].filter(Boolean).join('\n')
    if (!mergedText.trim()) return

    const aiConfig = readAiConfig()
    if (!aiConfig.apiKey?.trim()) {
      window.alert('请先在左侧边栏底部的设置中配置大模型 API Key！')
      return
    }

    setIsRetagging(true)
    try {
      const aiTags = await classifyQuickCapture(mergedText, aiConfig)
      updateBlock(activeBlockId, (old) => ({
        dimensions: {
          ...normalizeBlockDimensions(old.dimensions),
          domain: aiTags.domain?.length ? aiTags.domain : ['未分类'],
          format: aiTags.format?.length ? aiTags.format : ['碎片'],
          project: aiTags.project || [],
        },
        updatedAt: getTodayStamp(),
      }))
    } finally {
      setIsRetagging(false)
    }
  }

  useEffect(() => {
    if (isHydratingRef.current) {
      return
    }

    if (blockId && block && title === (block.title ?? '')) {
      setSaveState('所有修改已自动保存')
      return
    }

    setSaveState('正在自动保存...')
    window.clearTimeout(titleSaveTimeoutRef.current)
    titleSaveTimeoutRef.current = window.setTimeout(() => {
      persistDocument(title, content)
    }, 500)

    return () => {
      window.clearTimeout(titleSaveTimeoutRef.current)
    }
  }, [block, blockId, content, title, addBlock, navigate, updateBlock])

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false
      return
    }

    if (blockId && block && content === (block.content ?? '')) {
      setSaveState('所有修改已自动保存')
      return
    }

    setSaveState('正在自动保存...')
    window.clearTimeout(contentSaveTimeoutRef.current)
    contentSaveTimeoutRef.current = window.setTimeout(() => {
      persistDocument(title, content)
    }, 1000)

    return () => {
      window.clearTimeout(contentSaveTimeoutRef.current)
    }
  }, [block, blockId, content, title, addBlock, navigate, updateBlock])

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-14 max-w-4xl px-4 pb-16"
    >
      <div className="mb-10 rounded-[32px] border border-zinc-200/80 bg-white/70 px-6 py-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">
              note {noteBadge}
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
              {block?.updatedAt ?? 'draft'}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">{saveState}</div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="在此输入标题..."
          className="flux-title-input mb-4 w-full border-none bg-transparent outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          {editableDimensions.flatMap((dimension) =>
            currentDimensions[dimension].map((value) => (
              <span
                key={`${dimension}-${value}`}
                className={`group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
              >
                <span>{value}</span>
                <button
                  type="button"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleRemoveDimension(dimension, value)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )),
          )}

          {isAddingTag ? (
            <input
              autoFocus
              value={tagInput}
              placeholder="输入标签并回车..."
              className="w-24 rounded bg-zinc-100/70 px-2 py-1 text-[11px] text-zinc-600 outline-none ring-1 ring-zinc-200"
              onChange={(event) => setTagInput(event.target.value)}
              onBlur={() => {
                if (!tagInput.trim()) {
                  setTagInput('')
                  setIsAddingTag(false)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddTag()
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsAddingTag(true)}
            >
              <span className="inline-flex items-center gap-1">
                <Plus className="h-3 w-3" />
                <span>添加标签</span>
              </span>
            </button>
          )}

          <button
            type="button"
            className={`ml-auto inline-flex items-center gap-1 rounded-md border border-indigo-100/50 bg-indigo-50/50 px-2 py-1 text-[11px] font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70 ${
              isRetagging ? 'animate-pulse' : ''
            }`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleRetagWithAi}
            disabled={isRetagging}
          >
            {isRetagging ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{isRetagging ? '✨ AI 思考中...' : '✨ AI 智能打标'}</span>
          </button>
        </div>
      </div>

      <EditorToolbar editor={editorInstance} />

      <FluxEditor
        documentKey={blockId ?? 'new'}
        initialContent={content}
        onEditorReady={setEditorInstance}
        onChange={(nextValue) => {
          setContent(nextValue.html)
        }}
      />
    </motion.section>
  )
}
