export function resolveRecommendationUiState(recommendation) {
  if (!recommendation) return 'idle'
  if (recommendation.fallbackReason) return 'fallback'
  if (recommendation.reason === 'both') return 'both'
  if (recommendation.reason === 'semantic') return 'semantic'
  return 'entities'
}
