import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback } from 'react'
import { Clock3, GitMerge, LoaderCircle, Orbit, Plus, Sparkles, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AssimilationDiffPanel } from '../components/assimilation/AssimilationDiffPanel'
import { EditorToolbar, FluxEditor } from '../components/editor/FluxEditor'
import { useFluxStore } from '../store/useFluxStore'
import { classifyQuickCapture } from '../utils/ai'
import { AI_CONFIG_STORAGE_KEY, readAiConfig, resolveChatCompletionsUrl } from '../utils/aiConfig'
import { contentToPlainText, getTodayStamp, normalizeBlockDimensions } from '../utils/blocks'

const editableDimensions = ['domain', 'format', 'project']
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}
const CLASSIFICATION_SYSTEM_PROMPT =
  '我传给你一段笔记。请帮我完成两件事：1. 为这段笔记起一个极简的标题（10个字以内，不要任何标点符号）。2. 提取3个维度：domain(领域,最多2个)、format(体裁)、project(项目实体名,没有则留空)。所有输出必须使用【简体中文】。强制输出合法JSON：{"title":"概括性短标题", "domain":[],"format":[],"project":[]}。除 JSON 外不要输出任何多余字符。'
const MotionSection = motion.section
const MotionAside = motion.aside

function extractJsonObject(text = '') {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1]

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text
}

function safeParseClassification(text = '') {
  try {
    const parsed = JSON.parse(extractJsonObject(text))
    return {
      title: typeof parsed?.title === 'string' ? parsed.title.trim() : '',
      domain: Array.isArray(parsed?.domain) ? parsed.domain : ['未分类'],
      format: Array.isArray(parsed?.format) ? parsed.format : ['碎片'],
      project: Array.isArray(parsed?.project) ? parsed.project : [],
    }
  } catch {
    return {
      title: '',
      domain: ['未分类'],
      format: ['碎片'],
      project: [],
    }
  }
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

function formatRevisionTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getRevisionLabel(revision) {
  if (revision?.kind === 'restore') return '恢复记录'
  if (revision?.kind === 'rollback') return '撤回记录'
  return '笔记更新'
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
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const peekBlockId = useFluxStore((state) => state.peekBlockId)
  const recordPoolEvent = useFluxStore((state) => state.recordPoolEvent)
  const restoreBlockRevision = useFluxStore((state) => state.restoreBlockRevision)
  const setPeekBlockId = useFluxStore((state) => state.setPeekBlockId)
  const updateBlock = useFluxStore((state) => state.updateBlock)

  const block = useMemo(
    () => fluxBlocks.find((item) => item.id === blockId) ?? null,
    [blockId, fluxBlocks],
  )

  const currentDimensions = useMemo(
    () => normalizeBlockDimensions(block?.dimensions ?? {}),
    [block?.dimensions],
  )
  const peekBlock = useMemo(
    () => fluxBlocks.find((item) => item.id === peekBlockId) ?? null,
    [fluxBlocks, peekBlockId],
  )
  const peekDimensions = useMemo(
    () => normalizeBlockDimensions(peekBlock?.dimensions ?? {}),
    [peekBlock?.dimensions],
  )
  const peekBlockRevisions = useMemo(
    () => (peekBlock?.revisions ?? []).slice(0, 5),
    [peekBlock?.revisions],
  )
  const activeDocumentKey = blockId ?? 'new'
  const activeEditorBlockId = blockId ?? pendingCreatedIdRef.current ?? null
  const activeEditorBlockTitle = title.trim() || block?.title || ''
  const noteBadge = block?.id ? block.id.replace('block_', '').slice(-6) : 'new'
  const [selectedRevisionId, setSelectedRevisionId] = useState(null)
  const selectedRevision = useMemo(
    () =>
      peekBlockRevisions.find((revision) => revision.id === selectedRevisionId)
      ?? peekBlockRevisions[0]
      ?? null,
    [peekBlockRevisions, selectedRevisionId],
  )
  const selectedRevisionSourceBlock = useMemo(
    () =>
      selectedRevision?.sourceBlockId
        ? fluxBlocks.find((item) => item.id === selectedRevision.sourceBlockId) ?? null
        : null,
    [fluxBlocks, selectedRevision?.sourceBlockId],
  )
  const isSelectedRevisionCurrent = Boolean(
    peekBlock && selectedRevision && (peekBlock.content ?? '') === (selectedRevision.afterContent ?? ''),
  )

  useEffect(
    () => () => {
      window.clearTimeout(titleSaveTimeoutRef.current)
      window.clearTimeout(contentSaveTimeoutRef.current)
      setPeekBlockId(null)
    },
    [setPeekBlockId],
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

  useEffect(() => {
    setSelectedRevisionId((current) => {
      if (!peekBlockRevisions.length) return null
      if (current && peekBlockRevisions.some((revision) => revision.id === current)) return current
      return peekBlockRevisions[0].id
    })
  }, [peekBlockRevisions])

  const enrichBlockWithAi = useCallback(async (targetId, rawTitle, rawContent) => {
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
  }, [updateBlock])

  const persistDocument = useCallback((nextTitle, nextContent) => {
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
  }, [addBlock, blockId, enrichBlockWithAi, navigate, updateBlock])

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

    const latestHtml = editorInstance?.getHTML?.() ?? content
    const latestText = contentToPlainText(latestHtml)
    const mergedText = [title.trim(), latestText.trim()].filter(Boolean).join('\n')
    if (!mergedText.trim()) return

    const configRaw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    let aiConfig = null

    try {
      aiConfig = configRaw ? JSON.parse(configRaw) : null
    } catch {
      aiConfig = null
    }

    if (!aiConfig?.apiKey?.trim()) {
      window.alert('请先在左侧边栏底部的设置中配置大模型 API Key！')
      return
    }

    setIsRetagging(true)
    try {
      const response = await fetch(resolveChatCompletionsUrl(aiConfig.baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.model || 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: CLASSIFICATION_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `请为这篇知识笔记重新审视并打标：\n${mergedText}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const rawText = payload?.choices?.[0]?.message?.content ?? ''
      const aiTags = safeParseClassification(rawText)

      updateBlock(activeBlockId, (old) => ({
        dimensions: {
          ...normalizeBlockDimensions(old.dimensions),
          domain: aiTags.domain?.length ? aiTags.domain : ['未分类'],
          format: aiTags.format?.length ? aiTags.format : ['碎片'],
          project: aiTags.project || [],
        },
        updatedAt: getTodayStamp(),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      window.alert(`AI 重新审视失败：${message}`)
    } finally {
      setIsRetagging(false)
    }
  }

  const handleRestoreFromDrawer = () => {
    if (!peekBlock || !selectedRevision || isSelectedRevisionCurrent) return

    const confirmed = window.confirm(
      `确认将《${peekBlock.title || '当前笔记'}》恢复到 ${formatRevisionTime(selectedRevision.createdAt)} 的版本吗？`,
    )
    if (!confirmed) return

    const restoredRevision = restoreBlockRevision(peekBlock.id, selectedRevision.id)
    if (!restoredRevision) return
    setSelectedRevisionId(restoredRevision.id)

    if (restoredRevision.poolContextKey) {
      recordPoolEvent({
        blockId: restoredRevision.blockId,
        blockTitle: restoredRevision.blockTitle,
        message: '已恢复至历史版本',
        poolContextKey: restoredRevision.poolContextKey,
        poolId: restoredRevision.poolId,
        poolName: restoredRevision.poolName,
        type: 'rollback',
      })
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
  }, [block, blockId, content, persistDocument, title])

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
  }, [block, blockId, content, persistDocument, title])

  return (
    <>
      <MotionSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-14 max-w-4xl px-4 pb-16"
      >
        <div className="mb-10 rounded-[32px] border border-zinc-200/80 bg-white/70 px-6 py-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                note {noteBadge}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                {block?.updatedAt ?? 'draft'}
              </span>
              {activePoolContext ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-sm">
                  <Orbit className="h-3.5 w-3.5" />
                  {activePoolContext.name}
                </span>
              ) : null}
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

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {editableDimensions.flatMap((dimension) =>
              currentDimensions[dimension].map((value) => (
                <div
                  key={`${dimension}-${value}`}
                  className={`group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                >
                  <span>{value}</span>
                  <button
                    type="button"
                    className="rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/60"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleRemoveDimension(dimension, value)}
                    aria-label={`删除 ${value}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )),
            )}

            {isAddingTag ? (
              <input
                autoFocus
                value={tagInput}
                placeholder="输入标签并回车..."
                className="w-28 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 outline-none ring-2 ring-indigo-500/10"
                onChange={(event) => setTagInput(event.target.value)}
                onBlur={() => {
                  setTagInput('')
                  setIsAddingTag(false)
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
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsAddingTag(true)}
              >
                <Plus className="h-3 w-3" />
                <span>添加标签</span>
              </button>
            )}

            <button
              type="button"
              className={`ml-auto flex items-center gap-1.5 rounded-md border border-indigo-100/50 bg-indigo-50/50 px-2 py-1 text-[11px] font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70 ${
                isRetagging ? 'animate-pulse' : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleRetagWithAi}
              disabled={isRetagging}
            >
              {isRetagging ? (
                <LoaderCircle className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              <span>{isRetagging ? '✨ AI 思考中...' : 'AI 重新审视'}</span>
            </button>
          </div>

          <div className="h-px w-full bg-zinc-100" />
        </div>

        <EditorToolbar editor={editorInstance} />

        <FluxEditor
          key={activeDocumentKey}
          documentKey={activeDocumentKey}
          initialContent={block?.content ?? content}
          onEditorReady={setEditorInstance}
          sourceBlockId={activeEditorBlockId}
          sourceBlockTitle={activeEditorBlockTitle}
          onChange={(nextValue) => {
            setContent(nextValue.html)
          }}
        />
      </MotionSection>

      <AnimatePresence>
        {peekBlock ? (
          <MotionAside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed top-0 right-0 h-screen w-[500px] overflow-y-auto border-l border-zinc-200/80 bg-white px-10 pt-6 pb-10 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] z-50 md:w-[600px]"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPeekBlockId(null)}
                className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                × 关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(`/write?id=${peekBlock.id}`)
                  setPeekBlockId(null)
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                ✏️ 全屏编辑此笔记
              </button>
            </div>

            <h2 className="mb-4 mt-6 text-2xl font-semibold text-zinc-900">
              {peekBlock.title || 'Untitled Note'}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {editableDimensions.flatMap((dimension) =>
                peekDimensions[dimension].map((value) => (
                  <span
                    key={`peek-${peekBlock.id}-${dimension}-${value}`}
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                  >
                    {value}
                  </span>
                )),
              )}
            </div>

            {peekBlockRevisions.length ? (
              <div className="mt-6 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Version History</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900">
                      最近 {peekBlockRevisions.length} 次版本回看
                    </div>
                  </div>
                  {selectedRevision ? (
                    <button
                      type="button"
                      onClick={handleRestoreFromDrawer}
                      disabled={isSelectedRevisionCurrent}
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      恢复此版本
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {peekBlockRevisions.map((revision) => (
                    <button
                      key={revision.id}
                      type="button"
                      onClick={() => setSelectedRevisionId(revision.id)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                        selectedRevision?.id === revision.id
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {formatRevisionTime(revision.createdAt)}
                    </button>
                  ))}
                </div>

                {selectedRevision ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                        <Clock3 size={12} />
                        {formatRevisionTime(selectedRevision.createdAt)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 font-medium ${
                          isSelectedRevisionCurrent
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-zinc-200 bg-white text-zinc-600'
                        }`}
                      >
                        {isSelectedRevisionCurrent ? '当前版本' : '历史版本'}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                        {getRevisionLabel(selectedRevision)}
                      </span>
                      {selectedRevision.poolName ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                          {selectedRevision.poolName}
                        </span>
                      ) : null}
                    </div>

                    {selectedRevision?.sourceBlockId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/write?id=${selectedRevision.sourceBlockId}`)}
                        className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-200/60 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200/50"
                      >
                        <GitMerge size={10} className="text-zinc-400" />
                        <span>{`灵感来源: ${selectedRevisionSourceBlock?.title || selectedRevision.sourceBlockTitle}`}</span>
                      </button>
                    ) : null}

                    {selectedRevision.contextParagraph ? (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-indigo-500">
                          {selectedRevision.kind === 'assimilation' ? '更新依据' : '恢复参照'}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-indigo-900">
                          {selectedRevision.contextParagraph}
                        </p>
                      </div>
                    ) : null}

                    <AssimilationDiffPanel
                      beforeContent={selectedRevision.beforeContent}
                      afterContent={selectedRevision.afterContent}
                      beforeLabel={selectedRevision.kind === 'assimilation' ? '变更前' : '恢复前'}
                      afterLabel={selectedRevision.kind === 'assimilation' ? '变更后' : '恢复后'}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {peekBlock.content?.trim() ? (
              <div
                className="prose-readable mt-8 text-[15px] leading-relaxed text-zinc-700"
                dangerouslySetInnerHTML={{ __html: peekBlock.content }}
              />
            ) : (
              <div className="mt-8 text-sm font-light leading-relaxed text-zinc-500">
                这篇笔记暂时还没有正文内容。
              </div>
            )}
          </MotionAside>
        ) : null}
      </AnimatePresence>
    </>
  )
}
