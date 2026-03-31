import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AdaptiveLensNodeView } from './AdaptiveLensNodeView'

export const AdaptiveLensNode = Node.create({
  name: 'adaptiveLens',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: '' },
      title: { default: '' },
      content: { default: '' },
      summary: { default: '' },
      userIntent: { default: '' },
      contextParagraph: { default: '' },
      requestState: { default: 'draft' },
      tone: { default: 'info' },
    }
  },

  parseHTML() {
    return [{ tag: 'adaptive-lens-node' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['adaptive-lens-node', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AdaptiveLensNodeView)
  },
})
