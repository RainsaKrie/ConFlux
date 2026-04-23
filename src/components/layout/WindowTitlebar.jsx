import { useMemo } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

function resolveIsTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__)
}

export function WindowTitlebar() {
  const isTauri = useMemo(() => resolveIsTauri(), [])

  if (!isTauri) return null

  const appWindow = getCurrentWindow()
  const handleDragStart = async () => {
    try {
      await appWindow.startDragging()
    } catch (error) {
      console.warn('Window dragging is unavailable.', error)
    }
  }
  const handleMinimize = async () => {
    try {
      await appWindow.minimize()
    } catch (error) {
      console.warn('Window minimize failed.', error)
    }
  }
  const handleToggleMaximize = async () => {
    try {
      await appWindow.toggleMaximize()
    } catch (error) {
      console.warn('Window maximize toggle failed.', error)
    }
  }
  const handleClose = async () => {
    try {
      await appWindow.close()
    } catch (error) {
      console.warn('Window close failed.', error)
    }
  }

  return (
    <div className="h-10 w-full shrink-0 bg-zinc-50/80 backdrop-blur-md">
      <div className="flex h-full items-center px-2">
        <button
          type="button"
          onMouseDown={handleDragStart}
          onDoubleClick={handleToggleMaximize}
          className="flex h-full min-w-0 flex-1 items-center rounded-xl px-3 text-left text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-400"
          aria-label="Drag window"
          data-tauri-drag-region="true"
        >
          Conflux
        </button>

        <div className="flex h-full items-center gap-0.5">
          <button
            type="button"
            onClick={handleMinimize}
            className="flex h-full w-10 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-200/50"
            aria-label="Minimize window"
          >
            <Minus size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="flex h-full w-10 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-200/50"
            aria-label="Toggle maximize"
          >
            <Square size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-full w-10 items-center justify-center text-zinc-400 transition-colors hover:bg-red-500 hover:text-white"
            aria-label="Close window"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
