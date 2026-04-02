import { useEffect, useMemo, useRef, useState } from 'react'
import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock3, ExternalLink, GitMerge, Hash, LoaderCircle, Network, Orbit, Plus, Sparkles, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ASSIMILATION_SYSTEM_PROMPT } from '../ai/prompts'
import { RevisionDiffPanel } from '../components/assimilation/RevisionDiffPanel'
import { EditorToolbar, FluxEditor } from '../components/editor/FluxEditor'
import {
  buildContextRecommendationEngine,
  buildDrawerSummary,
  findContextRecommendation,
  readCurrentParagraphText,
} from '../features/recommendation/contextRecommendation'
import { useFluxStore } from '../store/useFluxStore'
import { classifyQuickCapture } from '../utils/ai'
import { AI_CONFIG_STORAGE_KEY, readAiConfig, resolveChatCompletionsUrl } from '../utils/aiConfig'
import { buildBlockId, contentToPlainText, getTodayStamp, normalizeBlockDimensions } from '../utils/blocks'

const primaryEditableDimensions = ['domain', 'format', 'project']
const secondaryEditableDimensions = ['stage', 'source']
const dimensionLabels = {
  domain: '领域',
  format: '体裁',
  project: '项目',
  stage: '阶段',
  source: '来源',
}
const dimensionFallbackValues = {
  domain: '未分类',
  format: '碎片',
  project: null,
  stage: null,
  source: null,
}
const dimensionInputTextStyles = {
  domain: 'text-blue-500',
  format: 'text-zinc-500',
  project: 'text-purple-500',
  stage: 'text-amber-600',
  source: 'text-emerald-600',
}
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
  stage: 'border border-amber-100 bg-amber-50 text-amber-700',
  source: 'border border-emerald-100 bg-emerald-50 text-emerald-700',
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

function extractAssimilationContent(text = '') {
  const fenced = text.match(/```(?:html|markdown)?\s*([\s\S]*?)```/i)
  return (fenced?.[1] ?? text).trim()
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
  if (revision?.kind === 'rollback') return '回滚记录'
  return '笔记更新'
}

function parseTagInputRoute(inputValue = '') {
  const trimmed = inputValue.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('@')) {
    const value = trimmed.slice(1).trim()
    return value ? { dimension: 'domain', value } : null
  }

  if (trimmed.startsWith('/')) {
    const value = trimmed.slice(1).trim()
    return value ? { dimension: 'format', value } : null
  }

  if (trimmed.startsWith('!')) {
    const value = trimmed.slice(1).trim()
    return value ? { dimension: 'stage', value } : null
  }

  if (trimmed.startsWith('^')) {
    const value = trimmed.slice(1).trim()
    return value ? { dimension: 'source', value } : null
  }

  return {
    dimension: 'project',
    value: trimmed,
  }
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
  const [contextRecommendation, setContextRecommendation] = useState(null)
  const [drawerRecommendation, setDrawerRecommendation] = useState(null)
  const [drawerSummary, setDrawerSummary] = useState('')
  const [assimilatingTargetId, setAssimilatingTargetId] = useState(null)
  const [assimilationPreview, setAssimilationPreview] = useState(null)
  const [editorInstance, setEditorInstance] = useState(null)
  const titleSaveTimeoutRef = useRef(null)
  const contentSaveTimeoutRef = useRef(null)
  const recommendationTimeoutRef = useRef(null)
  const pendingCreatedIdRef = useRef(null)
  const aiEnrichedIdsRef = useRef(new Set())
  const isHydratingRef = useRef(false)
  const blockId = searchParams.get('id')
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const addBlock = useFluxStore((state) => state.addBlock)
  const applyAssimilationRevision = useFluxStore((state) => state.applyAssimilationRevision)
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
  const hasSecondaryMetadata = useMemo(
    () => secondaryEditableDimensions.some((dimension) => (currentDimensions[dimension] ?? []).length > 0),
    [currentDimensions],
  )
  const peekBlock = useMemo(
    () => fluxBlocks.find((item) => item.id === peekBlockId) ?? null,
    [fluxBlocks, peekBlockId],
  )
  const peekDimensions = useMemo(
    () => normalizeBlockDimensions(peekBlock?.dimensions ?? {}),
    [peekBlock?.dimensions],
  )
  const peekHasSecondaryMetadata = useMemo(
    () => secondaryEditableDimensions.some((dimension) => (peekDimensions[dimension] ?? []).length > 0),
    [peekDimensions],
  )
  const peekBlockRevisions = useMemo(
    () => (peekBlock?.revisions ?? []).slice(0, 5),
    [peekBlock?.revisions],
  )
  const activeDocumentKey = blockId ?? 'new'
  const activeEditorBlockId = blockId ?? pendingCreatedIdRef.current ?? null
  const activeEditorBlockTitle = title.trim() || block?.title || ''
  const noteBadge = block?.id ? block.id.replace('block_', '').slice(-6) : 'new'
  const recommendationEngine = useMemo(
    () => buildContextRecommendationEngine(fluxBlocks, activeEditorBlockId),
    [activeEditorBlockId, fluxBlocks],
  )
  const recommendedBlock = useMemo(
    () =>
      contextRecommendation?.block?.id
        ? fluxBlocks.find((item) => item.id === contextRecommendation.block.id) ?? contextRecommendation.block
        : null,
    [contextRecommendation, fluxBlocks],
  )
  const isRecommendationDrawerActive = Boolean(
    drawerRecommendation?.targetBlockId && peekBlockId === drawerRecommendation.targetBlockId,
  )
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
      window.clearTimeout(recommendationTimeoutRef.current)
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
    setIsAddingTag(false)
    setTagInput('')
    setContextRecommendation(null)
    setDrawerRecommendation(null)
    setDrawerSummary('')
    setAssimilationPreview(null)
    setSaveState('所有修改已自动保存')
  }, [block?.content, block?.dimensions, block?.id, block?.title])

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

    const newId = buildBlockId()
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

    const parsedRoute = parseTagInputRoute(tagInput)
    if (!parsedRoute) return

    const { dimension, value } = parsedRoute
    let didCommit = false

    updateBlock(activeBlockId, (old) => {
      const dimensions = normalizeBlockDimensions(old.dimensions)
      const currentValues = dimensions[dimension] ?? []
      const fallbackValue = dimensionFallbackValues[dimension]
      const nextValues = fallbackValue && value !== fallbackValue
        ? currentValues.filter((item) => item !== fallbackValue)
        : currentValues

      if (nextValues.includes(value)) {
        return null
      }

      didCommit = true
      return {
        dimensions: {
          ...dimensions,
          [dimension]: [...nextValues, value],
        },
        updatedAt: getTodayStamp(),
      }
    })

    if (didCommit) {
      setTagInput('')
      setIsAddingTag(false)
    }
  }

  const tagInputTextClass = useMemo(() => {
    const parsedRoute = parseTagInputRoute(tagInput)
    const dimension = parsedRoute?.dimension ?? 'project'
    return dimensionInputTextStyles[dimension]
  }, [tagInput])

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
      window.alert('请先在左侧边栏底部的设置中配置大模型 API 密钥。')
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

  const getCurrentParagraphSnapshot = useCallback(() => {
    const activeBlockId = blockId || pendingCreatedIdRef.current

    return {
      activeBlockId,
      noteTitle: title.trim() || block?.title || '',
      paragraph: readCurrentParagraphText(editorInstance),
    }
  }, [block?.title, blockId, editorInstance, title])

  const handleOpenRecommendationDrawer = useCallback(() => {
    if (!recommendedBlock || !contextRecommendation) return

    setDrawerRecommendation({
      matchedTerms: contextRecommendation.matchedTerms,
      paragraph: contextRecommendation.paragraph,
      targetBlockId: recommendedBlock.id,
    })
    setDrawerSummary('')
    setPeekBlockId(recommendedBlock.id)
  }, [contextRecommendation, recommendedBlock, setPeekBlockId])

  const handleExtractDrawerSummary = useCallback(() => {
    if (!peekBlock) return

    const plainText = contentToPlainText(peekBlock.content || '')
    setDrawerSummary(buildDrawerSummary(plainText))
  }, [peekBlock])

  const handleAssimilateRecommendation = useCallback(async () => {
    if (!peekBlock || !isRecommendationDrawerActive || !drawerRecommendation?.paragraph?.trim()) {
      window.alert('请先从智能推荐打开候选笔记，再执行原文更新。')
      return
    }

    const aiConfig = readAiConfig()
    if (!aiConfig.apiKey?.trim()) {
      window.alert('请先在左侧边栏底部的设置中配置大模型 API 密钥。')
      return
    }

    const noteTitle = title.trim() || block?.title || '未命名笔记'
    const paragraph = drawerRecommendation.paragraph.trim()

    setAssimilatingTargetId(peekBlock.id)
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
              content: ASSIMILATION_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `【当前写作段落】：\n标题：${noteTitle}\n段落：${paragraph}\n\n【需要被更新的原始笔记标题】：\n${
                peekBlock.title
              }\n\n【原始笔记正文】：\n${peekBlock.content || '暂无内容'}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const rawText = payload?.choices?.[0]?.message?.content ?? ''
      const normalizedText = extractAssimilationContent(rawText)
      const nextContent = normalizedText.startsWith('<')
        ? normalizedText
        : `<p>${normalizedText.replace(/\n/g, '<br />')}</p>`

      if (!contentToPlainText(nextContent).trim()) {
        throw new Error('模型没有返回可用内容')
      }

      setAssimilationPreview({
        afterContent: nextContent,
        beforeContent: peekBlock.content || '',
        blockId: peekBlock.id,
        blockTitle: peekBlock.title,
        contextParagraph: paragraph,
      })
      setPeekBlockId(peekBlock.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      window.alert(`原文更新失败：${message}`)
    } finally {
      setAssimilatingTargetId(null)
    }
  }, [block?.title, drawerRecommendation, isRecommendationDrawerActive, peekBlock, setPeekBlockId, title])

  const handleCancelAssimilationPreview = useCallback(() => {
    setAssimilationPreview(null)
  }, [])

  const handleApplyAssimilation = useCallback(() => {
    if (!assimilationPreview) return

    const storedRevision = applyAssimilationRevision({
      id: `context_assimilation_${Date.now()}`,
      afterContent: assimilationPreview.afterContent,
      beforeContent: assimilationPreview.beforeContent,
      blockId: assimilationPreview.blockId,
      blockTitle: assimilationPreview.blockTitle,
      contextParagraph: assimilationPreview.contextParagraph,
      kind: 'assimilation',
      poolContextKey: activePoolContext?.key ?? null,
      poolId: activePoolContext?.poolId ?? null,
      poolName: activePoolContext?.name ?? null,
      sourceBlockId: activeEditorBlockId,
      sourceBlockTitle: activeEditorBlockTitle,
    })

    if (storedRevision && activePoolContext?.key) {
      recordPoolEvent({
        blockId: assimilationPreview.blockId,
        blockTitle: assimilationPreview.blockTitle,
        message: '已更新原始笔记',
        poolContextKey: activePoolContext.key,
        poolId: activePoolContext.poolId,
        poolName: activePoolContext.name,
        type: 'assimilation',
      })
    }

    setAssimilationPreview(null)
    setPeekBlockId(assimilationPreview.blockId)
  }, [
    activeEditorBlockId,
    activeEditorBlockTitle,
    activePoolContext,
    applyAssimilationRevision,
    assimilationPreview,
    recordPoolEvent,
    setPeekBlockId,
  ])

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

  useEffect(() => {
    if (isHydratingRef.current) return undefined

    window.clearTimeout(recommendationTimeoutRef.current)
    recommendationTimeoutRef.current = window.setTimeout(() => {
      const { paragraph } = getCurrentParagraphSnapshot()
      if (!paragraph.trim()) {
        setContextRecommendation(null)
        return
      }

      const nextRecommendation = findContextRecommendation({
        activePoolContext,
        engine: recommendationEngine,
        paragraph,
      })
      setContextRecommendation(nextRecommendation)
    }, 2500)

    return () => {
      window.clearTimeout(recommendationTimeoutRef.current)
    }
  }, [activePoolContext, content, getCurrentParagraphSnapshot, recommendationEngine])

  useEffect(() => {
    if (!drawerRecommendation?.targetBlockId) return
    if (peekBlockId === drawerRecommendation.targetBlockId) return

    setDrawerRecommendation(null)
    setDrawerSummary('')
  }, [drawerRecommendation?.targetBlockId, peekBlockId])

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
            {primaryEditableDimensions.flatMap((dimension) =>
              currentDimensions[dimension].map((value) => (
                <div
                  key={`${dimension}-${value}`}
                  className={`group inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                >
                  <span className="opacity-70">{dimensionLabels[dimension]}</span>
                  <span>·</span>
                  <span>{value}</span>
                  <button
                    type="button"
                    className="rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/60"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleRemoveDimension(dimension, value)}
                    aria-label={`删除${dimensionLabels[dimension]}标签 ${value}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )),
            )}

            {isAddingTag ? (
              <div className="inline-flex min-w-[320px] flex-1 flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 shadow-sm">
                <input
                  autoFocus
                  value={tagInput}
                  placeholder="输入标签... (@领域 /体裁 !阶段 ^来源)"
                  className={`w-48 min-w-[180px] flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] outline-none ring-2 ring-indigo-500/10 placeholder:text-zinc-400 ${tagInputTextClass}`}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddTag()
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      setTagInput('')
                      setIsAddingTag(false)
                    }
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-800"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleAddTag}
                >
                  添加
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setTagInput('')
                    setIsAddingTag(false)
                  }}
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setIsAddingTag(true)}
                >
                  <Plus className="h-3 w-3" />
                  <span>添加标签</span>
                </button>
              </>
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
                <Sparkles size={12} strokeWidth={2} />
              )}
              <span>{isRetagging ? 'AI 审视中...' : 'AI 重新审视'}</span>
            </button>
          </div>

          {hasSecondaryMetadata ? (
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-zinc-300">
              <span className="select-none text-[10px]">|</span>
              {secondaryEditableDimensions.flatMap((dimension) =>
                (currentDimensions[dimension] ?? []).map((value) => (
                  <div
                    key={`secondary-${dimension}-${value}`}
                    className={`group inline-flex items-center ${
                      dimension === 'stage'
                        ? 'text-center text-[10px] uppercase font-mono tracking-wider text-zinc-400 bg-transparent border border-zinc-200/50 border-dashed px-1.5 py-0.5 rounded-sm'
                        : 'text-[10px] text-zinc-400/80 bg-transparent hover:text-zinc-500 transition-colors items-center gap-1'
                    }`}
                  >
                    {dimension === 'source' ? <Hash size={8} strokeWidth={2} className="shrink-0" /> : null}
                    <span>{dimension === 'stage' ? `!${value}` : value}</span>
                    <button
                      type="button"
                      className="ml-1 rounded-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-600"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleRemoveDimension(dimension, value)}
                      aria-label={`删除${dimensionLabels[dimension]}标签 ${value}`}
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                )),
              )}
            </div>
          ) : null}

          <div className="h-px w-full bg-zinc-100" />
        </div>

        <EditorToolbar editor={editorInstance} />

        <FluxEditor
          key={activeDocumentKey}
          initialContent={block?.content ?? content}
          onEditorReady={setEditorInstance}
          onChange={(nextValue) => {
            setContent(nextValue.html)
          }}
        />
      </MotionSection>

      <button
        type="button"
        onClick={handleOpenRecommendationDrawer}
        aria-label={recommendedBlock ? `打开智能推荐候选：${recommendedBlock.title}` : '暂无智能推荐'}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full border border-zinc-200/50 bg-white/80 px-2 py-1 text-[10px] text-zinc-400 shadow-sm transition-all hover:text-indigo-600 ${
          recommendedBlock ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <Network size={10} strokeWidth={2} />
        <span>发现相关节点</span>
      </button>

      <AnimatePresence>
        {assimilationPreview ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-zinc-900/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="absolute left-1/2 top-1/2 flex max-h-[86vh] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-zinc-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">原文更新预览</div>
                    <h3 className="mt-1 text-xl font-semibold text-zinc-950">{assimilationPreview.blockTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      这次只会把当前段落的新增信息合并进原始笔记。请先核对预览，再决定是否写回。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelAssimilationPreview}
                    className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                  >
                    取消
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <RevisionDiffPanel
                    beforeContent={assimilationPreview.beforeContent}
                    afterContent={assimilationPreview.afterContent}
                    beforeLabel="当前版本"
                    afterLabel="拟更新后"
                    className="md:col-span-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
                <div className="text-xs text-zinc-400">应用后仍可在右侧抽屉的版本历史中恢复。</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelAssimilationPreview}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                  >
                    暂不应用
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAssimilation}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                  >
                    <Check size={12} strokeWidth={2} />
                    <span>确认更新</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
                onClick={() => {
                  setPeekBlockId(null)
                  setDrawerRecommendation(null)
                  setDrawerSummary('')
                }}
                className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <span className="inline-flex items-center gap-1.5">
                  <X size={12} strokeWidth={2} />
                  <span>关闭</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(`/write?id=${peekBlock.id}`)
                  setPeekBlockId(null)
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink size={12} strokeWidth={2} />
                  <span>打开完整编辑页</span>
                </span>
              </button>
            </div>

            {isRecommendationDrawerActive ? (
              <div className="mt-5 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">智能推荐</div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      当前候选由本地段落推荐触发，仅在你确认后才会执行原文更新。
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExtractDrawerSummary}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Sparkles size={12} strokeWidth={2} />
                      <span>提取核心摘要</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAssimilateRecommendation()}
                      disabled={assimilatingTargetId === peekBlock.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
                    >
                      {assimilatingTargetId === peekBlock.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitMerge size={12} strokeWidth={2} />
                      )}
                      <span>更新原文</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">当前段落</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{drawerRecommendation?.paragraph}</p>
                </div>

                {drawerRecommendation?.matchedTerms?.length ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {drawerRecommendation.matchedTerms.slice(0, 4).map((term) => (
                      <span
                        key={`${peekBlock.id}-${term}`}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : null}

                {drawerSummary ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600">本地摘要</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">{drawerSummary}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <h2 className="mb-4 mt-6 text-2xl font-semibold text-zinc-900">
              {peekBlock.title || '未命名笔记'}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {primaryEditableDimensions.flatMap((dimension) =>
                peekDimensions[dimension].map((value) => (
                  <span
                    key={`peek-${peekBlock.id}-${dimension}-${value}`}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                  >
                    <span className="opacity-70">{dimensionLabels[dimension]}</span>
                    <span>·</span>
                    <span>{value}</span>
                  </span>
                )),
              )}
            </div>

            {peekHasSecondaryMetadata ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-zinc-300">
                <span className="select-none text-[10px]">|</span>
                {secondaryEditableDimensions.flatMap((dimension) =>
                  (peekDimensions[dimension] ?? []).map((value) => (
                    <span
                      key={`peek-secondary-${peekBlock.id}-${dimension}-${value}`}
                      className={`inline-flex items-center ${
                        dimension === 'stage'
                          ? 'text-center text-[10px] uppercase font-mono tracking-wider text-zinc-400 bg-transparent border border-zinc-200/50 border-dashed px-1.5 py-0.5 rounded-sm'
                          : 'gap-1 text-[10px] text-zinc-400/80 bg-transparent'
                      }`}
                    >
                      {dimension === 'source' ? <Hash size={8} strokeWidth={2} className="shrink-0" /> : null}
                      <span>{dimension === 'stage' ? `!${value}` : value}</span>
                    </span>
                  )),
                )}
              </div>
            ) : null}

            {peekBlockRevisions.length ? (
              <div className="mt-6 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">版本历史</div>
                    <div className="mt-1 text-sm font-medium text-zinc-900">
                      最近 {peekBlockRevisions.length} 次版本记录
                    </div>
                  </div>
                  {selectedRevision ? (
                    <button
                      type="button"
                      onClick={handleRestoreFromDrawer}
                      disabled={isSelectedRevisionCurrent}
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-45"
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
                        <GitMerge size={10} strokeWidth={2} className="text-zinc-400" />
                        <span>{`来源笔记: ${selectedRevisionSourceBlock?.title || selectedRevision.sourceBlockTitle}`}</span>
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

                    <RevisionDiffPanel
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

