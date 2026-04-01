export const LINK_DISTANCE_BY_TYPE = {
  lens: 136,
  reference: 118,
  project: 108,
  domain: 98,
  format: 88,
}

export const GRAPH_PHYSICS = {
  d3AlphaDecay: 0.02,
  d3VelocityDecay: 0.22,
  warmupTicks: 100,
  cooldownTicks: 260,
  chargeStrength: (node) =>
    -(175 + (node.degree ?? 0) * 12 + Math.min(42, (node.title?.length ?? 0) * 2.4)),
  collisionPadding: 6,
  collisionStrength: 1,
  linkDistance: (link) => (LINK_DISTANCE_BY_TYPE[link.type] ?? 92) + 10,
  linkStrength: (link) => (link.type === 'lens' ? 0.26 : link.type === 'reference' ? 0.22 : 0.18),
}

export const GRAPH_VIEW = {
  backgroundColor: '#FAFAFA',
  zoomToFitDuration: 520,
  zoomToFitPadding: 132,
  zoomToFitDelay: 720,
  clusterFocusDuration: 900,
  clusterSettleDelay: 220,
  clusterPaddingX: 64,
  clusterPaddingY: 54,
  clusterLabelSafeWidth: 156,
  clusterMinSpanX: 180,
  clusterMinSpanY: 140,
  viewportPaddingX: 132,
  viewportPaddingY: 108,
  viewportMinWidth: 260,
  viewportMinHeight: 240,
  clusterZoomScale: 0.84,
  clusterMinZoom: 0.95,
  clusterMaxZoom: 2.25,
}

export const NODE_STYLE = {
  label: {
    maxLength: 16,
    minFontSize: 10,
    baseFontSize: 12,
    offsetX: 8,
    fontFamily: 'system-ui, sans-serif',
    fontWeightStrong: '600',
    fontWeightDefault: '500',
  },
  pointerArea: {
    baseRadiusMultiplier: 3.8,
    spreadRadiusMultiplier: 0.78,
  },
  halo: {
    matchedOuter: 'rgba(79, 70, 229, 0.22)',
    lockedOuter: 'rgba(79, 70, 229, 0.26)',
    activeOuter: 'rgba(99, 102, 241, 0.2)',
    neighborOuter: 'rgba(129, 140, 248, 0.14)',
    defaultOuter: 'rgba(129, 140, 248, 0.06)',
    matchedMid: 'rgba(99, 102, 241, 0.26)',
    lockedMid: 'rgba(79, 70, 229, 0.24)',
    activeMid: 'rgba(99, 102, 241, 0.2)',
    neighborMid: 'rgba(129, 140, 248, 0.18)',
    defaultMid: 'rgba(129, 140, 248, 0.12)',
  },
  core: {
    matched: 'rgba(79, 70, 229, 1)',
    locked: 'rgba(79, 70, 229, 1)',
    active: 'rgba(99, 102, 241, 1)',
    neighbor: 'rgba(99, 102, 241, 0.92)',
    default: 'rgba(99, 102, 241, 0.85)',
  },
  text: {
    matched: '#18181b',
    locked: '#18181b',
    active: '#18181b',
    neighbor: '#3f3f46',
    default: '#52525b',
  },
  dimming: {
    searchOuterHalo: 'rgba(228, 228, 231, 0.06)',
    searchMidHalo: 'rgba(228, 228, 231, 0.1)',
    searchCore: '#e4e4e7',
    searchText: '#a1a1aa',
    inactiveOuterHalo: 'rgba(212, 212, 216, 0.04)',
    inactiveMidHalo: 'rgba(212, 212, 216, 0.08)',
    inactiveCore: 'rgba(161, 161, 170, 0.42)',
  },
}
