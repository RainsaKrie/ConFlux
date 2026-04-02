export function normalizePoolFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([dimension, values]) => [
        dimension,
        [...new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))].sort((left, right) =>
          left.localeCompare(right, 'zh-Hans-CN'),
        ),
      ])
      .filter(([, values]) => values.length > 0)
      .sort(([left], [right]) => left.localeCompare(right, 'zh-Hans-CN')),
  )
}

export function poolFiltersToTokens(filters = {}) {
  return Object.entries(normalizePoolFilters(filters)).flatMap(([dimension, values]) =>
    values.map((value) => ({ dimension, value })),
  )
}

export function buildPoolTokenKey(token) {
  return `${token.dimension}:${token.value}`
}

export function encodePoolFilters(tokens) {
  return encodeURIComponent(JSON.stringify(tokens))
}

export function buildPoolContextKey(filters = {}) {
  return JSON.stringify(normalizePoolFilters(filters))
}

export function tokensToPoolFilters(tokens = []) {
  return normalizePoolFilters(
    tokens.reduce((accumulator, token) => {
      const currentValues = accumulator[token.dimension] ?? []
      if (!currentValues.includes(token.value)) {
        accumulator[token.dimension] = [...currentValues, token.value]
      }
      return accumulator
    }, {}),
  )
}

export function buildPoolContext({ poolId = null, name = '', filters = {}, sourceView = 'feed' }) {
  const normalizedFilters = normalizePoolFilters(filters)

  return {
    key: buildPoolContextKey(normalizedFilters),
    poolId,
    name: name?.trim() || '当前视角',
    filters: normalizedFilters,
    sourceView,
  }
}

export function filtersMatchBlock(block, filters = {}) {
  return Object.entries(filters).every(([dimension, values]) =>
    values.every((value) => block.dimensions?.[dimension]?.includes(value)),
  )
}

export function findMatchingPoolByFilters(savedPools = [], filters = {}) {
  const targetKey = buildPoolContextKey(filters)
  return savedPools.find((pool) => buildPoolContextKey(pool.filters) === targetKey) ?? null
}

export function getPoolMatchScore(block, activePoolContext) {
  if (!activePoolContext?.filters) return 0

  return Object.entries(activePoolContext.filters).reduce((score, [dimension, values]) => {
    const matchCount = values.filter((value) => block.dimensions?.[dimension]?.includes(value)).length
    if (matchCount === 0) return score

    return score + 120 + matchCount * 40
  }, 0)
}
