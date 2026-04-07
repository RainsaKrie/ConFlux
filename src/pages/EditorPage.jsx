import { useEffect, useMemo, useRef, useState } from 'react'
import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Hash, LoaderCircle, Network, Orbit, Plus, Sparkles, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  buildAssimilationSystemPrompt,
  buildAssimilationUserPrompt,
  buildClassificationSystemPrompt,
  buildRetagUserPrompt,
} from '../ai/prompts'
import { AssimilationInlinePreviewModal } from '../components/assimilation/AssimilationInlinePreviewModal'
import { EditorToolbar, FluxEditor } from '../components/editor/FluxEditor'
import { PeekDrawer } from '../components/editor/PeekDrawer'
import {
  buildContextRecommendationEngine,
  buildDrawerSummary,
  findContextRecommendation,
  readCurrentParagraphText,
} from '../features/recommendation/contextRecommendation'
import { useTranslation } from '../i18n/I18nProvider'
import { useFluxStore } from '../store/useFluxStore'
import { classifyQuickCapture } from '../utils/ai'
import { AI_CONFIG_STORAGE_KEY, isAiConfigReady, readAiConfig, resolveChatCompletionsUrl } from '../utils/aiConfig'
import {
  BLOCK_DIMENSION_DEFAULTS,
  buildBlockId,
  contentToPlainText,
  getTodayStamp,
  normalizeBlockDimensions,
  withBlockDimensionFallbacks,
} from '../utils/blocks'

const primaryEditableDimensions = ['domain', 'format', 'project']
const secondaryEditableDimensions = ['stage', 'source']
const dimensionLabelKeys = {
  domain: 'editor.tagDimension.domain',
  format: 'editor.tagDimension.format',
  project: 'editor.tagDimension.project',
  stage: 'editor.tagDimension.stage',
  source: 'editor.tagDimension.source',
}
const dimensionFallbackValues = {
  domain: BLOCK_DIMENSION_DEFAULTS.domain,
  format: BLOCK_DIMENSION_DEFAULTS.format,
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
const MotionSection = motion.section

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
    const dimensions = withBlockDimensionFallbacks({
      domain: Array.isArray(parsed?.domain) ? parsed.domain : [],
      format: Array.isArray(parsed?.format) ? parsed.format : [],
      project: Array.isArray(parsed?.project) ? parsed.project : [],
    })

    return {
      title: typeof parsed?.title === 'string' ? parsed.title.trim() : '',
      domain: dimensions.domain,
      format: dimensions.format,
      project: dimensions.project,
    }
  } catch {
    const dimensions = withBlockDimensionFallbacks()
    return {
      title: '',
      domain: dimensions.domain,
      format: dimensions.format,
      project: dimensions.project,
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
  const { language, t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [saveState, setSaveState] = useState(() => t('editor.saved'))
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
  const startAiTask = useFluxStore((state) => state.startAiTask)
  const updateBlock = useFluxStore((state) => state.updateBlock)
  const updateAiTask = useFluxStore((state) => state.updateAiTask)

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
  const peekBlockRevisions = useMemo(
    () => (peekBlock?.revisions ?? []).slice(0, 5),
    [peekBlock?.revisions],
  )
  const activeDocumentKey = `${blockId ?? 'new'}-${language}`
  const activeEditorBlockId = blockId ?? pendingCreatedIdRef.current ?? null
  const activeEditorBlockTitle = title.trim() || block?.title || ''
  const noteBadge = block?.id ? block.id.replace('block_', '').slice(-6) : t('common.untitledNote')
  const dimensionLabels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(dimensionLabelKeys).map(([dimension, key]) => [dimension, t(key)]),
      ),
    [t],
  )
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
    setSaveState(t('editor.saved'))
  }, [block?.content, block?.dimensions, block?.id, block?.title, t])

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
    if (!isAiConfigReady(aiConfig)) return

    aiEnrichedIdsRef.current.add(targetId)
    try {
      const aiTags = await classifyQuickCapture(mergedText, aiConfig, language)
      const normalized = normalizeBlockDimensions({
        domain: aiTags.domain,
        format: aiTags.format,
        project: aiTags.project,
      })

      updateBlock(targetId, (old) => ({
        title: shouldReplaceWithAiTitle(old.title, old.content, aiTags.title)
          ? aiTags.title.trim()
          : old.title,
        dimensions: withBlockDimensionFallbacks({
          ...normalizeBlockDimensions(old.dimensions),
          ...normalized,
          domain: aiTags.domain,
          format: aiTags.format,
          project: aiTags.project || [],
        }),
        updatedAt: getTodayStamp(),
      }))
    } finally {
      aiEnrichedIdsRef.current.delete(targetId)
    }
  }, [language, updateBlock])

  const persistDocument = useCallback((nextTitle, nextContent) => {
    const plainTitle = nextTitle.trim()
    const plainContent = contentToPlainText(nextContent)
    if (!plainTitle && !plainContent) {
      setSaveState(t('editor.saved'))
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
      setSaveState(t('editor.saved'))
      return
    }

    const newId = buildBlockId()
    pendingCreatedIdRef.current = newId
    addBlock({
      id: newId,
      title: nextTitle,
      content: nextContent,
      dimensions: withBlockDimensionFallbacks({
        project: [],
      }),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    navigate(`/write?id=${newId}`, { replace: true })
    void enrichBlockWithAi(newId, nextTitle, nextContent)
    setSaveState(t('editor.saved'))
  }, [addBlock, blockId, enrichBlockWithAi, navigate, t, updateBlock])

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
      window.alert(t('editor.missingDraftForTags'))
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
      window.alert(t('editor.missingDraftForRetag'))
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

    if (!isAiConfigReady(aiConfig)) {
      window.alert(t('editor.missingApiKey'))
      return
    }

    const taskId = startAiTask({
      blockId: activeBlockId,
      blockTitle: title.trim() || block?.title || t('common.untitledNote'),
      message: t('editor.retagTaskRunning'),
      type: 'retag',
    })

    setIsRetagging(true)
    try {
      const response = await fetch(resolveChatCompletionsUrl(aiConfig.baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.model.trim(),
          messages: [
            {
              role: 'system',
              content: buildClassificationSystemPrompt(language),
            },
            {
              role: 'user',
              content: buildRetagUserPrompt(mergedText, language),
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
        dimensions: withBlockDimensionFallbacks({
          ...normalizeBlockDimensions(old.dimensions),
          domain: aiTags.domain,
          format: aiTags.format,
          project: aiTags.project || [],
        }),
        updatedAt: getTodayStamp(),
      }))
      updateAiTask(taskId, {
        message: t('editor.retagTaskDone'),
        status: 'succeeded',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateAiTask(taskId, {
        message: t('editor.retagTaskFailed', { message }),
        status: 'failed',
      })
      window.alert(t('editor.retagFailed', { message }))
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
      window.alert(t('editor.assimilationNeedRecommendation'))
      return
    }

    const aiConfig = readAiConfig()
    if (!isAiConfigReady(aiConfig)) {
      window.alert(t('editor.missingApiKey'))
      return
    }

    const noteTitle = title.trim() || block?.title || t('common.untitledNote')
    const paragraph = drawerRecommendation.paragraph.trim()
    const taskId = startAiTask({
      blockId: activeEditorBlockId,
      blockTitle: activeEditorBlockTitle || noteTitle,
      message: t('editor.assimilationTaskRunning'),
      targetBlockId: peekBlock.id,
      targetBlockTitle: peekBlock.title,
      type: 'assimilation',
    })

    setAssimilatingTargetId(peekBlock.id)
    try {
      const response = await fetch(resolveChatCompletionsUrl(aiConfig.baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.model.trim(),
          messages: [
            {
              role: 'system',
              content: buildAssimilationSystemPrompt(language),
            },
            {
              role: 'user',
              content: buildAssimilationUserPrompt(
                {
                  noteTitle,
                  paragraph,
                  targetTitle: peekBlock.title,
                  targetContent: peekBlock.content || '',
                },
                language,
              ),
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
        throw new Error(language === 'en' ? 'Model returned empty content' : '模型没有返回可用内容')
      }

      setAssimilationPreview({
        afterContent: nextContent,
        beforeContent: peekBlock.content || '',
        blockId: peekBlock.id,
        blockTitle: peekBlock.title,
        contextParagraph: paragraph,
      })
      setPeekBlockId(peekBlock.id)
      updateAiTask(taskId, {
        message: t('editor.assimilationTaskDone'),
        status: 'succeeded',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateAiTask(taskId, {
        message: t('editor.assimilationTaskFailed', { message }),
        status: 'failed',
      })
      window.alert(t('editor.assimilationFailed', { message }))
    } finally {
      setAssimilatingTargetId(null)
    }
  }, [
    activeEditorBlockId,
    activeEditorBlockTitle,
    block?.title,
    drawerRecommendation,
    isRecommendationDrawerActive,
    language,
    peekBlock,
    setPeekBlockId,
    startAiTask,
    t,
    title,
    updateAiTask,
  ])

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
        message: t('editor.poolEventAssimilation'),
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
    t,
  ])

  const formatRevisionRestoreTime = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleClosePeekDrawer = useCallback(() => {
    setPeekBlockId(null)
    setDrawerRecommendation(null)
    setDrawerSummary('')
  }, [setPeekBlockId])

  const handleNavigateToPeekBlock = useCallback(() => {
    if (!peekBlock) return
    navigate(`/write?id=${peekBlock.id}`)
    setPeekBlockId(null)
  }, [navigate, peekBlock, setPeekBlockId])

  const handleNavigateToSourceBlock = useCallback(() => {
    if (!selectedRevision?.sourceBlockId) return
    navigate(`/write?id=${selectedRevision.sourceBlockId}`)
  }, [navigate, selectedRevision?.sourceBlockId])

  const handleRestoreFromDrawer = () => {
    if (!peekBlock || !selectedRevision || isSelectedRevisionCurrent) return

    const confirmed = window.confirm(
      t('editor.confirmRestore', {
        title: peekBlock.title || t('common.untitledNote'),
        time: formatRevisionRestoreTime(selectedRevision.createdAt),
      }),
    )
    if (!confirmed) return

    const restoredRevision = restoreBlockRevision(peekBlock.id, selectedRevision.id)
    if (!restoredRevision) return
    setSelectedRevisionId(restoredRevision.id)

    if (restoredRevision.poolContextKey) {
      recordPoolEvent({
        blockId: restoredRevision.blockId,
        blockTitle: restoredRevision.blockTitle,
        message: t('editor.poolEventRollback'),
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
      setSaveState(t('editor.saved'))
      return
    }

    setSaveState(t('editor.saving'))
    window.clearTimeout(titleSaveTimeoutRef.current)
    titleSaveTimeoutRef.current = window.setTimeout(() => {
      persistDocument(title, content)
    }, 500)

    return () => {
      window.clearTimeout(titleSaveTimeoutRef.current)
    }
  }, [block, blockId, content, persistDocument, t, title])

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false
      return
    }

    if (blockId && block && content === (block.content ?? '')) {
      setSaveState(t('editor.saved'))
      return
    }

    setSaveState(t('editor.saving'))
    window.clearTimeout(contentSaveTimeoutRef.current)
    contentSaveTimeoutRef.current = window.setTimeout(() => {
      persistDocument(title, content)
    }, 1000)

    return () => {
      window.clearTimeout(contentSaveTimeoutRef.current)
    }
  }, [block, blockId, content, persistDocument, t, title])

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
                {t('editor.noteBadge', { badge: noteBadge })}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                {block?.updatedAt ?? t('editor.draft')}
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
            placeholder={t('editor.titlePlaceholder')}
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
                    aria-label={`${t('common.remove')}${dimensionLabels[dimension]} ${value}`}
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
                  placeholder={t('editor.tagInputPlaceholder')}
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
                  {t('editor.addTag')}
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
                  {t('editor.cancelTag')}
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
                  <span>{t('editor.addTagButton')}</span>
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
              <span>{isRetagging ? t('editor.retagBusy') : t('editor.retagIdle')}</span>
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
                      aria-label={`${t('common.remove')}${dimensionLabels[dimension]} ${value}`}
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
        aria-label={
          recommendedBlock
            ? t('editor.recommendationAria', { title: recommendedBlock.title })
            : t('editor.recommendationEmptyAria')
        }
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full border border-zinc-200/50 bg-white/80 px-2 py-1 text-[10px] text-zinc-400 shadow-sm transition-all hover:text-indigo-600 ${
          recommendedBlock ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <Network size={10} strokeWidth={2} />
        <span>{t('editor.recommendationCta')}</span>
      </button>

      <AnimatePresence>
        {assimilationPreview ? (
          <AssimilationInlinePreviewModal
            preview={assimilationPreview}
            onApply={handleApplyAssimilation}
            onCancel={handleCancelAssimilationPreview}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {peekBlock ? (
          <PeekDrawer
            assimilatingTargetId={assimilatingTargetId}
            drawerRecommendation={drawerRecommendation}
            drawerSummary={drawerSummary}
            isRecommendationDrawerActive={isRecommendationDrawerActive}
            isSelectedRevisionCurrent={isSelectedRevisionCurrent}
            onAssimilateRecommendation={handleAssimilateRecommendation}
            onClose={handleClosePeekDrawer}
            onExtractDrawerSummary={handleExtractDrawerSummary}
            onNavigateToPeekBlock={handleNavigateToPeekBlock}
            onNavigateToSourceBlock={handleNavigateToSourceBlock}
            onRestoreRevision={handleRestoreFromDrawer}
            onSelectRevision={setSelectedRevisionId}
            peekBlock={peekBlock}
            peekBlockRevisions={peekBlockRevisions}
            peekDimensions={peekDimensions}
            selectedRevision={selectedRevision}
            selectedRevisionSourceBlock={selectedRevisionSourceBlock}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

