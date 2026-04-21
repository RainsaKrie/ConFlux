import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NativeAttachmentNodeView } from './NativeAttachmentNodeView'

function pickFileName(attributes) {
  return attributes.fileName || attributes.mediaFileName || 'Attachment'
}

function pickLabel(attributes, key, fallback) {
  return attributes[key] || fallback
}

export const NativeAttachmentNode = Node.create({
  name: 'nativeAttachment',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      fileName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-file-name') ?? element.getAttribute('data-media-file-name') ?? '',
        renderHTML: (attributes) => (
          attributes.fileName
            ? {
                'data-file-name': attributes.fileName,
                'data-media-file-name': attributes.fileName,
              }
            : {}
        ),
      },
      mediaRelativePath: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-relative-path'),
        renderHTML: (attributes) => (
          attributes.mediaRelativePath
            ? { 'data-media-relative-path': attributes.mediaRelativePath }
            : {}
        ),
      },
      mediaOrigin: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-origin'),
        renderHTML: (attributes) => (
          attributes.mediaOrigin
            ? { 'data-media-origin': attributes.mediaOrigin }
            : {}
        ),
      },
      mediaMissing: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-missing'),
        renderHTML: (attributes) => (
          attributes.mediaMissing
            ? { 'data-media-missing': attributes.mediaMissing }
            : {}
        ),
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-href'),
        renderHTML: (attributes) => (
          attributes.href
            ? { 'data-media-href': attributes.href }
            : {}
        ),
      },
      kickerLabel: {
        default: 'Local attachment',
        parseHTML: (element) => element.getAttribute('data-kicker-label'),
        renderHTML: (attributes) => ({
          'data-kicker-label': pickLabel(attributes, 'kickerLabel', 'Local attachment'),
        }),
      },
      openLabel: {
        default: 'Open file',
        parseHTML: (element) => element.getAttribute('data-open-label'),
        renderHTML: (attributes) => ({
          'data-open-label': pickLabel(attributes, 'openLabel', 'Open file'),
        }),
      },
      storedLabel: {
        default: 'Stored locally',
        parseHTML: (element) => element.getAttribute('data-stored-label'),
        renderHTML: (attributes) => ({
          'data-stored-label': pickLabel(attributes, 'storedLabel', 'Stored locally'),
        }),
      },
      unavailableLabel: {
        default: 'Unavailable',
        parseHTML: (element) => element.getAttribute('data-unavailable-label'),
        renderHTML: (attributes) => ({
          'data-unavailable-label': pickLabel(attributes, 'unavailableLabel', 'Unavailable'),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'attachment-card' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const fileName = pickFileName(node.attrs)
    const isMissing = node.attrs.mediaMissing === 'true'
    const href = node.attrs.href
    const kickerLabel = pickLabel(node.attrs, 'kickerLabel', 'Local attachment')
    const openLabel = pickLabel(node.attrs, 'openLabel', 'Open file')
    const storedLabel = pickLabel(node.attrs, 'storedLabel', 'Stored locally')
    const unavailableLabel = pickLabel(node.attrs, 'unavailableLabel', 'Unavailable')

    return [
      'attachment-card',
      mergeAttributes(HTMLAttributes, {
        class: 'flux-native-attachment',
        contenteditable: 'false',
      }),
      [
        'div',
        { class: 'flux-attachment-card' },
        [
          'div',
          { class: 'flux-attachment-copy' },
          ['span', { class: 'flux-attachment-kicker' }, kickerLabel],
          ['span', { class: 'flux-attachment-name' }, fileName],
        ],
        href && !isMissing
          ? ['a', { class: 'flux-attachment-action', href, target: '_blank', rel: 'noreferrer' }, openLabel]
          : ['span', { class: 'flux-attachment-action flux-attachment-action--muted' }, isMissing ? unavailableLabel : storedLabel],
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NativeAttachmentNodeView)
  },
})
