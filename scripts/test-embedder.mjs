import { getTextEmbedding } from '../src/features/search/embedder.js'

const embedding = await getTextEmbedding('你好世界')

console.log('embedder:test length', embedding.length)
console.log('embedder:test vector', embedding)
