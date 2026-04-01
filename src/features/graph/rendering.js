import { NODE_STYLE } from './constants'
import { getLabelPlacement, getNodeBaseRadius, getNodeSpreadRadius, truncateLabel } from './utils'

const EMPTY_SET = new Set()

export function paintGraphNodePointerArea(node, color, ctx) {
  const baseRadius = getNodeBaseRadius(node)
  const hitRadius = Math.max(
    baseRadius * NODE_STYLE.pointerArea.baseRadiusMultiplier,
    getNodeSpreadRadius(node) * NODE_STYLE.pointerArea.spreadRadiusMultiplier,
  )

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI, false)
  ctx.fill()
}

export function renderGraphNode(node, ctx, globalScale, options = {}) {
  const {
    activeNode = null,
    activeNeighborIds = EMPTY_SET,
    hoveredNode = null,
    highlightNodes = EMPTY_SET,
    searchQuery = '',
    selectedNode = null,
  } = options
  const trimmedSearchQuery = searchQuery.trim()
  const isSearchActive = trimmedSearchQuery.length > 0
  const isActive = activeNode?.id === node.id
  const isLocked = selectedNode?.id === node.id
  const isNeighbor = activeNeighborIds.has(node.id)
  const isMatched = highlightNodes.has(node.id)
  const isHovered = node === hoveredNode || node === selectedNode
  const isZoomedIn = globalScale > 1.2
  const showText = isZoomedIn || isHovered || isMatched
  const isSearchDimmed = isSearchActive && !isMatched
  const shouldFade = !isSearchActive && activeNode && !isActive && !isNeighbor
  const baseRadius = getNodeBaseRadius(node)
  const coreRadius = baseRadius * (isMatched ? 0.94 : isActive ? 0.82 : isNeighbor ? 0.62 : 0.5)
  const outerHaloRadius = baseRadius * (isMatched ? 3.2 : isLocked ? 3.4 : isActive ? 2.9 : isNeighbor ? 2.7 : 2.5)
  const midHaloRadius = baseRadius * (isMatched ? 1.8 : isLocked ? 2 : isActive ? 1.6 : isNeighbor ? 1.45 : 1.3)
  const label = truncateLabel(node.title)
  const fontSize = Math.max(NODE_STYLE.label.minFontSize, NODE_STYLE.label.baseFontSize / globalScale)
  const { labelX, labelY, textAlign } = getLabelPlacement(node, outerHaloRadius)

  ctx.beginPath()
  ctx.arc(node.x, node.y, outerHaloRadius, 0, 2 * Math.PI, false)
  ctx.fillStyle = isSearchDimmed
    ? NODE_STYLE.dimming.searchOuterHalo
    : shouldFade
      ? NODE_STYLE.dimming.inactiveOuterHalo
      : isMatched
        ? NODE_STYLE.halo.matchedOuter
        : isLocked
          ? NODE_STYLE.halo.lockedOuter
          : isActive
            ? NODE_STYLE.halo.activeOuter
            : isNeighbor
              ? NODE_STYLE.halo.neighborOuter
              : NODE_STYLE.halo.defaultOuter
  ctx.fill()

  ctx.beginPath()
  ctx.arc(node.x, node.y, midHaloRadius, 0, 2 * Math.PI, false)
  ctx.fillStyle = isSearchDimmed
    ? NODE_STYLE.dimming.searchMidHalo
    : shouldFade
      ? NODE_STYLE.dimming.inactiveMidHalo
      : isMatched
        ? NODE_STYLE.halo.matchedMid
        : isLocked
          ? NODE_STYLE.halo.lockedMid
          : isActive
            ? NODE_STYLE.halo.activeMid
            : isNeighbor
              ? NODE_STYLE.halo.neighborMid
              : NODE_STYLE.halo.defaultMid
  ctx.fill()

  ctx.beginPath()
  ctx.arc(node.x, node.y, coreRadius, 0, 2 * Math.PI, false)
  ctx.fillStyle = isSearchDimmed
    ? NODE_STYLE.dimming.searchCore
    : shouldFade
      ? NODE_STYLE.dimming.inactiveCore
      : isMatched
        ? NODE_STYLE.core.matched
        : isLocked
          ? NODE_STYLE.core.locked
          : isActive
            ? NODE_STYLE.core.active
            : isNeighbor
              ? NODE_STYLE.core.neighbor
              : NODE_STYLE.core.default
  ctx.fill()

  if (!showText) return

  ctx.font = `${
    isActive || isLocked || isMatched ? NODE_STYLE.label.fontWeightStrong : NODE_STYLE.label.fontWeightDefault
  } ${fontSize}px ${NODE_STYLE.label.fontFamily}`
  ctx.textAlign = textAlign
  ctx.textBaseline = 'middle'
  ctx.fillStyle = isSearchDimmed
    ? NODE_STYLE.dimming.searchText
    : isMatched
      ? NODE_STYLE.text.matched
      : isLocked
        ? NODE_STYLE.text.locked
        : isActive
          ? NODE_STYLE.text.active
          : isNeighbor
            ? NODE_STYLE.text.neighbor
            : NODE_STYLE.text.default
  ctx.fillText(label, labelX, labelY)
}
