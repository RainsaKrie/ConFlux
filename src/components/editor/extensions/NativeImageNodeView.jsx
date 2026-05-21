import { NodeViewWrapper } from '@tiptap/react'

export function NativeImageNodeView({ node, selected }) {
  const attrs = node?.attrs ?? {}
  const src = attrs.src || ''
  const alt = attrs.alt || ''
  const title = attrs.title || ''
  const mediaMissing = attrs.mediaMissing === 'true' || attrs.mediaMissing === true
  const mediaRelativePath = attrs.mediaRelativePath || ''
  const mediaOrigin = attrs.mediaOrigin || ''
  const mediaFileName = attrs.mediaFileName || ''

  return (
    <NodeViewWrapper
      className={`flux-image-node ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      data-drag-handle
      draggable="true"
    >
      <img
        src={src}
        alt={alt}
        title={title}
        className="flux-editor-image"
        data-media-missing={mediaMissing ? 'true' : null}
        data-media-relative-path={mediaRelativePath || null}
        data-media-origin={mediaOrigin || null}
        data-media-file-name={mediaFileName || null}
        draggable={false}
      />
    </NodeViewWrapper>
  )
}
