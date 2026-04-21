import { NodeViewWrapper } from '@tiptap/react'
import { ExternalLink, Paperclip } from 'lucide-react'

export function NativeAttachmentNodeView({ node, selected }) {
  const attrs = node?.attrs ?? {}
  const fileName = attrs.fileName || 'Attachment'
  const href = attrs.href || ''
  const isMissing = attrs.mediaMissing === 'true' || attrs.mediaMissing === true
  const kickerLabel = attrs.kickerLabel || 'Local attachment'
  const openLabel = attrs.openLabel || 'Open file'
  const storedLabel = attrs.storedLabel || 'Stored locally'
  const unavailableLabel = attrs.unavailableLabel || 'Unavailable'

  return (
    <NodeViewWrapper
      className={`flux-native-attachment ${selected ? 'is-selected' : ''}`}
      data-media-missing={isMissing ? 'true' : 'false'}
      contentEditable={false}
    >
      <div className="flux-attachment-card">
        <div className="flux-attachment-copy">
          <span className="flux-attachment-icon">
            <Paperclip size={14} strokeWidth={2} />
          </span>
          <div className="flux-attachment-copy-inner">
            <span className="flux-attachment-kicker">{kickerLabel}</span>
            <span className="flux-attachment-name">{fileName}</span>
          </div>
        </div>

        {href && !isMissing ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flux-attachment-action"
            contentEditable={false}
          >
            <ExternalLink size={12} strokeWidth={2} />
            <span>{openLabel}</span>
          </a>
        ) : (
          <span className="flux-attachment-action flux-attachment-action--muted">
            {isMissing ? unavailableLabel : storedLabel}
          </span>
        )}
      </div>
    </NodeViewWrapper>
  )
}
