import { Trash2 } from 'lucide-react'
import { contentToPlainText } from '../../utils/blocks'

const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}

export function KnowledgeCard({ block, onOpen, onDelete }) {
  const preview = contentToPlainText(block.content)
  const visibleDimensions = ['domain', 'format', 'project']

  return (
    <article className="group relative h-72 rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete?.(block)
        }}
        className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-zinc-400 opacity-0 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(block)}
        className="flex h-full w-full flex-col text-left"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              {block.id}
            </div>
            <h3 className="mb-2 line-clamp-2 text-lg font-semibold tracking-tight text-zinc-900">
              {block.title}
            </h3>
          </div>
          <div className="text-right text-[11px] uppercase tracking-[0.22em] text-zinc-400">
            <div>Updated</div>
            <div className="mt-1 text-zinc-500">{block.updatedAt}</div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <p className="line-clamp-5 text-sm leading-relaxed text-zinc-600">{preview}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {Object.entries(block.dimensions)
            .filter(([dimension]) => visibleDimensions.includes(dimension))
            .flatMap(([dimension, values]) =>
              values.map((value) => (
                <span
                  key={`${block.id}-${dimension}-${value}`}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${dimensionStyles[dimension]}`}
                >
                  {value}
                </span>
              )),
            )}
        </div>
      </button>
    </article>
  )
}
