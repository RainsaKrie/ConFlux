import { GRAPH_VIEW, LINK_DISTANCE_BY_TYPE, NODE_STYLE } from './constants'

export function truncateLabel(label = '', maxLength = NODE_STYLE.label.maxLength) {
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label
}

export function getLinkDistance(link) {
  return LINK_DISTANCE_BY_TYPE[link.type] ?? 92
}

export function getNodeSpreadRadius(node) {
  const titleLength = node.title?.length ?? 0
  const degree = node.degree ?? 0
  return 22 + Math.min(18, titleLength * 0.7) + Math.min(12, degree * 1.8)
}

export function getNodeBaseRadius(node) {
  const linkCount = node.degree ?? 0
  return Math.max(3, Math.min(8, 2 + linkCount * 1))
}

export function getLabelPlacement(node, baseRadius) {
  return {
    labelX: node.x + baseRadius + NODE_STYLE.label.offsetX,
    labelY: node.y,
    textAlign: 'left',
  }
}

export function getClusterViewport(nodes, viewport) {
  const positionedNodes = nodes.filter((node) => typeof node?.x === 'number' && typeof node?.y === 'number')
  if (!positionedNodes.length) return null

  const bounds = positionedNodes.reduce(
    (accumulator, node) => ({
      minX: Math.min(accumulator.minX, node.x),
      maxX: Math.max(accumulator.maxX, node.x),
      minY: Math.min(accumulator.minY, node.y),
      maxY: Math.max(accumulator.maxY, node.y),
    }),
    {
      minX: positionedNodes[0].x,
      maxX: positionedNodes[0].x,
      minY: positionedNodes[0].y,
      maxY: positionedNodes[0].y,
    },
  )

  const expandedMinX = bounds.minX - GRAPH_VIEW.clusterPaddingX
  const expandedMaxX = bounds.maxX + GRAPH_VIEW.clusterLabelSafeWidth
  const expandedMinY = bounds.minY - GRAPH_VIEW.clusterPaddingY
  const expandedMaxY = bounds.maxY + GRAPH_VIEW.clusterPaddingY
  const spanX = Math.max(GRAPH_VIEW.clusterMinSpanX, expandedMaxX - expandedMinX)
  const spanY = Math.max(GRAPH_VIEW.clusterMinSpanY, expandedMaxY - expandedMinY)
  const availableWidth = Math.max(
    GRAPH_VIEW.viewportMinWidth,
    viewport.width - GRAPH_VIEW.viewportPaddingX * 2,
  )
  const availableHeight = Math.max(
    GRAPH_VIEW.viewportMinHeight,
    viewport.height - GRAPH_VIEW.viewportPaddingY * 2,
  )
  const rawZoom = Math.min(availableWidth / spanX, availableHeight / spanY) * GRAPH_VIEW.clusterZoomScale

  return {
    centerX: (expandedMinX + expandedMaxX) / 2,
    centerY: (expandedMinY + expandedMaxY) / 2,
    zoom: Math.max(GRAPH_VIEW.clusterMinZoom, Math.min(GRAPH_VIEW.clusterMaxZoom, rawZoom)),
  }
}

export function getGraphLinkNodeId(endpoint) {
  return typeof endpoint === 'object' ? endpoint?.id : endpoint
}

export function linkTouchesNode(link, nodeId) {
  return getGraphLinkNodeId(link.source) === nodeId || getGraphLinkNodeId(link.target) === nodeId
}
