import { useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { buildAssimilationDiff } from '../../features/assimilation/diff'

const rowToneMap = {
  delete: {
    after: 'border-zinc-100 bg-zinc-50/70 text-zinc-400',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    before: 'border-rose-200 bg-rose-50/80 text-rose-950',
  },
  equal: {
    after: 'border-zinc-100 bg-zinc-50/70 text-zinc-600',
    badge: 'border-zinc-200 bg-white text-zinc-500',
    before: 'border-zinc-100 bg-zinc-50/70 text-zinc-600',
  },
  insert: {
    after: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    before: 'border-zinc-100 bg-zinc-50/70 text-zinc-400',
  },
  replace: {
    after: 'border-indigo-200 bg-indigo-50/80 text-indigo-950',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    before: 'border-rose-100 bg-rose-50/70 text-zinc-700',
  },
}

const partToneMap = {
  add: 'rounded bg-emerald-200/90 px-0.5 text-emerald-950',
  equal: '',
  remove: 'rounded bg-rose-200/90 px-0.5 text-rose-950 line-through decoration-rose-500/80',
}

const summaryToneMap = {
  added: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  changed: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  removed: 'border-rose-200 bg-rose-50 text-rose-700',
}

function renderParts(parts, emptyText) {
  if (!parts.length) {
    return <span className="italic text-zinc-400">{emptyText}</span>
  }

  return parts.map((part, index) => (
    <span key={`${part.type}-${index}`} className={partToneMap[part.type]}>
      {part.value}
    </span>
  ))
}

export function RevisionDiffPanel({
  afterContent = '',
  afterLabel,
  beforeContent = '',
  beforeLabel,
  className = '',
  compact = false,
}) {
  const { t } = useTranslation()
  const diff = useMemo(
    () => buildAssimilationDiff(beforeContent, afterContent),
    [afterContent, beforeContent],
  )

  const rowLabelMap = {
    delete: t('diff.delete'),
    equal: t('diff.equal'),
    insert: t('diff.insert'),
    replace: t('diff.replace'),
  }

  const paddingClass = compact ? 'px-3 py-3' : 'px-4 py-4'
  const textClass = compact ? 'text-[12px] leading-6' : 'text-sm leading-7'

  return (
    <div className={`rounded-[28px] border border-zinc-200/80 bg-white ${className}`.trim()}>
      <div className={`border-b border-zinc-100 ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${summaryToneMap.added}`}>
            + {t('diff.added', { count: diff.stats.added })}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${summaryToneMap.changed}`}>
            ~ {t('diff.changed', { count: diff.stats.changed })}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${summaryToneMap.removed}`}>
            - {t('diff.removed', { count: diff.stats.removed })}
          </span>
          <span className="text-[11px] text-zinc-400">
            {diff.rows.length ? t('diff.summary', { count: diff.rows.length }) : t('diff.empty')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] border-b border-zinc-100 bg-zinc-50/70">
        <div className={`${compact ? 'px-3 py-2.5' : 'px-4 py-3'} text-[11px] uppercase tracking-[0.18em] text-zinc-400`}>
          {t('diff.type')}
        </div>
        <div className={`${compact ? 'px-3 py-2.5' : 'px-4 py-3'} text-[11px] uppercase tracking-[0.18em] text-zinc-400`}>
          {beforeLabel || t('diff.before')}
        </div>
        <div className={`${compact ? 'px-3 py-2.5' : 'px-4 py-3'} text-[11px] uppercase tracking-[0.18em] text-zinc-400`}>
          {afterLabel || t('diff.after')}
        </div>
      </div>

      <div className="divide-y divide-zinc-100">
        {diff.rows.length ? (
          diff.rows.map((row, index) => (
            <div key={`${row.type}-${index}`} className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)]">
              <div className={`${paddingClass} flex items-start`}>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${rowToneMap[row.type].badge}`}>
                  {rowLabelMap[row.type]}
                </span>
              </div>

              <div className={paddingClass}>
                <div
                  className={`min-h-full rounded-2xl border ${rowToneMap[row.type].before} ${compact ? 'px-3 py-3' : 'px-3.5 py-3.5'} ${textClass} whitespace-pre-wrap break-words`}
                >
                  {renderParts(
                    row.beforeParts,
                    row.type === 'insert' ? t('diff.insertEmpty') : t('diff.removeEmpty'),
                  )}
                </div>
              </div>

              <div className={paddingClass}>
                <div
                  className={`min-h-full rounded-2xl border ${rowToneMap[row.type].after} ${compact ? 'px-3 py-3' : 'px-3.5 py-3.5'} ${textClass} whitespace-pre-wrap break-words`}
                >
                  {renderParts(
                    row.afterParts,
                    row.type === 'delete' ? t('diff.deleteAfterEmpty') : t('diff.defaultAfterEmpty'),
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`${compact ? 'px-4 py-4' : 'px-5 py-5'} text-sm text-zinc-500`}>
            {t('diff.noVisibleChange')}
          </div>
        )}
      </div>
    </div>
  )
}
