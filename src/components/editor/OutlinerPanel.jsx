export function OutlinerPanel({ items = [], onJump, title }) {
  if (!items.length) return null

  return (
    <aside className="pointer-events-none fixed left-8 top-1/3 z-20 hidden w-48 xl:block">
      <div className="rounded-2xl border border-zinc-200/70 bg-white/72 px-3 py-3 text-[11px] font-medium leading-relaxed tracking-[0.08em] text-zinc-500 shadow-[0_14px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-zinc-400">{title}</div>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump?.(item)}
              className={`pointer-events-auto flex w-full items-center border-l bg-transparent py-1 text-left transition-colors hover:text-zinc-800 ${
                item.level === 1
                  ? 'border-zinc-300 pl-0 text-zinc-600'
                  : item.level === 2
                    ? 'border-zinc-200 pl-2 text-zinc-500'
                    : 'border-zinc-100 pl-4 text-zinc-400'
              }`}
            >
              <span className="line-clamp-2">{item.text}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
