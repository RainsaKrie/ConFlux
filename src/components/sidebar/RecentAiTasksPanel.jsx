import { useMemo } from 'react'
import { AlertCircle, Check, LoaderCircle, Sparkles } from 'lucide-react'
import { useTranslation } from '../../i18n/I18nProvider'

const statusStyles = {
  failed: 'text-rose-500',
  running: 'text-amber-500',
  succeeded: 'text-emerald-500',
}

const statusIcons = {
  failed: AlertCircle,
  running: LoaderCircle,
  succeeded: Check,
}

export function RecentAiTasksPanel({ tasks = [], onOpenBlock }) {
  const { language, t } = useTranslation()

  const copy = useMemo(
    () => ({
      title: language === 'en' ? 'Recent tasks' : '最近任务',
    }),
    [language],
  )

  if (!tasks.length) return null

  return (
    <div className="mt-8">
      <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">{copy.title}</div>
      <div className="space-y-2">
        {tasks.slice(0, 4).map((task) => {
          const Icon = statusIcons[task.status] ?? Sparkles
          const isRunning = task.status === 'running'

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => {
                if (task.targetBlockId) {
                  onOpenBlock?.(task.targetBlockId)
                } else if (task.blockId) {
                  onOpenBlock?.(task.blockId)
                }
              }}
              className="flex w-full items-start gap-2 rounded-2xl border border-zinc-200/70 bg-white px-3 py-2.5 text-left transition hover:bg-zinc-50"
            >
              <Icon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${statusStyles[task.status] ?? 'text-zinc-400'} ${
                  isRunning ? 'animate-spin' : ''
                }`}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-zinc-700">{task.message}</div>
                <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                  {task.targetBlockTitle || task.blockTitle || t('common.untitledNote')}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
