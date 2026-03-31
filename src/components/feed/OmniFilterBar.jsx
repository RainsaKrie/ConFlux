import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

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
  const [inputValue, setInputValue] = useState(query)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setInputValue(query)
  }, [query])

  const hashMatch = inputValue.match(/(^|\s)#([^\s#]*)$/)
  const tagQuery = hashMatch?.[2]?.toLowerCase() ?? ''
  const isSuggesting = Boolean(hashMatch)

  const filteredSuggestions = useMemo(() => {
    const pool = tagSuggestions.filter((item) => item.value.toLowerCase().includes(tagQuery))
    return pool.slice(0, 10)
  }, [tagQuery, tagSuggestions])

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
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                <span>{`#${token.value}`}</span>
                <button
                  type="button"
                  onClick={() => onRemoveToken(buildTokenKey(token))}
                  className="rounded-full text-blue-500 transition hover:text-blue-700"
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
              placeholder="🔍 搜索内容... 或输入 # 添加标签条件"
              className="min-w-[220px] flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            {onSaveView ? (
              <button
                type="button"
                onClick={onSaveView}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:text-zinc-900"
              >
                + 保存视图
              </button>
            ) : null}
          </div>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="mt-2 flex justify-end text-[11px] text-zinc-400">当前涌现 {resultCount} 个知识块</div>

      <AnimatePresence>
        {isSuggesting && filteredSuggestions.length > 0 ? (
          <motion.div
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
                  <span className="font-medium">{`#${suggestion.value}`}</span>
                  <span className="text-[11px] text-zinc-400">{suggestion.count}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
