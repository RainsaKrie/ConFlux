import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const phantomWeavingPluginKey = new PluginKey('phantomWeaving')

function buildDecorations(doc, cues) {
  if (!cues?.length) return DecorationSet.empty

  return DecorationSet.create(
    doc,
    cues.map((cue) =>
      Decoration.inline(cue.from, cue.to, {
        class: 'phantom-weave-match',
        'data-phantom-weave': 'true',
        'data-phantom-block-id': cue.blockId,
        'data-phantom-block-title': cue.blockTitle ?? '',
        'data-phantom-match-text': cue.matchText,
        'data-phantom-paragraph-after': String(cue.paragraphAfter),
        'data-phantom-context': cue.contextParagraph,
        'data-phantom-reason-label': cue.reasonLabel ?? '',
        'data-phantom-reason-type': cue.reasonType ?? '',
        'data-phantom-score': String(cue.score ?? ''),
      }),
    ),
  )
}

export const PhantomWeavingExtension = Extension.create({
  name: 'phantomWeaving',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: phantomWeavingPluginKey,
        state: {
          init() {
            return {
              cues: [],
              decorations: DecorationSet.empty,
            }
          },

          apply(transaction, value) {
            const meta = transaction.getMeta(phantomWeavingPluginKey)

            if (meta && Object.prototype.hasOwnProperty.call(meta, 'cues')) {
              return {
                cues: meta.cues,
                decorations: buildDecorations(transaction.doc, meta.cues),
              }
            }

            if (transaction.docChanged || transaction.selectionSet) {
              return {
                cues: value.cues,
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
