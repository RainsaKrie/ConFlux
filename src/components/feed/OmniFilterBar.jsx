import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'
import { displayDimensionValue } from '../../utils/displayTag'

const MotionDiv = motion.div
const tokenStyles = {
  domain: 'bg-blue-50 text-blue-700',
  format: 'bg-zinc-100 text-zinc-700',
  project: 'bg-purple-50 text-purple-700',
  stage: 'border border-zinc-200/80 bg-white text-zinc-500',
  source: 'border border-zinc-200/70 bg-white text-zinc-400',
}
const tokenRemoveStyles = {
  domain: 'text-blue-500 hover:text-blue-700',
  format: 'text-zinc-400 hover:text-zinc-700',
  project: 'text-purple-500 hover:text-purple-700',
  stage: 'text-zinc-400 hover:text-zinc-600',
  source: 'text-zinc-300 hover:text-zinc-500',
}

function buildTokenKey(token) {
  return `${token.dimension}:${token.value}`
}

export function OmniFilterBar({
  query,
  onQueryChange,
  activeTokens,
  onAddToken,
  onRemoveToken,
  tagSuggestions,
  resultCount,
  onSaveView,
  actions,
}) {
  const { language, t } = useTranslation()
  const [inputValue, setInputValue] = useState(query)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const dimensionLabels = useMemo(
    () => ({
      domain: t('editor.tagDimension.domain'),
      format: t('editor.tagDimension.format'),
      project: t('editor.tagDimension.project'),
      stage: t('editor.tagDimension.stage'),
      source: t('editor.tagDimension.source'),
    }),
    [t],
  )

  useEffect(() => {
    setInputValue(query)
  }, [query])

  const hashMatch = inputValue.match(/(^|\s)#([^\s#]*)$/)
  const tagQuery = hashMatch?.[2]?.toLowerCase() ?? ''
  const isSuggesting = Boolean(hashMatch)

  const filteredSuggestions = useMemo(() => {
    const pool = tagSuggestions.filter((item) =>
      displayDimensionValue(item.dimension, item.value, language).toLowerCase().includes(tagQuery),
    )
    return pool.slice(0, 10)
  }, [language, tagQuery, tagSuggestions])

  useEffect(() => {
    setSelectedIndex(0)
  }, [tagQuery])

  const applyInputValue = (nextValue) => {
    setInputValue(nextValue)
    const nextQuery = nextValue.replace(/(^|\s)#[^\s#]*$/, ' ').replace(/\s+/g, ' ').trim()
    onQueryChange(nextQuery)
  }

  const commitSuggestion = (suggestion) => {
    onAddToken({ dimension: suggestion.dimension, value: suggestion.value })
    const stripped = inputValue.replace(/(^|\s)#[^\s#]*$/, ' ').replace(/\s+/g, ' ')
    setInputValue(stripped)
    onQueryChange(stripped.trim())
    setSelectedIndex(0)
  }

  return (
    <section className="relative mt-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 rounded-[24px] bg-zinc-100/70 px-4 py-3 transition hover:bg-zinc-100">
          <div className="flex flex-wrap items-center gap-2">
            <Search className="h-4 w-4 text-zinc-400" />
            {activeTokens.map((token) => (
              <div
                key={buildTokenKey(token)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  tokenStyles[token.dimension] ?? tokenStyles.domain
                }`}
              >
                <span className="opacity-70">{dimensionLabels[token.dimension] ?? 'Tag'}</span>
                <span>{`#${displayDimensionValue(token.dimension, token.value, language)}`}</span>
                <button
                  type="button"
                  onClick={() => onRemoveToken(buildTokenKey(token))}
                  className={`rounded-full transition ${
                    tokenRemoveStyles[token.dimension] ?? tokenRemoveStyles.domain
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <input
              value={inputValue}
              onChange={(event) => applyInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && inputValue.trim() === '' && activeTokens.length > 0) {
                  onRemoveToken(buildTokenKey(activeTokens[activeTokens.length - 1]))
                  return
                }

                if (!isSuggesting || filteredSuggestions.length === 0) return

                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setSelectedIndex((current) => (current + 1) % filteredSuggestions.length)
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setSelectedIndex((current) =>
                    (current - 1 + filteredSuggestions.length) % filteredSuggestions.length,
                  )
                }

                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitSuggestion(filteredSuggestions[selectedIndex])
                }
              }}
              placeholder={t('feed.searchPlaceholder')}
              className="min-w-[220px] flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            {onSaveView ? (
              <button
                type="button"
                onClick={onSaveView}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:text-zinc-900"
              >
                {t('feed.saveView')}
              </button>
            ) : null}
          </div>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="mt-2 flex justify-end text-[11px] text-zinc-400">{t('feed.resultsCount', { count: resultCount })}</div>

      <AnimatePresence>
        {isSuggesting && filteredSuggestions.length > 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="max-h-[280px] overflow-y-auto p-2">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.dimension}-${suggestion.value}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    commitSuggestion(suggestion)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    index === selectedIndex ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                      {dimensionLabels[suggestion.dimension] ?? 'Tag'}
                    </span>
                    <span className="truncate font-medium">
                      {`#${displayDimensionValue(suggestion.dimension, suggestion.value, language)}`}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{suggestion.count}</span>
                </button>
              ))}
            </div>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
