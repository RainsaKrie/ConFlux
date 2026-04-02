import { displayDimensionValue } from '../../utils/displayTag'

export function collectMetadataOverview(blocks = [], dimensions = ['stage', 'source'], language = 'zh') {
  const counts = new Map()

  blocks.forEach((block) => {
    dimensions.forEach((dimension) => {
      ;(block.dimensions?.[dimension] ?? []).forEach((value) => {
        const normalizedValue = displayDimensionValue(dimension, value, language)
        if (!normalizedValue) return

        const key = `${dimension}:${normalizedValue}`
        const current = counts.get(key)
        counts.set(key, {
          dimension,
          value: normalizedValue,
          count: (current?.count ?? 0) + 1,
        })
      })
    })
  })

  return dimensions.reduce((result, dimension) => {
    result[dimension] = [...counts.values()]
      .filter((item) => item.dimension === dimension)
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return left.value.localeCompare(right.value, 'zh-Hans-CN')
      })

    return result
  }, {})
}
