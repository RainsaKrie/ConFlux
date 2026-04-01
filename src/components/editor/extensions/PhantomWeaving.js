import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const phantomWeavingPluginKey = new PluginKey('phantomWeaving')

function buildDecorations(doc, cue) {
  if (!cue) return DecorationSet.empty

  return DecorationSet.create(doc, [
    Decoration.inline(cue.from, cue.to, {
      class: 'phantom-weave-cue',
      'data-phantom-weave': 'true',
      'data-phantom-block-id': cue.blockId,
      'data-phantom-match-text': cue.matchText,
      'data-phantom-paragraph-after': String(cue.paragraphAfter),
      'data-phantom-context': cue.contextParagraph,
      'data-phantom-reason': cue.reasonType,
    }),
  ])
}

export const PhantomWeaving = Extension.create({
  name: 'phantomWeaving',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: phantomWeavingPluginKey,
        state: {
          init() {
            return {
              cue: null,
              decorations: DecorationSet.empty,
            }
          },

          apply(transaction, value) {
            const meta = transaction.getMeta(phantomWeavingPluginKey)

            if (meta && Object.prototype.hasOwnProperty.call(meta, 'cue')) {
              return {
                cue: meta.cue,
                decorations: buildDecorations(transaction.doc, meta.cue),
              }
            }

            if (transaction.docChanged || transaction.selectionSet) {
              return {
                cue: value.cue,
                decorations: value.decorations.map(transaction.mapping, transaction.doc),
              }
            }

            return value
          },
        },
        props: {
          decorations(state) {
            return phantomWeavingPluginKey.getState(state)?.decorations ?? null
          },
        },
      }),
    ]
  },
})
