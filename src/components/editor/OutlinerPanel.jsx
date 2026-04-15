import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'

export function OutlinerPanel({
  activeId = null,
  collapsedIds = {},
  emptyLabel = '',
  items = [],
  onJump,
  onToggleCollapse,
  title,
}) {
  const { t } = useTranslation()

  return (
    <aside className="pointer-events-none fixed left-8 top-1/3 z-20 hidden w-48 xl:block">
      <div className="rounded-2xl border border-zinc-200/70 bg-white/72 px-3 py-3 text-[11px] font-medium leading-relaxed tracking-[0.08em] text-zinc-500 shadow-[0_14px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-zinc-400">{title}</div>
        {items.length ? (
          <div className="space-y-1">
            {items.map((item) => {
              const isActive = activeId === item.id
              const isCollapsed = Boolean(collapsedIds[item.id])

              return (
                <div
                  key={item.id}
                  className={`pointer-events-auto flex items-center gap-1 border-l bg-transparent py-1 transition-colors ${
                    isActive
                      ? 'border-zinc-700 text-zinc-900'
                      : item.level === 1
                        ? 'border-zinc-300 text-zinc-600'
                        : item.level === 2
                          ? 'border-zinc-200 text-zinc-500'
                          : 'border-zinc-100 text-zinc-400'
                  } ${
                    item.level === 1
                      ? 'pl-0'
                      : item.level === 2
                        ? 'pl-2'
                        : 'pl-4'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleCollapse?.(item)}
                    title={t(isCollapsed ? 'editor.outlineExpand' : 'editor.outlineCollapse', {
                      title: item.text,
                    })}
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? 'text-zinc-700 hover:bg-zinc-200/80'
                        : 'text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-600'
                    }`}
                    aria-label={t(isCollapsed ? 'editor.outlineExpand' : 'editor.outlineCollapse', {
                      title: item.text,
                    })}
                    aria-pressed={isCollapsed}
                  >
                    {isCollapsed ? <ChevronRight size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onJump?.(item)}
                    className={`min-w-0 flex-1 bg-transparent text-left transition-colors ${
                      isActive
                        ? 'text-zinc-900'
                        : item.level === 1
                          ? 'hover:text-zinc-800'
                          : item.level === 2
                            ? 'hover:text-zinc-700'
                            : 'hover:text-zinc-600'
                    }`}
                  >
                    <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.text}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-[10px] font-normal leading-5 text-zinc-300">{emptyLabel}</div>
        )}
      </div>
    </aside>
  )
}
