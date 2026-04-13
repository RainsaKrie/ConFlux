export const RECOMMENDATION_POLICY = {
  minParagraphLength: 8,
  minMatchedTerms: 1,
  strictFuseScore: 0.18,
  relaxedFuseScore: 0.2,
  relaxedFuseMatchedTerms: 3,
  semanticThreshold: 0.38,
  semanticLimit: 2,
  lexiconTermWeight: 140,
  fuseScoreWeight: 100,
  lexiconHitBonus: 100,
  bothHitBonus: 1000,
  semanticConfidenceScale: 100,
}

export function resolveFuseThreshold(matchedTermsCount = 0) {
  return matchedTermsCount >= RECOMMENDATION_POLICY.relaxedFuseMatchedTerms
    ? RECOMMENDATION_POLICY.relaxedFuseScore
    : RECOMMENDATION_POLICY.strictFuseScore
}

export function calculateLexiconConfidence({
  matchedTermsCount = 0,
  fuseScore = 1,
  poolBonus = 0,
}) {
  return (
    matchedTermsCount * RECOMMENDATION_POLICY.lexiconTermWeight
    + Math.round((1 - fuseScore) * RECOMMENDATION_POLICY.fuseScoreWeight)
    + poolBonus
  )
}

export function calculateSemanticConfidence(semanticScore = 0) {
  return Math.round(semanticScore * RECOMMENDATION_POLICY.semanticConfidenceScale)
}
