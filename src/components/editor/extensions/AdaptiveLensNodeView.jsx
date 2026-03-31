import { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { AlertTriangle, ExternalLink, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = 'deepseek-chat'

export function AdaptiveLensNodeView({ node, updateAttributes }) {
  const [streamedSummary, setStreamedSummary] = useState(node.attrs.summary || '')
  const [draftIntent, setDraftIntent] = useState(node.attrs.userIntent || '')
  const requestKeyRef = useRef('')

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

    const requestKey = `${node.attrs.blockId}:${userIntent || ''}:${contextParagraph || ''}`
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
      const message = '⚠️ 魔法透镜需要大模型提供算力，请先配置 API Key。'
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

        const intentText = userIntent?.trim()
          ? `【用户的明确提取指令】：${userIntent}`
          : '【用户的明确提取指令】：（用户未提供，请严格根据当前写作语境推断并提取最相关的内容）'

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
                  '你是一个顶级的知识架构师与思想缝合专家（Knowledge Weaver）。用户的【当前写作语境】和被引用的【目标笔记】之间存在隐藏的深度关联。\n\n你的任务：提取【目标笔记】中最能支撑、启发或升华【当前写作语境】的核心洞察（Insight），写成 1-3 句极其精炼、鞭辟入里的论述（约 50-100 字）。\n\n要求：\n1. 拒绝空洞的百科式概括！必须发生明确的知识碰撞。\n2. 语气要像高水平的学术批注，能够【无缝衔接】作为用户当前段落的补充说明或底层逻辑依托。\n3. 不要讲客套话，不要包含“这篇笔记说明了”等机器口吻前缀，直接输出正文文字。',
              },
              {
                role: 'user',
                content: `【当前写作语境】：\n${
                  contextParagraph || '暂无上下文。'
                }\n\n${intentText}\n\n【被引用的目标笔记】：\n标题：${title}\n内容：${content}`,
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
                setStreamedSummary(fullText)
              }
            } catch {
              // 忽略残缺 JSON，不打死流
            }
          }
        }

        updateAttributes({ summary: fullText, requestState: 'done', tone: 'info' })
      } catch (error) {
        console.error('[Adaptive Lens Error]', error)
        const message = error instanceof Error ? error.message : '未知错误'
        const failureText = `🔴 生成失败: ${message}`
        setStreamedSummary(failureText)
        updateAttributes({ summary: failureText, requestState: 'error', tone: 'error' })
      }
    }

    void runFetch()
  }, [content, contextParagraph, node.attrs.blockId, requestState, title, updateAttributes, userIntent])

  const isError =
    requestState === 'error' ||
    streamedSummary.startsWith('🔴') ||
    streamedSummary.startsWith('生成失败')

  const handleSubmitIntent = () => {
    updateAttributes({
      userIntent: draftIntent.trim(),
      summary: '',
      requestState: 'pending',
      tone: 'info',
    })
  }

  if (requestState === 'draft') {
    return (
      <NodeViewWrapper className="my-4">
        <div className="rounded-r-lg border-l-2 border-indigo-400 bg-indigo-50/50 p-3 text-indigo-900">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
              <Sparkles size={14} />
              <span>{`即将透视: ${title}`}</span>
            </div>
            <input
              type="text"
              autoFocus
              value={draftIntent}
              placeholder="你想从中提取什么？(输入明确指令，或直接回车交由 AI 自动推断)"
              className="w-full rounded border border-indigo-200 bg-white/60 px-2 py-1.5 text-sm text-indigo-900 shadow-inner outline-none transition-all placeholder:text-indigo-300 focus:border-indigo-400 focus:bg-white"
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
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`rounded-r-lg border-l-2 p-3 ${
          isError
            ? 'border-rose-400 bg-rose-50/70 text-rose-900'
            : 'border-indigo-400 bg-indigo-50/50 text-indigo-900'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-1.5 ${
              isError ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {isError ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-current/70">
              <span>{isError ? 'Lens Warning' : 'Adaptive Lens'}</span>
              {requestState === 'pending' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            </div>

            <p className="mt-2 text-sm leading-7 text-current/95">
              {streamedSummary || '正在连接模型并生成透镜摘要...'}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-white"
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={() => {
                  setDraftIntent(userIntent || '')
                  setStreamedSummary('')
                  updateAttributes({ requestState: 'draft' })
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重调指令</span>
              </button>

              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isError
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                <span>{`来源: ${title}`}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
