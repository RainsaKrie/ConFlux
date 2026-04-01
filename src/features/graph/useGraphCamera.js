import { useCallback, useEffect, useMemo, useState } from 'react'
import { GRAPH_VIEW } from './constants'
import { getClusterViewport } from './utils'

export function useGraphCamera({ graphData, graphNodeMap, graphRef, size }) {
  const [selectedNode, setSelectedNode] = useState(null)

  const selectedClusterNodes = useMemo(() => {
    if (!selectedNode) return []

    const relatedNodes = graphData.relationMap.get(selectedNode.id) ?? []
    const nodeIds = new Set([selectedNode.id, ...relatedNodes.map((connection) => connection.id)])

    return [...nodeIds].map((nodeId) => graphNodeMap.get(nodeId)).filter(Boolean)
  }, [graphData.relationMap, graphNodeMap, selectedNode])

  useEffect(() => {
    if (!graphRef.current || !size.width || !size.height) return

    const fg = graphRef.current
    const fitGraph = () => {
      fg.zoomToFit(GRAPH_VIEW.zoomToFitDuration, GRAPH_VIEW.zoomToFitPadding)
    }

    let timeoutId = 0
    const rafId = window.requestAnimationFrame(() => {
      fitGraph()
      timeoutId = window.setTimeout(fitGraph, GRAPH_VIEW.zoomToFitDelay)
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [graphData, graphRef, size.height, size.width])

  useEffect(() => {
    if (!selectedNode || !graphRef.current || !size.width || !size.height) return

    const frameCluster = () => {
      const viewport = getClusterViewport(selectedClusterNodes, size)
      if (!viewport) return

      graphRef.current.centerAt(viewport.centerX, viewport.centerY, GRAPH_VIEW.clusterFocusDuration)
      graphRef.current.zoom(viewport.zoom, GRAPH_VIEW.clusterFocusDuration)
    }

    const rafId = window.requestAnimationFrame(frameCluster)
    const timeoutId = window.setTimeout(frameCluster, GRAPH_VIEW.clusterSettleDelay)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [graphRef, selectedClusterNodes, selectedNode, size])

  const focusNode = useCallback((node) => {
    if (!node) return
    setSelectedNode(node)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNode(null)
  }, [])

  return {
    clearSelection,
    focusNode,
    selectedNode,
  }
}
