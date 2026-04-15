function resolveIdPrefix(options = {}) {
  const prefix = options.idPrefix ?? 'outline-heading'
  return typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'outline-heading'
}

export function normalizeHeadingText(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractOutlineFromHtml(html = '', options = {}) {
  if (!html.trim() || typeof DOMParser === 'undefined') return []

  const idPrefix = resolveIdPrefix(options)
  const document = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((node, index) => {
      const text = normalizeHeadingText(node.textContent ?? '')
      if (!text) return null

      return {
        id: `${idPrefix}-${index}`,
        level: Number(node.tagName.slice(1)) || 1,
        text,
      }
    })
    .filter(Boolean)
}

export function annotateOutlineHtml(html = '', options = {}) {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return {
      html,
      items: [],
    }
  }

  const idPrefix = resolveIdPrefix(options)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const items = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((node, index) => {
      const text = normalizeHeadingText(node.textContent ?? '')
      if (!text) return null

      const id = `${idPrefix}-${index}`
      node.id = id
      node.dataset.outlineId = id

      return {
        id,
        level: Number(node.tagName.slice(1)) || 1,
        text,
      }
    })
    .filter(Boolean)

  return {
    html: document.body.innerHTML,
    items,
  }
}

export function extractOutlineFromEditor(editor, html = '', options = {}) {
  const idPrefix = resolveIdPrefix(options)
  const liveItems = []

  editor?.state?.doc?.descendants?.((node, pos) => {
    const level = Number(node?.attrs?.level)
    if (node?.type?.name !== 'heading' || ![1, 2, 3].includes(level)) return

    const text = normalizeHeadingText(node.textContent ?? '')
    if (!text) return

    const id = `${idPrefix}-${liveItems.length}`
    const domNode = editor?.view?.nodeDOM?.(pos)
    if (domNode instanceof HTMLElement) {
      domNode.id = id
      domNode.dataset.outlineId = id
      domNode.dataset.outlinePos = String(pos)
    }

    liveItems.push({
      id,
      level,
      pos,
      text,
    })
  })

  if (liveItems.length > 0) {
    return liveItems
  }

  return extractOutlineFromHtml(html, { idPrefix })
}
