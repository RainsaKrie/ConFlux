import { useMemo } from 'react'
import { Hash, X } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'
import { collectMetadataOverview } from '../../features/metadata/overview'
import { displayDimensionValue } from '../../utils/displayTag'

export function MetadataOverviewPanel({ blocks, onOpenFilter, onRemoveValue }) {
  const { language, t } = useTranslation()
  const overview = useMemo(() => collectMetadataOverview(blocks, ['stage', 'source'], language), [blocks, language])
  const hasMetadata = (overview.stage?.length ?? 0) > 0 || (overview.source?.length ?? 0) > 0

  const copy = useMemo(
    () => ({
      title: language === 'en' ? 'Metadata' : '补充元数据',
      removePrefix: language === 'en' ? 'Remove from all notes' : '全局移除',
      labels: {
        stage: t('editor.tagDimension.stage'),
        source: t('editor.tagDimension.source'),
      },
    }),
    [language, t],
  )

  if (!hasMetadata) return null

  return (
    <div className="mt-8">
      <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">{copy.title}</div>
      <div className="space-y-3">
        {['stage', 'source'].map((dimension) => {
          const items = overview[dimension] ?? []
          if (!items.length) return null

          return (
            <div key={dimension}>
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-300">{copy.labels[dimension]}</div>
              <div className="flex flex-wrap gap-2">
                {items.slice(0, 6).map((item) => (
                  <div
                    key={`${item.dimension}-${item.value}`}
                    className={`group inline-flex items-center ${
                      dimension === 'stage'
                        ? 'rounded-sm border border-zinc-200/60 border-dashed bg-white px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400'
                        : 'rounded-sm bg-transparent px-1 py-0.5 text-[10px] text-zinc-400/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenFilter?.(item.dimension, item.value)}
                      className="inline-flex items-center gap-1 transition hover:text-zinc-700"
                    >
                      {dimension === 'source' ? <Hash size={8} strokeWidth={2} className="shrink-0" /> : null}
                      <span>
                        {dimension === 'stage'
                          ? `!${displayDimensionValue(item.dimension, item.value, language)}`
                          : displayDimensionValue(item.dimension, item.value, language)}
                      </span>
                      <span className="text-zinc-300">{item.count}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveValue?.(item.dimension, item.value)}
                      className="ml-1 rounded-sm opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                      aria-label={`${copy.removePrefix} ${copy.labels[item.dimension]} ${displayDimensionValue(item.dimension, item.value, language)}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
