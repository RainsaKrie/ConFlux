import { extractBlockRelations } from './blocks'

export const visibleRelationDimensions = ['domain', 'format', 'project', 'stage']
export const secondaryRelationDimensions = ['source']

export const relationToneStyles = {
  source: {
    orbit: 'border-emerald-200 bg-emerald-50',
    core: 'bg-emerald-500',
    badge: 'border border-emerald-100 bg-emerald-50 text-emerald-600',
    link: 'rgba(16, 185, 129, 0.48)',
    particle: 'rgba(16, 185, 129, 0.58)',
  },
  lens: {
    orbit: 'border-amber-200 bg-amber-50',
    core: 'bg-amber-500',
    badge: 'border border-amber-100 bg-amber-50 text-amber-600',
    link: 'rgba(245, 158, 11, 0.42)',
    particle: 'rgba(245, 158, 11, 0.55)',
  },
  reference: {
    orbit: 'border-indigo-200 bg-indigo-50',
    core: 'bg-indigo-500',
    badge: 'border border-indigo-100 bg-indigo-50 text-indigo-600',
    link: 'rgba(99, 102, 241, 0.32)',
    particle: 'rgba(99, 102, 241, 0.4)',
  },
  domain: {
    orbit: 'border-blue-200 bg-blue-50',
    core: 'bg-blue-500',
    badge: 'border border-blue-100 bg-blue-50 text-blue-600',
    link: 'rgba(96, 165, 250, 0.26)',
    particle: 'rgba(59, 130, 246, 0.36)',
  },
  format: {
    orbit: 'border-zinc-200 bg-zinc-100',
    core: 'bg-zinc-500',
    badge: 'border border-zinc-200 bg-zinc-100 text-zinc-600',
    link: 'rgba(161, 161, 170, 0.22)',
    particle: 'rgba(113, 113, 122, 0.3)',
  },
  project: {
    orbit: 'border-purple-200 bg-purple-50',
    core: 'bg-purple-500',
    badge: 'border border-purple-100 bg-purple-50 text-purple-600',
    link: 'rgba(168, 85, 247, 0.24)',
    particle: 'rgba(168, 85, 247, 0.34)',
  },
  stage: {
    orbit: 'border border-amber-100 bg-amber-50/70',
    core: 'bg-amber-400',
    badge: 'border border-amber-100 bg-amber-50 text-amber-700',
    link: 'rgba(245, 158, 11, 0.16)',
    particle: 'rgba(217, 119, 6, 0.24)',
  },
  neutral: {
    orbit: 'border-zinc-200 bg-zinc-50',
    core: 'bg-zinc-400',
    badge: 'border border-zinc-200 bg-zinc-50 text-zinc-500',
    link: 'rgba(212, 212, 216, 0.18)',
    particle: 'rgba(161, 161, 170, 0.24)',
  },
}

export const relationPriority = {
  source: 6,
  lens: 5,
  reference: 4,
  project: 3,
  domain: 2,
  stage: 1.5,
  format: 1,
  neutral: 0,
}

const relationLabelMap = {
  '稳定关联': { zh: '稳定关联', en: 'Stable link' },
  '来自稳定关联': { zh: '来自稳定关联', en: 'Linked from source' },
  '引用节点': { zh: '引用节点', en: 'Reference node' },
  '被引用节点': { zh: '被引用节点', en: 'Referenced by note' },
  '引用': { zh: '引用', en: 'Reference' },
  '被引用': { zh: '被引用', en: 'Referenced by' },
  '独立条目': { zh: '独立条目', en: 'Standalone note' },
}

function createConnection(target, type, label) {
  return {
    id: target.id,
    title: target.title,
    type,
    label,
    weight: relationPriority[type] ?? 0,
  }
}

function pushUnique(map, sourceId, connection) {
  const bucket = map.get(sourceId)
  if (!bucket) return

  const exists = bucket.some(
    (item) => item.id === connection.id && item.type === connection.type && item.label === connection.label,
  )

  if (!exists) {
    bucket.push(connection)
  }
}

export function displayRelationLabel(label = '', language = 'zh') {
  const entry = relationLabelMap[label]
  if (!entry) return label
  return entry[language === 'en' ? 'en' : 'zh'] ?? label
}

export function buildRelationMap(blocks) {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  const map = new Map(blocks.map((block) => [block.id, []]))

  blocks.forEach((block) => {
    ;(block.dimensions?.source ?? []).forEach((sourceBlockId) => {
      const target = byId.get(sourceBlockId)
      if (!target) return

      pushUnique(map, block.id, createConnection(target, 'source', '稳定关联'))
      pushUnique(map, target.id, createConnection(block, 'source', '来自稳定关联'))
    })

    extractBlockRelations(block.content).forEach((relation) => {
      const target = byId.get(relation.id)
      if (!target) return

      if (relation.kind === 'lens') {
        pushUnique(map, block.id, createConnection(target, 'lens', '引用节点'))
        pushUnique(map, target.id, createConnection(block, 'lens', '被引用节点'))
        return
      }

      pushUnique(map, block.id, createConnection(target, 'reference', '引用'))
      pushUnique(map, target.id, createConnection(block, 'reference', '被引用'))
    })
  })

  for (let i = 0; i < blocks.length; i += 1) {
    const left = blocks[i]

    for (let j = i + 1; j < blocks.length; j += 1) {
      const right = blocks[j]

      visibleRelationDimensions.forEach((dimension) => {
        const overlaps = (left.dimensions?.[dimension] ?? []).filter((value) =>
          (right.dimensions?.[dimension] ?? []).includes(value),
        )

        overlaps.forEach((value) => {
          pushUnique(map, left.id, createConnection(right, dimension, value))
          pushUnique(map, right.id, createConnection(left, dimension, value))
        })
      })
    }
  }

  return map
}

export function getRelationSnapshot(block, relationMap) {
  const connections = relationMap.get(block.id) ?? []
  const relatedIds = [...new Set(connections.map((item) => item.id))]
  const ordered = [...connections].sort((left, right) => {
    if (right.weight !== left.weight) return right.weight - left.weight
    return left.label.localeCompare(right.label, 'zh-Hans-CN')
  })
  const dominant = ordered[0] ?? { type: 'neutral', label: '独立条目' }
  const connectedTitles = [...new Map(ordered.map((item) => [item.id, item.title])).values()].slice(0, 2)

  return {
    totalConnections: relatedIds.length,
    dominant,
    connectedTitles,
    visibleReasons: ordered.slice(0, 3),
  }
}

export function buildRelatedLabel(snapshot, language = 'zh') {
  if (snapshot.connectedTitles.length === 0) {
    return language === 'en' ? 'No strong links yet' : '尚未形成明显连接'
  }
  if (snapshot.connectedTitles.length === 1) {
    return language === 'en'
      ? `Linked to ${snapshot.connectedTitles[0]}`
      : `连到 ${snapshot.connectedTitles[0]}`
  }
  return language === 'en'
    ? `Linked to ${snapshot.connectedTitles[0]} · ${snapshot.connectedTitles[1]}`
    : `连到 ${snapshot.connectedTitles[0]} · ${snapshot.connectedTitles[1]}`
}

export function buildGraphData(blocks) {
  const total = blocks.length
  const baseRadius = Math.max(132, total * 22)
  const relationMap = buildRelationMap(blocks)

  const nodes = blocks.map((block, index) => {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2
    const radialOffset = (index % 4) * 28
    const radius = baseRadius + radialOffset

    return {
      id: block.id,
      title: block.title,
      block,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  })

  const pairMap = new Map()

  relationMap.forEach((connections, sourceId) => {
    connections.forEach((connection) => {
      const pair = [sourceId, connection.id].sort()
      const key = pair.join('::')
      const current = pairMap.get(key)

      if (!current) {
        pairMap.set(key, {
          source: pair[0],
          target: pair[1],
          dominant: connection,
          reasons: [connection],
        })
        return
      }

      const exists = current.reasons.some(
        (item) => item.id === connection.id && item.type === connection.type && item.label === connection.label,
      )

      if (!exists) {
        current.reasons.push(connection)
      }

      if ((connection.weight ?? 0) > (current.dominant.weight ?? 0)) {
        current.dominant = connection
      }
    })
  })

  const links = [...pairMap.values()].map((item) => ({
    source: item.source,
    target: item.target,
    type: item.dominant.type,
    label: item.dominant.label,
    reasons: item.reasons,
  }))

  const degreeMap = new Map(nodes.map((node) => [node.id, 0]))
  links.forEach((link) => {
    degreeMap.set(link.source, (degreeMap.get(link.source) ?? 0) + 1)
    degreeMap.set(link.target, (degreeMap.get(link.target) ?? 0) + 1)
  })

  nodes.forEach((node) => {
    node.degree = degreeMap.get(node.id) ?? 0
  })

  return {
    nodes,
    links,
    relationMap,
  }
}
