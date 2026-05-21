import { BLOCK_SOURCE_LABELS } from '../../utils/blocks.js'

export const QUICK_CAPTURE_ENRICHMENT_KIND = 'quick-capture-classification'

function hasDimensionValue(values = [], targetValue = '', aliases = []) {
  return values.some((value) => value === targetValue || aliases.includes(value))
}

export function isLegacyOfflineQuickCapture(block) {
  const dimensions = block?.dimensions ?? {}
  const sourceValues = dimensions.source ?? []

  return !block?.aiEnrichment
    && hasDimensionValue(sourceValues, BLOCK_SOURCE_LABELS.quickCapture, ['Quick Capture'])
    && !hasDimensionValue(sourceValues, BLOCK_SOURCE_LABELS.aiGenerated, ['AI Generated'])
}

export function shouldAutoEnrichQuickCapture(block) {
  if (isLegacyOfflineQuickCapture(block)) return true

  return block?.aiEnrichment?.kind === QUICK_CAPTURE_ENRICHMENT_KIND
    && ['pending', 'processing'].includes(block?.aiEnrichment?.status)
}

export function formatAutoTagErrorMessage(error, hints = {}) {
  const message = error instanceof Error ? error.message : String(error)
  if (/HTTP\s+404/i.test(message)) return hints.path ?? message
  if (/HTTP\s+401|HTTP\s+403/i.test(message)) return hints.auth ?? message
  if (/HTTP\s+429/i.test(message)) return hints.rateLimit ?? message
  if (/timed out|timeout/i.test(message)) return hints.timeout ?? message
  return message
}
