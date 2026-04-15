import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const foldingPluginKey = new PluginKey('fluxFolding')

function isHeadingNode(node) {
  const level = Number(node?.attrs?.level)
  return node?.type?.name === 'heading' && [1, 2, 3].includes(level)
}

function normalizeCollapsedPositions(collapsedPositions = []) {
  return Array.from(
    new Set(
      (Array.isArray(collapsedPositions) ? collapsedPositions : [])
        .filter((value) => Number.isInteger(value) && value >= 0),
    ),
  ).sort((left, right) => left - right)
}

function collectHeadingEntries(doc) {
  const headings = []

  doc.descendants((node, pos) => {
    if (!isHeadingNode(node)) return

    headings.push({
      pos,
      level: Number(node.attrs.level) || 1,
      node,
    })
  })

  return headings
}

function filterExistingHeadingPositions(doc, collapsedPositions) {
  const headingPositions = new Set(collectHeadingEntries(doc).map((heading) => heading.pos))
  return normalizeCollapsedPositions(collapsedPositions).filter((position) => headingPositions.has(position))
}

function buildCollapsedRanges(doc, collapsedPositions) {
  const headings = collectHeadingEntries(doc)

  return filterExistingHeadingPositions(doc, collapsedPositions)
    .map((position) => {
      const currentIndex = headings.findIndex((heading) => heading.pos === position)
      if (currentIndex === -1) return null

      const currentHeading = headings[currentIndex]
      let rangeEnd = doc.content.size

      for (let index = currentIndex + 1; index < headings.length; index += 1) {
        if (headings[index].level <= currentHeading.level) {
          rangeEnd = headings[index].pos
          break
        }
      }

      const rangeStart = currentHeading.pos + currentHeading.node.nodeSize
      if (rangeStart >= rangeEnd) return null

      return {
        from: rangeStart,
        to: rangeEnd,
      }
    })
    .filter(Boolean)
}

function buildFoldDecorations(doc, collapsedPositions) {
  const decorations = []

  buildCollapsedRanges(doc, collapsedPositions).forEach(({ from, to }) => {
    doc.nodesBetween(from, to, (node, pos, parent) => {
      if (pos < from) return
      if (!node.isBlock || parent?.type?.name !== 'doc') return

      const nodeEnd = pos + node.nodeSize
      if (nodeEnd > to) return false

      decorations.push(
        Decoration.node(pos, nodeEnd, {
          class: 'flux-folded-content',
          'data-fold-hidden': 'true',
        }),
      )

      return false
    })
  })

  return DecorationSet.create(doc, decorations)
}

function buildPluginState(doc, collapsedPositions = []) {
  const nextCollapsedPositions = filterExistingHeadingPositions(doc, collapsedPositions)

  return {
    collapsedPositions: nextCollapsedPositions,
    decorations: buildFoldDecorations(doc, nextCollapsedPositions),
  }
}

export function getCollapsedHeadingPositions(editorState) {
  return foldingPluginKey.getState(editorState)?.collapsedPositions ?? []
}

export const FoldingExtension = Extension.create({
  name: 'folding',

  addCommands() {
    return {
      toggleCollapsedHeading:
        (position) =>
          ({ state, dispatch }) => {
            if (!Number.isInteger(position)) return false
            if (!isHeadingNode(state.doc.nodeAt(position))) return false

            if (dispatch) {
              dispatch(
                state.tr.setMeta(foldingPluginKey, {
                  type: 'toggleCollapsedHeading',
                  position,
                }),
              )
            }

            return true
          },
      setCollapsedHeadings:
        (positions = []) =>
          ({ state, dispatch }) => {
            if (!dispatch) return true

            dispatch(
              state.tr.setMeta(foldingPluginKey, {
                type: 'setCollapsedHeadings',
                positions,
              }),
            )

            return true
          },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: foldingPluginKey,
        state: {
          init: (_, state) => buildPluginState(state.doc),
          apply(tr, pluginState, _oldState, newState) {
            const meta = tr.getMeta(foldingPluginKey)

            if (!tr.docChanged && !meta) {
              return pluginState
            }

            let nextCollapsedPositions = pluginState.collapsedPositions

            if (tr.docChanged) {
              nextCollapsedPositions = nextCollapsedPositions.map((position) => tr.mapping.map(position))
            }

            if (meta?.type === 'toggleCollapsedHeading' && Number.isInteger(meta.position)) {
              nextCollapsedPositions = nextCollapsedPositions.includes(meta.position)
                ? nextCollapsedPositions.filter((position) => position !== meta.position)
                : [...nextCollapsedPositions, meta.position]
            }

            if (meta?.type === 'setCollapsedHeadings') {
              nextCollapsedPositions = normalizeCollapsedPositions(meta.positions)
            }

            return buildPluginState(newState.doc, nextCollapsedPositions)
          },
        },
        props: {
          decorations(state) {
            return foldingPluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
