import { NodeViewWrapper } from '@tiptap/react'
import { Link } from 'lucide-react'
import { useFluxStore } from '../../../store/useFluxStore'

function buildPreviewText(excerpt = '', content = '') {
  const raw = (excerpt || content || '').replace(/\s+/g, ' ').trim()
  if (!raw) return '原始笔记暂时没有可展示的正文摘要。'
  return raw.length > 50 ? `${raw.slice(0, 50)}...` : raw
}

export function AdaptiveLensNodeView({ node }) {
  const setPeekBlockId = useFluxStore((state) => state.setPeekBlockId)
  const { blockId, title, excerpt, content } = node.attrs
  const previewText = buildPreviewText(excerpt, content)

  return (
    <NodeViewWrapper className="my-2" contentEditable={false}>
      <div className="flex flex-col gap-1 border-l-2 border-indigo-400 bg-indigo-50/30 py-1.5 pl-3 text-sm text-zinc-600">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500/80">引用节点</div>
        <div className="text-sm font-medium text-zinc-800">{title || '未命名笔记'}</div>
        <p className="text-sm leading-relaxed text-zinc-600">{previewText}</p>
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setPeekBlockId(blockId)
          }}
          className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700"
        >
          <Link size={12} strokeWidth={2} />
          <span>查看原文</span>
        </button>
      </div>
    </NodeViewWrapper>
  )
}
