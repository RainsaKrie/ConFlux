import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock3, ExternalLink, GitMerge, Hash, LoaderCircle, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'
import { displayDimensionValue } from '../../utils/displayTag'
import { RevisionDiffPanel } from '../assimilation/RevisionDiffPanel'

const MotionAside = motion.aside
const primaryEditableDimensions = ['domain', 'format', 'project']
const secondaryEditableDimensions = ['stage', 'source']
const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}

export function PeekDrawer({
  assimilatingTargetId,
  drawerRecommendation,
  drawerSummary,
  isRecommendationDrawerActive,
  isSelectedRevisionCurrent,
  onAssimilateRecommendation,
  onClose,
  onExtractDrawerSummary,
  onNavigateToPeekBlock,
  onNavigateToSourceBlock,
  onRestoreRevision,
  onSelectRevision,
  peekBlock,
  peekBlockRevisions,
  peekDimensions,
  selectedRevision,
  selectedRevisionSourceBlock,
}) {
  const { language, t } = useTranslation()

  const peekHasSecondaryMetadata = useMemo(
    () => secondaryEditableDimensions.some((dimension) => (peekDimensions?.[dimension] ?? []).length > 0),
    [peekDimensions],
  )

  const dimensionLabels = useMemo(
    () => ({
      domain: t('editor.tagDimension.domain'),
      format: t('editor.tagDimension.format'),
      project: t('editor.tagDimension.project'),
    }),
    [t],
  )

  if (!peekBlock) return null

  const formatRevisionTime = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getRevisionLabel = (revision) => {
    if (revision?.kind === 'restore') return t('drawer.revisionType.restore')
    if (revision?.kind === 'rollback') return t('drawer.revisionType.rollback')
    return t('drawer.revisionType.assimilation')
  }

  return (
    <MotionAside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className="fixed top-0 right-0 z-50 h-screen w-[500px] overflow-y-auto border-l border-zinc-200/80 bg-white px-10 pb-10 pt-6 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] md:w-[600px]"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <span className="inline-flex items-center gap-1.5">
            <X size={12} strokeWidth={2} />
            <span>{t('common.close')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onNavigateToPeekBlock}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <span className="inline-flex items-center gap-1.5">
            <ExternalLink size={12} strokeWidth={2} />
            <span>{t('drawer.openFullPage')}</span>
          </span>
        </button>
      </div>

      {isRecommendationDrawerActive ? (
        <div className="mt-5 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">{t('drawer.smartRecommendation')}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{t('drawer.recommendationHint')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExtractDrawerSummary}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Sparkles size={12} strokeWidth={2} />
                <span>{t('drawer.extractSummary')}</span>
              </button>
              <button
                type="button"
                onClick={() => void onAssimilateRecommendation()}
                disabled={assimilatingTargetId === peekBlock.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
              >
                {assimilatingTargetId === peekBlock.id ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitMerge size={12} strokeWidth={2} />
                )}
                <span>{t('drawer.assimilate')}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{t('drawer.currentParagraph')}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{drawerRecommendation?.paragraph}</p>
          </div>

          {drawerRecommendation?.matchedTerms?.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {drawerRecommendation.matchedTerms.slice(0, 4).map((term) => (
                <span
                  key={`${peekBlock.id}-${term}`}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600"
                >
                  {term}
                </span>
              ))}
            </div>
          ) : null}

          {drawerSummary ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600">{t('drawer.localSummary')}</div>
              <p className="mt-2 text-sm leading-6 text-emerald-900">{drawerSummary}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <h2 className="mb-4 mt-6 text-2xl font-semibold text-zinc-900">{peekBlock.title || t('common.untitledNote')}</h2>

      <div className="flex flex-wrap items-center gap-2">
        {primaryEditableDimensions.flatMap((dimension) =>
          (peekDimensions?.[dimension] ?? []).map((value) => (
            <span
              key={`peek-${peekBlock.id}-${dimension}-${value}`}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
            >
              <span className="opacity-70">{dimensionLabels[dimension]}</span>
              <span>·</span>
              <span>{displayDimensionValue(dimension, value, language)}</span>
            </span>
          )),
        )}
      </div>

      {peekHasSecondaryMetadata ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-zinc-300">
          <span className="select-none text-[10px]">|</span>
          {secondaryEditableDimensions.flatMap((dimension) =>
            (peekDimensions?.[dimension] ?? []).map((value) => (
              <span
                key={`peek-secondary-${peekBlock.id}-${dimension}-${value}`}
                className={`inline-flex items-center ${
                  dimension === 'stage'
                    ? 'rounded-sm border border-zinc-200/50 border-dashed bg-transparent px-1.5 py-0.5 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-400'
                    : 'gap-1 bg-transparent text-[10px] text-zinc-400/80'
                }`}
              >
                {dimension === 'source' ? <Hash size={8} strokeWidth={2} className="shrink-0" /> : null}
                <span>{dimension === 'stage' ? `!${displayDimensionValue(dimension, value, language)}` : displayDimensionValue(dimension, value, language)}</span>
              </span>
            )),
          )}
        </div>
      ) : null}

      {peekBlockRevisions.length ? (
        <div className="mt-6 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">{t('drawer.versionHistory')}</div>
              <div className="mt-1 text-sm font-medium text-zinc-900">
                {t('drawer.recentVersions', { count: peekBlockRevisions.length })}
              </div>
            </div>
            {selectedRevision ? (
              <button
                type="button"
                onClick={onRestoreRevision}
                disabled={isSelectedRevisionCurrent}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('drawer.restoreThisVersion')}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {peekBlockRevisions.map((revision) => (
              <button
                key={revision.id}
                type="button"
                onClick={() => onSelectRevision(revision.id)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                  selectedRevision?.id === revision.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100'
                }`}
              >
                {formatRevisionTime(revision.createdAt)}
              </button>
            ))}
          </div>

          {selectedRevision ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                  <Clock3 size={12} />
                  {formatRevisionTime(selectedRevision.createdAt)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 font-medium ${
                    isSelectedRevisionCurrent
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200 bg-white text-zinc-600'
                  }`}
                >
                  {isSelectedRevisionCurrent ? t('drawer.currentVersion') : t('drawer.historyVersion')}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                  {getRevisionLabel(selectedRevision)}
                </span>
                {selectedRevision.poolName ? (
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                    {selectedRevision.poolName}
                  </span>
                ) : null}
              </div>

              {selectedRevision?.sourceBlockId ? (
                <button
                  type="button"
                  onClick={onNavigateToSourceBlock}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-200/60 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200/50"
                >
                  <GitMerge size={10} strokeWidth={2} className="text-zinc-400" />
                  <span>
                    {t('drawer.sourceNote', {
                      title: selectedRevisionSourceBlock?.title || selectedRevision.sourceBlockTitle,
                    })}
                  </span>
                </button>
              ) : null}

              {selectedRevision.contextParagraph ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-indigo-500">
                    {selectedRevision.kind === 'assimilation'
                      ? t('drawer.contextLabel.assimilation')
                      : t('drawer.contextLabel.restore')}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-indigo-900">{selectedRevision.contextParagraph}</p>
                </div>
              ) : null}

              <RevisionDiffPanel
                beforeContent={selectedRevision.beforeContent}
                afterContent={selectedRevision.afterContent}
                beforeLabel={selectedRevision.kind === 'assimilation' ? t('diff.before') : t('drawer.historyVersion')}
                afterLabel={selectedRevision.kind === 'assimilation' ? t('diff.after') : t('drawer.currentVersion')}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {peekBlock.content?.trim() ? (
        <div
          className="prose-readable mt-8 text-[15px] leading-relaxed text-zinc-700"
          dangerouslySetInnerHTML={{ __html: peekBlock.content }}
        />
      ) : (
        <div className="mt-8 text-sm font-light leading-relaxed text-zinc-500">{t('drawer.emptyContent')}</div>
      )}
    </MotionAside>
  )
}
