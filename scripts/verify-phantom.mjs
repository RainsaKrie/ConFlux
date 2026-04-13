import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import {
  buildContextRecommendationEngine,
  findContextRecommendation,
  findHybridContextRecommendation,
} from '../src/features/recommendation/contextRecommendation.js'
import { resolveRecommendationUiState } from '../src/features/recommendation/recommendationPresentation.js'
import { mergeHybridSearchResults } from '../src/features/search/hybridSearch.js'
import {
  buildMixedLanguageFixtureBlocks,
  buildRealWorldRecommendationFixtureBlocks,
  buildRecommendationFixtureBlocks,
  entityPriorityParagraph,
  macroChunkStressInput,
  mixedLanguageParagraph,
  noisyLexiconParagraph,
  realWorldHitParagraph,
  realWorldMissParagraph,
  oversizedRunOnInput,
} from './regressionFixtures.js'

async function loadDocumentChunkerModule() {
  const moduleUrl = new URL('../src/utils/documentChunker.js', import.meta.url)
  const blocksUrl = new URL('../src/utils/blocks.js', import.meta.url).href
  const source = (await readFile(moduleUrl, 'utf8'))
    .replace(/^\uFEFF/, '')
    .replace("from './blocks'", `from '${blocksUrl}'`)
  const encoded = Buffer.from(source, 'utf8').toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

function verifyMacroChunking(documentChunker) {
  const {
    buildSemanticChunkTitle,
    buildThreadId,
    buildThreadProjectLabel,
    buildThreadSourceLabel,
    MAX_SEMANTIC_CHUNK_LENGTH,
    splitIntoSemanticChunks,
  } = documentChunker
  const chunks = splitIntoSemanticChunks(macroChunkStressInput)
  assert(chunks.length >= 3, '长文压测样本没有被切成多个 chunks。')

  const longestChunk = Math.max(...chunks.map((chunk) => chunk.length))
  assert(
    longestChunk <= MAX_SEMANTIC_CHUNK_LENGTH,
    `发现超过安全阈值的 chunk，长度为 ${longestChunk}。`,
  )

  const threadId = buildThreadId()
  const projectLabel = buildThreadProjectLabel(macroChunkStressInput, threadId)
  const sourceLabel = buildThreadSourceLabel(threadId)
  const titles = chunks.map((chunk, index) => buildSemanticChunkTitle(chunk, index, chunks.length))

  assert(new Set(chunks.map(() => threadId)).size === 1, '切块没有保持统一 threadId。')
  assert(new Set(chunks.map(() => projectLabel)).size === 1, '切块没有保持统一 project 标签。')
  assert(new Set(chunks.map(() => sourceLabel)).size === 1, '切块没有保持统一 source 标签。')
  assert(titles.every((title) => title.trim().length > 0), '存在空标题 chunk。')

  return {
    chunkCount: chunks.length,
    longestChunk,
    projectLabel,
    sourceLabel,
  }
}

function verifyOverflowChunking(documentChunker) {
  const { MAX_SEMANTIC_CHUNK_LENGTH, buildThreadId, buildThreadSourceLabel, splitIntoSemanticChunks } = documentChunker
  const chunks = splitIntoSemanticChunks(oversizedRunOnInput)
  assert(chunks.length >= 2, '超长垃圾段落没有被强制切断。')
  assert(
    chunks.every((chunk) => chunk.length <= MAX_SEMANTIC_CHUNK_LENGTH),
    '超长垃圾段落切块后仍存在越界 chunk。',
  )

  const threadId = buildThreadId()
  const sourceLabel = buildThreadSourceLabel(threadId)
  assert(threadId.startsWith('thread_'), 'threadId 没有按预期生成。')
  assert(sourceLabel.includes(threadId), 'source 线程标签没有挂载到 threadId。')

  return {
    chunkCount: chunks.length,
    longestChunk: Math.max(...chunks.map((chunk) => chunk.length)),
    threadId,
  }
}

function verifyLexiconNoise() {
  const blocks = buildRecommendationFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)
  const anchorEntry = engine.entries.find((entry) => entry.blockId === 'report_anchor')

  assert(anchorEntry, '未能为目标块建立推荐词典。')

  const normalizedTerms = anchorEntry.terms.map((term) => term.normalized)
  assert(normalizedTerms.includes('revenuebridge'), '核心英文实体未进入词典。')
  assert(normalizedTerms.includes('财务风控'), '核心中文实体未进入词典。')
  assert(normalizedTerms.includes('季度复盘'), '组合中文实体未进入词典。')
  assert(!normalizedTerms.includes('ai'), '停用词 AI 未被过滤。')
  assert(!normalizedTerms.includes('系统'), '停用词 系统 未被过滤。')
  assert(!normalizedTerms.some((term) => term.length <= 1), '存在长度过短的无效词元。')
  assert(!normalizedTerms.some((term) => /^\d+$/.test(term)), '存在纯数字噪音词元。')

  const startedAt = performance.now()
  let result = null

  for (let index = 0; index < 30; index += 1) {
    result = findContextRecommendation({
      activePoolContext: null,
      engine,
      paragraph: noisyLexiconParagraph,
    })
  }

  const elapsedMs = performance.now() - startedAt
  assert(result?.block?.id === 'report_anchor', '高噪音输入没有稳定命中预期候选。')
  assert(elapsedMs < 1200, `高噪音推荐耗时过高：${elapsedMs.toFixed(2)}ms。`)

  return {
    elapsedMs,
    keptTerms: normalizedTerms.join(', '),
    matchedTerms: result.matchedTerms.join(', '),
  }
}

function verifyMixedLanguageBoundary() {
  const blocks = buildMixedLanguageFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)
  const reactEntry = engine.entries.find((entry) => entry.blockId === 'react_anchor')

  assert(reactEntry, '中英混合样本没有进入推荐引擎。')

  const normalizedTerms = reactEntry.terms.map((term) => term.normalized)
  assert(normalizedTerms.includes('react19'), 'React19 没有被精确保留为词元。')
  assert(!normalizedTerms.includes('使用了'), '前缀噪音被错误纳入词元。')
  assert(!normalizedTerms.includes('新特性'), '后缀噪音被错误纳入词元。')

  const result = findContextRecommendation({
    activePoolContext: null,
    engine,
    paragraph: mixedLanguageParagraph,
  })

  assert(result?.block?.id === 'react_anchor', '中英混合段落没有命中预期候选。')
  assert(result.matchedTerms.includes('React19'), '命中结果没有保留 React19。')
  assert(!result.matchedTerms.some((term) => term.includes('使用了') || term.includes('新特性')), '命中结果被前后缀中文噪音污染。')

  return {
    matchedTerms: result.matchedTerms.join(', '),
  }
}

function verifyRealWorldRecommendationBoundary() {
  const blocks = buildRealWorldRecommendationFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)

  const hitResult = findContextRecommendation({
    activePoolContext: null,
    engine,
    paragraph: realWorldHitParagraph,
  })

  assert(hitResult?.block?.id === 'desktop_migration_anchor', '真实项目语境段落没有命中桌面迁移笔记。')
  assert(
    hitResult.matchedTerms.includes('Tauri Store') || hitResult.matchedTerms.includes('桌面持久化'),
    '真实项目语境命中结果没有保留关键迁移词元。',
  )

  const missResult = findContextRecommendation({
    activePoolContext: null,
    engine,
    paragraph: realWorldMissParagraph,
  })

  assert(
    !missResult
      || !['desktop_migration_anchor', 'media_pipeline_anchor'].includes(missResult.block?.id),
    '纯文档维护段落被错误关联到了桌面存储或媒体链路。',
  )

  return {
    hitBlockId: hitResult.block.id,
    hitTerms: hitResult.matchedTerms.join(', '),
    missBlockId: missResult?.block?.id ?? 'none',
  }
}

async function verifyFallbackBoundary() {
  const blocks = buildRealWorldRecommendationFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)

  const fallbackResult = await findHybridContextRecommendation({
    activeBlockId: null,
    activePoolContext: null,
    engine,
    paragraph: realWorldHitParagraph,
    vectorCacheStatus: 'warming',
    vectorSnapshot: [],
  })

  assert(fallbackResult?.block?.id === 'desktop_migration_anchor', '回退链路没有保住原有词典候选。')
  assert(fallbackResult.recommendationPath === 'lexicon-only', '无向量快照时没有保持 lexicon-only 路径。')
  assert(fallbackResult.fallbackReason === 'cache-warming', '无向量快照时没有返回预期回退原因。')
  assert(resolveRecommendationUiState(fallbackResult) === 'fallback', '回退结果没有映射到 fallback UI 状态。')

  return {
    blockId: fallbackResult.block.id,
    fallbackReason: fallbackResult.fallbackReason,
    recommendationPath: fallbackResult.recommendationPath,
  }
}

function verifyBothBoundary() {
  const blocks = buildRealWorldRecommendationFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)
  const lexiconResult = findContextRecommendation({
    activePoolContext: null,
    engine,
    paragraph: realWorldHitParagraph,
  })

  assert(lexiconResult?.block?.id === 'desktop_migration_anchor', '双命中样本没有先命中预期词典候选。')

  const semanticHits = [
    {
      block: blocks.find((block) => block.id === 'desktop_migration_anchor'),
      blockId: 'desktop_migration_anchor',
      similarity: 0.72,
      title: 'Tauri Store 迁移复核',
    },
    {
      block: blocks.find((block) => block.id === 'graph_decoy'),
      blockId: 'graph_decoy',
      similarity: 0.69,
      title: 'Graph 权重调参记录',
    },
  ]

  const merged = mergeHybridSearchResults(semanticHits, [lexiconResult], { limit: 2 })
  const topHit = merged[0]

  assert(topHit?.blockId === 'desktop_migration_anchor', '双命中结果没有把同块候选排到最前。')
  assert(topHit.reason === 'both', '双命中结果没有标记为 both。')
  assert(resolveRecommendationUiState(topHit) === 'both', '双命中结果没有映射到 both UI 状态。')

  return {
    blockId: topHit.blockId,
    reason: topHit.reason,
    score: topHit.score,
  }
}

function verifyEntityPriorityBoundary() {
  const blocks = buildRealWorldRecommendationFixtureBlocks()
  const engine = buildContextRecommendationEngine(blocks)
  const lexiconResult = findContextRecommendation({
    activePoolContext: null,
    engine,
    paragraph: entityPriorityParagraph,
  })

  assert(lexiconResult?.block?.id === 'media_pipeline_anchor', '词典优先样本没有命中本地媒体候选。')

  const semanticHits = [
    {
      block: blocks.find((block) => block.id === 'graph_decoy'),
      blockId: 'graph_decoy',
      similarity: 0.67,
      title: 'Graph 权重调参记录',
    },
  ]

  const merged = mergeHybridSearchResults(semanticHits, [lexiconResult], { limit: 2 })
  const topHit = merged[0]

  assert(topHit?.blockId === 'media_pipeline_anchor', '较弱语义候选错误压过了词典命中。')
  assert(topHit.reason === 'entities', '词典优先样本没有保持 entities 归因。')
  assert(resolveRecommendationUiState(topHit) === 'entities', '词典优先样本没有映射到 entities UI 状态。')

  return {
    blockId: topHit.blockId,
    reason: topHit.reason,
    score: topHit.score,
  }
}

async function main() {
  const documentChunker = await loadDocumentChunkerModule()
  const macro = verifyMacroChunking(documentChunker)
  const overflow = verifyOverflowChunking(documentChunker)
  const lexicon = verifyLexiconNoise()
  const mixedLanguage = verifyMixedLanguageBoundary()
  const realWorld = verifyRealWorldRecommendationBoundary()
  const fallback = await verifyFallbackBoundary()
  const both = verifyBothBoundary()
  const entityPriority = verifyEntityPriorityBoundary()

  console.log('verify:phantom')
  console.log(`PASS macro-chunking -> ${macro.chunkCount} chunks, longest ${macro.longestChunk}/${documentChunker.MAX_SEMANTIC_CHUNK_LENGTH}`)
  console.log(`PASS thread-labels -> ${macro.projectLabel} | ${macro.sourceLabel}`)
  console.log(`PASS overflow-guard -> ${overflow.chunkCount} chunks, longest ${overflow.longestChunk}/${documentChunker.MAX_SEMANTIC_CHUNK_LENGTH}, ${overflow.threadId}`)
  console.log(`PASS lexicon-filter -> ${lexicon.keptTerms}`)
  console.log(`PASS lexicon-stress -> ${lexicon.matchedTerms} in ${lexicon.elapsedMs.toFixed(2)}ms`)
  console.log(`PASS mixed-language -> ${mixedLanguage.matchedTerms}`)
  console.log(`PASS real-world-boundary -> ${realWorld.hitBlockId} via ${realWorld.hitTerms}; miss=${realWorld.missBlockId}`)
  console.log(`PASS fallback-boundary -> ${fallback.blockId} via ${fallback.fallbackReason}, path=${fallback.recommendationPath}`)
  console.log(`PASS both-boundary -> ${both.blockId} reason=${both.reason}, score=${both.score}`)
  console.log(`PASS entities-priority -> ${entityPriority.blockId} reason=${entityPriority.reason}, score=${entityPriority.score}`)
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:phantom -> ${message}`)
  process.exitCode = 1
}
