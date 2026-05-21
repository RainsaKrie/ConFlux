import { AlertCircle, LoaderCircle, Trash2 } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'
import { contentToPlainText } from '../../utils/blocks'
import { displayDimensionValue } from '../../utils/displayTag'

const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
  stage: 'border border-zinc-200/70 bg-white text-zinc-500',
}

export function KnowledgeCard({ block, onOpen, onDelete }) {
  const { language, t } = useTranslation()
  const preview = contentToPlainText(block.content)
  const visibleDimensions = ['domain', 'format', 'project', 'stage']
  const sourceMetadata = (block.dimensions?.source ?? []).slice(0, 2)
  const enrichmentStatus = block.aiEnrichment?.status
  const enrichmentError = block.aiEnrichment?.lastError ?? ''
  const hasFailedEnrichment = enrichmentStatus === 'failed'
  const isQueuedEnrichment = enrichmentStatus === 'pending'
  const isProcessingEnrichment = enrichmentStatus === 'processing'
  const displayedEnrichmentError = /HTTP\s+404/i.test(enrichmentError)
    ? t('feed.autoTagApiPathHint')
    : enrichmentError || t('feed.autoTagUnknownError')

  return (
    <article className="group relative h-72 rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen?.(block)}
        className="flex h-full w-full flex-col text-left"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 truncate">
            <div className="mb-3 inline-flex max-w-full rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              <span className="block max-w-full truncate overflow-hidden whitespace-nowrap">
                {block.id}
              </span>
            </div>
            <h3 className="mb-2 truncate text-lg font-semibold tracking-tight text-zinc-900">
              {block.title}
            </h3>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 whitespace-nowrap">
            <div className="text-right text-[11px] uppercase tracking-[0.22em] text-zinc-400">
              <div>{t('card.updated')}</div>
              <div className="mt-1 text-zinc-500">{block.updatedAt}</div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDelete?.(block)
              }}
              className="rounded-full bg-white/90 p-2 text-zinc-300 opacity-0 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <p className="line-clamp-5 text-sm leading-relaxed text-zinc-600">{preview}</p>
        </div>

        {hasFailedEnrichment ? (
          <div
            className="mt-4 flex min-w-0 items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600"
            title={t('feed.autoTagCardFailed', { message: enrichmentError || displayedEnrichmentError })}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t('feed.autoTagCardFailed', { message: displayedEnrichmentError })}
            </span>
          </div>
        ) : null}

        {isQueuedEnrichment ? (
          <div className="mt-4 flex min-w-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
            <LoaderCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('feed.autoTagCardQueued')}</span>
          </div>
        ) : null}

        {isProcessingEnrichment ? (
          <div className="mt-4 flex min-w-0 items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-600">
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
            <span className="truncate">{t('feed.autoTagCardProcessing')}</span>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {Object.entries(block.dimensions)
            .filter(([dimension]) => visibleDimensions.includes(dimension))
            .flatMap(([dimension, values]) =>
              values.map((value) => (
                <span
                  key={`${block.id}-${dimension}-${value}`}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                >
                  {displayDimensionValue(dimension, value, language)}
                </span>
              )),
            )}
        </div>

        {sourceMetadata.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {sourceMetadata.map((value) => (
              <span key={`${block.id}-source-${value}`} className="text-[10px] text-zinc-400/80">
                #{displayDimensionValue('source', value, language)}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    </article>
  )
}
