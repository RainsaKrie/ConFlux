export function buildMissingMediaLabel(currentLabel = '', missingLabel = '') {
  const normalizedCurrentLabel = String(currentLabel ?? '').trim()
  const normalizedMissingLabel = String(missingLabel ?? '').trim()

  return normalizedCurrentLabel
    ? `${normalizedCurrentLabel} - ${normalizedMissingLabel}`
    : normalizedMissingLabel
}

export function describeMissingImageState({
  currentAlt = '',
  missingAltText = 'Local media is unavailable.',
  placeholderSrc = '',
} = {}) {
  return {
    alt: buildMissingMediaLabel(currentAlt, missingAltText),
    mediaMissing: 'true',
    src: placeholderSrc,
    title: missingAltText,
  }
}

export function describeAvailableImageState(src = '') {
  return {
    removeAttributes: ['data-media-missing', 'title'],
    src,
  }
}

export function describeMissingAttachmentState({
  missingAttachmentText = 'This local file is unavailable.',
  unavailableAttachmentLabel = 'Unavailable',
} = {}) {
  return {
    mediaMissing: 'true',
    removeAttributes: ['data-media-href'],
    title: missingAttachmentText,
    unavailableAttachmentLabel,
  }
}

export function describeAvailableAttachmentState(href = '') {
  return {
    href,
    removeAttributes: ['data-media-missing', 'title'],
  }
}
