import assert from 'node:assert/strict'
import { buildVectorSnapshot, performHybridSearch } from '../src/features/search/hybridSearch.js'

function buildHybridFixtureBlocks() {
  return [
    {
      id: 'block_rag',
      title: 'RAG external knowledge retrieval',
      content:
        'This note explains retrieval-augmented generation. A system first queries a vector database for external knowledge, then injects the retrieved evidence into the large language model context. Overall quality depends on retrieval latency, recall quality, and stable knowledge attachment.',
      dimensions: {
        domain: ['LLM Systems'],
        format: ['Research Note'],
        project: ['RAG'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'block_transformer',
      title: 'Transformer attention mechanics',
      content:
        'This note focuses on self-attention, multi-head attention, residual connections, and feed-forward layers in transformer architectures.',
      dimensions: {
        domain: ['Deep Learning'],
        format: ['Research Note'],
        project: ['Transformer'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'block_react',
      title: 'React lifecycle and rendering phases',
      content:
        'This note discusses component mount, update, unmount, and effect scheduling in React applications.',
      dimensions: {
        domain: ['Frontend'],
        format: ['Engineering Note'],
        project: ['React'],
        stage: [],
        source: [],
      },
    },
  ]
}

async function main() {
  const blocks = buildHybridFixtureBlocks()
  const vectorSnapshot = await buildVectorSnapshot(blocks)
  const query =
    'Reducing vector database index latency is very important for attaching external knowledge to a large language model.'

  const results = await performHybridSearch(query, vectorSnapshot, [], {
    limit: 2,
    semanticThreshold: 0.3,
  })

  assert(results.length > 0, 'Hybrid search returned no candidates.')
  assert(results[0].blockId === 'block_rag', 'Semantic retrieval did not rank the RAG block first.')
  assert(results[0].reason === 'semantic', 'This offline sandbox should resolve through the semantic path.')

  console.log('test:hybrid-search')
  console.log(`PASS top-hit -> ${results[0].blockId} (${results[0].reason}) score=${results[0].semanticScore.toFixed(4)}`)
  console.log(
    `PASS ranking -> ${results.map((item) => `${item.blockId}:${item.reason}:${item.semanticScore.toFixed(4)}`).join(' | ')}`,
  )
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL test:hybrid-search -> ${message}`)
  process.exitCode = 1
}
