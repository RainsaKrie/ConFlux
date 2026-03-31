import { CircleDot, LoaderCircle } from 'lucide-react'

export function QuickCaptureCard({
  value,
  onChange,
  onKeyDown,
  isSubmitting,
  activeLabel,
}) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={'\u5199\u4e0b\u95ea\u5ff5... (\u56de\u8f66\u5b58\u5165\u77e5\u8bc6\u6d41)'}
        className="min-h-28 w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-7 text-zinc-900 outline-none placeholder:text-zinc-400"
      />
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
        <div className="text-xs text-zinc-400">
          {isSubmitting
            ? '\u6b63\u5728\u8c03\u7528 AI \u9759\u9ed8\u6253\u6807...'
            : 'Quick Capture \u63d0\u4ea4\u540e\u4f1a\u81ea\u52a8\u751f\u6210\u6807\u7b7e'}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
          {isSubmitting ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CircleDot className="h-3.5 w-3.5" />
          )}
          {activeLabel}
        </div>
      </div>
    </section>
  )
}
