import { contentToPlainText } from '../../utils/blocks'

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function splitIntoSegments(text = '') {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/gu)?.map((item) => item.trim()).filter(Boolean) ?? []
  if (sentences.length > 1) return sentences

  const clauses = normalized
    .split(/(?<=[，、,:：])\s*/u)
    .map((item) => item.trim())
    .filter(Boolean)

  if (clauses.length > 1) return clauses

  if (Array.from(normalized).length <= 42) return [normalized]

  const chars = Array.from(normalized)
  const chunks = []

  for (let index = 0; index < chars.length; index += 42) {
    chunks.push(chars.slice(index, index + 42).join('').trim())
  }

  return chunks.filter(Boolean)
}

function buildLcsMatrix(left = [], right = []) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      matrix[leftIndex][rightIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? matrix[leftIndex - 1][rightIndex - 1] + 1
          : Math.max(matrix[leftIndex - 1][rightIndex], matrix[leftIndex][rightIndex - 1])
    }
  }

  return matrix
}

function buildSegmentOperations(beforeSegments = [], afterSegments = []) {
  const matrix = buildLcsMatrix(beforeSegments, afterSegments)
  const operations = []
  let beforeIndex = beforeSegments.length
  let afterIndex = afterSegments.length

  while (beforeIndex > 0 || afterIndex > 0) {
    if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      beforeSegments[beforeIndex - 1] === afterSegments[afterIndex - 1]
    ) {
      operations.unshift({
        afterText: afterSegments[afterIndex - 1],
        beforeText: beforeSegments[beforeIndex - 1],
        type: 'equal',
      })
      beforeIndex -= 1
      afterIndex -= 1
      continue
    }

    if (
      afterIndex > 0 &&
      (beforeIndex === 0 || matrix[beforeIndex][afterIndex - 1] >= matrix[beforeIndex - 1][afterIndex])
    ) {
      operations.unshift({
        afterText: afterSegments[afterIndex - 1],
        beforeText: '',
        type: 'insert',
      })
      afterIndex -= 1
      continue
    }

    operations.unshift({
      afterText: '',
      beforeText: beforeSegments[beforeIndex - 1],
      type: 'delete',
    })
    beforeIndex -= 1
  }

  return operations
}

function tokenizeText(text = '') {
  return Array.from(text)
}

function appendPart(parts, type, value) {
  if (!value) return

  const lastPart = parts[parts.length - 1]
  if (lastPart?.type === type) {
    lastPart.value += value
    return
  }

  parts.push({ type, value })
}

function buildInlineDiff(beforeText = '', afterText = '') {
  const beforeTokens = tokenizeText(beforeText)
  const afterTokens = tokenizeText(afterText)

  if (!beforeTokens.length && !afterTokens.length) {
    return {
      afterParts: [],
      beforeParts: [],
    }
  }

  if (beforeTokens.length * afterTokens.length > 6400) {
    return {
      afterParts: afterText ? [{ type: 'add', value: afterText }] : [],
      beforeParts: beforeText ? [{ type: 'remove', value: beforeText }] : [],
    }
  }

  const matrix = buildLcsMatrix(beforeTokens, afterTokens)
  const beforeParts = []
  const afterParts = []
  const operations = []
  let beforeIndex = beforeTokens.length
  let afterIndex = afterTokens.length

  while (beforeIndex > 0 || afterIndex > 0) {
    if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]
    ) {
      operations.unshift({ type: 'equal', value: beforeTokens[beforeIndex - 1] })
      beforeIndex -= 1
      afterIndex -= 1
      continue
    }

    if (
      afterIndex > 0 &&
      (beforeIndex === 0 || matrix[beforeIndex][afterIndex - 1] >= matrix[beforeIndex - 1][afterIndex])
    ) {
      operations.unshift({ type: 'add', value: afterTokens[afterIndex - 1] })
      afterIndex -= 1
      continue
    }

    operations.unshift({ type: 'remove', value: beforeTokens[beforeIndex - 1] })
    beforeIndex -= 1
  }

  operations.forEach((operation) => {
    if (operation.type === 'equal') {
      appendPart(beforeParts, 'equal', operation.value)
      appendPart(afterParts, 'equal', operation.value)
      return
    }

    if (operation.type === 'remove') {
      appendPart(beforeParts, 'remove', operation.value)
      return
    }

    appendPart(afterParts, 'add', operation.value)
  })

  return {
    afterParts,
    beforeParts,
  }
}

function buildMergedInlineDiff(beforeText = '', afterText = '') {
  const beforeTokens = tokenizeText(beforeText)
  const afterTokens = tokenizeText(afterText)

  if (!beforeTokens.length && !afterTokens.length) return []

  if (beforeTokens.length * afterTokens.length > 6400) {
    return [
      ...(beforeText ? [{ type: 'remove', value: beforeText }] : []),
      ...(afterText ? [{ type: 'add', value: afterText }] : []),
    ]
  }

  const matrix = buildLcsMatrix(beforeTokens, afterTokens)
  const operations = []
  const parts = []
  let beforeIndex = beforeTokens.length
  let afterIndex = afterTokens.length

  while (beforeIndex > 0 || afterIndex > 0) {
    if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      beforeTokens[beforeIndex - 1] === afterTokens[afterIndex - 1]
    ) {
      operations.unshift({ type: 'equal', value: beforeTokens[beforeIndex - 1] })
      beforeIndex -= 1
      afterIndex -= 1
      continue
    }

    if (
      afterIndex > 0 &&
      (beforeIndex === 0 || matrix[beforeIndex][afterIndex - 1] >= matrix[beforeIndex - 1][afterIndex])
    ) {
      operations.unshift({ type: 'add', value: afterTokens[afterIndex - 1] })
      afterIndex -= 1
      continue
    }

    operations.unshift({ type: 'remove', value: beforeTokens[beforeIndex - 1] })
    beforeIndex -= 1
  }

  operations.forEach((operation) => {
    appendPart(parts, operation.type, operation.value)
  })

  return parts
}

function buildRows(beforeSegments = [], afterSegments = []) {
  const operations = buildSegmentOperations(beforeSegments, afterSegments)
  const rows = []
  let index = 0

  while (index < operations.length) {
    const currentOperation = operations[index]

    if (currentOperation.type === 'equal') {
      rows.push({
        afterParts: [{ type: 'equal', value: currentOperation.afterText }],
        afterText: currentOperation.afterText,
        beforeParts: [{ type: 'equal', value: currentOperation.beforeText }],
        beforeText: currentOperation.beforeText,
        type: 'equal',
      })
      index += 1
      continue
    }

    const deleted = []
    const inserted = []

    while (index < operations.length && operations[index].type !== 'equal') {
      if (operations[index].type === 'delete') deleted.push(operations[index].beforeText)
      if (operations[index].type === 'insert') inserted.push(operations[index].afterText)
      index += 1
    }

    const groupLength = Math.max(deleted.length, inserted.length)
    for (let groupIndex = 0; groupIndex < groupLength; groupIndex += 1) {
      const beforeText = deleted[groupIndex] ?? ''
      const afterText = inserted[groupIndex] ?? ''

      if (beforeText && afterText) {
        rows.push({
          ...buildInlineDiff(beforeText, afterText),
          afterText,
          beforeText,
          type: 'replace',
        })
        continue
      }

      if (beforeText) {
        rows.push({
          afterParts: [],
          afterText: '',
          beforeParts: [{ type: 'remove', value: beforeText }],
          beforeText,
          type: 'delete',
        })
        continue
      }

      rows.push({
        afterParts: [{ type: 'add', value: afterText }],
        afterText,
        beforeParts: [],
        beforeText: '',
        type: 'insert',
      })
    }
  }

  return rows
}

export function buildAssimilationDiff(beforeContent = '', afterContent = '') {
  const beforeText = contentToPlainText(beforeContent).replace(/\s+/g, ' ').trim()
  const afterText = contentToPlainText(afterContent).replace(/\s+/g, ' ').trim()
  const beforeSegments = splitIntoSegments(beforeText)
  const afterSegments = splitIntoSegments(afterText)
  const rows = buildRows(beforeSegments, afterSegments)

  const stats = rows.reduce(
    (summary, row) => {
      if (row.type === 'insert') summary.added += 1
      if (row.type === 'delete') summary.removed += 1
      if (row.type === 'replace') summary.changed += 1
      if (row.type === 'equal') summary.unchanged += 1
      return summary
    },
    { added: 0, changed: 0, removed: 0, unchanged: 0 },
  )

  return {
    afterText,
    beforeText,
    rows,
    stats,
  }
}

export function buildAssimilationInlineDiffHtml(beforeContent = '', afterContent = '') {
  const beforeText = contentToPlainText(beforeContent).replace(/\s+/g, ' ').trim()
  const afterText = contentToPlainText(afterContent).replace(/\s+/g, ' ').trim()
  const parts = buildMergedInlineDiff(beforeText, afterText)

  if (!parts.length) return ''

  return parts
    .map((part) => {
      const value = escapeHtml(part.value)
      if (part.type === 'remove') {
        return `<del class="bg-rose-100/60 text-rose-800 line-through decoration-rose-500/80">${value}</del>`
      }
      if (part.type === 'add') {
        return `<ins class="bg-emerald-100/60 text-emerald-800 no-underline">${value}</ins>`
      }
      return `<span class="text-zinc-700">${value}</span>`
    })
    .join('')
}
