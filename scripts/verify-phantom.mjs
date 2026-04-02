import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { buildContextRecommendationEngine, findContextRecommendation } from '../src/features/recommendation/contextRecommendation.js'
import {
  buildRecommendationFixtureBlocks,
  macroChunkStressInput,
  noisyLexiconParagraph,
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
    `发现超出安全阈值的 chunk，长度为 ${longestChunk}。`,
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

async function main() {
  const documentChunker = await loadDocumentChunkerModule()
  const macro = verifyMacroChunking(documentChunker)
  const lexicon = verifyLexiconNoise()

  console.log('verify:phantom')
  console.log(`PASS macro-chunking -> ${macro.chunkCount} chunks, longest ${macro.longestChunk}/${documentChunker.MAX_SEMANTIC_CHUNK_LENGTH}`)
  console.log(`PASS thread-labels -> ${macro.projectLabel} | ${macro.sourceLabel}`)
  console.log(`PASS lexicon-filter -> ${lexicon.keptTerms}`)
  console.log(`PASS lexicon-stress -> ${lexicon.matchedTerms} in ${lexicon.elapsedMs.toFixed(2)}ms`)
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:phantom -> ${message}`)
  process.exitCode = 1
}
