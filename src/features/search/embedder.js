import { env, pipeline } from '@xenova/transformers'

const hasBrowserCache = typeof self !== 'undefined' && 'caches' in self

env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = hasBrowserCache

class EmbedderPipeline {
  static task = 'feature-extraction'
  static model = 'Xenova/all-MiniLM-L6-v2'
  static instance = null

  static async getInstance(progressCallback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback: progressCallback,
      })
    }

    return this.instance
  }
}

export async function getTextEmbedding(text, progressCallback = null) {
  const normalizedText = typeof text === 'string' ? text.trim() : ''
  if (!normalizedText) return []

  const extractor = await EmbedderPipeline.getInstance(progressCallback)
  const output = await extractor(normalizedText, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export function cosineSimilarity(vecA = [], vecB = []) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0
  }

  let dotProduct = 0
  for (let index = 0; index < vecA.length; index += 1) {
    dotProduct += vecA[index] * vecB[index]
  }

  return dotProduct
}

export { EmbedderPipeline }
