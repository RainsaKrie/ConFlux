import { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import { useFluxStore } from '../../../store/useFluxStore'

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = 'deepseek-chat'

export function AdaptiveLensNodeView({ editor, node, updateAttributes }) {
  const [streamedSummary, setStreamedSummary] = useState(node.attrs.summary || '')
  const [draftIntent, setDraftIntent] = useState(node.attrs.userIntent || '')
  const requestKeyRef = useRef('')
  const setPeekBlockId = useFluxStore((state) => state.setPeekBlockId)

  const { title, content, contextParagraph, requestState, summary, userIntent } = node.attrs

  useEffect(() => {
    setStreamedSummary(summary || '')
  }, [summary])

  useEffect(() => {
    if (requestState === 'draft') {
      setDraftIntent(userIntent || '')
      requestKeyRef.current = ''
    }
  }, [requestState, userIntent])

  useEffect(() => {
    if (requestState !== 'pending') return

    const macroContext = editor?.getText?.().slice(0, 2000) ?? ''

    const requestKey = `${node.attrs.blockId}:${userIntent || ''}:${contextParagraph || ''}:${macroContext}`
    if (requestKeyRef.current === requestKey) return
    requestKeyRef.current = requestKey

    const configRaw = localStorage.getItem('flux_ai_config')
    let config = null

    try {
      config = configRaw ? JSON.parse(configRaw) : null
    } catch {
      config = null
    }

    if (!config || !config.apiKey) {
      const message = '引用摘要需要大模型支持，请先配置 API Key。'
      setStreamedSummary(message)
      updateAttributes({ summary: message, requestState: 'error', tone: 'error' })
      return
    }

    const runFetch = async () => {
      try {
        setStreamedSummary('')
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => {
          controller.abort()
        }, 12000)

        const intentText = userIntent?.trim() || '无提问，请自然衔接。'

        const response = await fetch(`${(config.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model || DEFAULT_MODEL,
            stream: true,
            messages: [
              {
                role: 'system',
                content:
                  '你是一个顶级的学术代笔者（Ghostwriter）。你的任务是：根据用户的【当前写作语境】，将【被引用的笔记】提炼成一段自然、极其精炼的补充说明。\n    \n【绝对红线（违反将导致系统崩溃）】：\n1. 禁止输出任何格式化前缀（严格禁止输出 "【关联剖析】"、"分析：" 等字眼）。\n2. 禁止使用上帝视角的代词（严格禁止说 "被引用笔记指出..."、"呼应了用户文章..."、"引文中提到..."）。\n3. 绝不强行论证关联性！不要去解释它们为什么有关联。你只需要直接陈述【目标笔记】中能衔接当前语境的客观事实或核心观点！\n4. 必须极其克制，最多 1-2 句话（绝对不要超过 60 个字）！如果两者关联较弱，就简单提炼目标笔记的一句话核心事实即可。',
              },
              {
                role: 'user',
                content: `【用户正在写的全局文章内容】：\n${
                  macroContext || '暂无内容'
                }\n\n【用户明确提问】：${intentText}\n\n【你需要提炼的目标笔记】：\n标题：${title}\n内容：${content}`,
              },
            ],
          }),
          signal: controller.signal,
        })

        window.clearTimeout(timeoutId)

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('响应流不可用')
        }

        const decoder = new TextDecoder('utf-8')
        let fullText = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue
            if (!trimmedLine.startsWith('data: ')) continue

            try {
              const data = JSON.parse(trimmedLine.slice(6))
              const textDelta = data.choices?.[0]?.delta?.content || ''
              if (textDelta) {
                fullText += textDelta
                setStreamedSummary(fullText.trim())
              }
            } catch {
              // 忽略残缺 JSON，不打死流
            }
          }
        }

        updateAttributes({ summary: fullText.trim(), requestState: 'done', tone: 'info' })
      } catch (error) {
        console.error('[Adaptive Lens Error]', error)
        const message = error instanceof Error ? error.message : '未知错误'
        const failureText = `🔴 生成失败: ${message}`
        setStreamedSummary(failureText)
        updateAttributes({ summary: failureText, requestState: 'error', tone: 'error' })
      }
    }

    void runFetch()
  }, [content, contextParagraph, editor, node.attrs.blockId, requestState, title, updateAttributes, userIntent])

  const handleSubmitIntent = () => {
    updateAttributes({
      userIntent: draftIntent.trim(),
      summary: '',
      requestState: 'pending',
      tone: 'info',
    })
  }

  const handleOpenSource = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setPeekBlockId(node.attrs.blockId)
  }

  if (requestState === 'draft') {
    return (
      <NodeViewWrapper className="group relative my-3 border-l-[3px] border-zinc-300 bg-zinc-50/70 py-1.5 pr-4 pl-3 transition-colors hover:border-zinc-400">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
            <div className="rounded-full bg-zinc-100 p-1 text-zinc-500">
              <Sparkles size={12} />
            </div>
            <span>{`即将引用: ${title}`}</span>
          </div>
          <input
            type="text"
            autoFocus
            value={draftIntent}
            placeholder="输入你希望生成的摘要重点，或直接回车使用默认摘要"
            className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white"
            onChange={(event) => setDraftIntent(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmitIntent()
              }
            }}
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="group relative my-3 min-h-[28px] border-l-[3px] border-zinc-300 bg-zinc-50/70 py-1.5 pr-4 pl-3 transition-colors hover:border-zinc-400">
      <div className="inline-block w-full">
        <span className={`inline break-words text-[15px] leading-relaxed ${node.attrs.requestState === 'error' ? 'text-red-500' : 'text-zinc-700'}`}>
          {streamedSummary || '正在生成引用摘要...'}
        </span>
        <span className="relative -top-[1px] ml-2 inline-flex items-center gap-1.5 align-middle">
          <span
            contentEditable={false}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={handleOpenSource}
            className="inline-flex cursor-pointer select-none items-center gap-0.5 rounded border border-zinc-200/50 bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-200"
          >
            <span contentEditable={false}>{`来源: ${title}`}</span>
            <ExternalLink size={12} />
          </span>
          <button
            type="button"
            contentEditable={false}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={() => {
              setDraftIntent(userIntent || '')
              setStreamedSummary('')
              updateAttributes({ requestState: 'draft' })
            }}
            className="cursor-pointer rounded-md border border-zinc-200/60 bg-white p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100"
            title="重新生成摘要"
          >
            <RefreshCw size={12} strokeWidth={2.2} />
          </button>
        </span>
      </div>
    </NodeViewWrapper>
  )
}
