import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react'
import { createPortal } from 'react-dom'
import Highlight from '@tiptap/extension-highlight'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Underline from '@tiptap/extension-underline'
import tippy from 'tippy.js'
import {
  ArrowUpRight,
  Bold,
  Code2,
  Command,
  Dna,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  PanelRightOpen,
  Quote,
  RotateCcw,
  Sparkles,
  Underline as UnderlineIcon,
  Wand2,
} from 'lucide-react'
import { AssimilationDiffPanel } from '../assimilation/AssimilationDiffPanel'
import { buildPhantomLexicon, findLexiconMatches } from '../../features/phantom/lexicon'
import { useFluxStore } from '../../store/useFluxStore'
import { contentToPlainText } from '../../utils/blocks'
import { readAiConfig, resolveChatCompletionsUrl } from '../../utils/aiConfig'
import { AdaptiveLensNode } from './extensions/AdaptiveLensNode'
import { PhantomWeavingExtension, phantomWeavingPluginKey } from './extensions/PhantomWeavingExtension'

const MotionDiv = motion.div
const MotionButton = motion.button

const copy = {
  empty: '\u6ca1\u6709\u5339\u914d\u7684\u77e5\u8bc6\u5757',
}

const dimensionStyles = {
  domain: 'border border-blue-100 bg-blue-50 text-blue-600',
  format: 'border border-zinc-200 bg-zinc-100 text-zinc-500',
  project: 'border border-purple-100 bg-purple-50 text-purple-600',
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeEditorContent(content = '') {
  const trimmed = content.trim()
  if (!trimmed) return '<p></p>'
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br />')}</p>`
}

function extractAssimilationContent(text = '') {
  const fenced = text.match(/```(?:html|markdown)?\s*([\s\S]*?)```/i)
  return (fenced?.[1] ?? text).trim()
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function buildCandidateSnippet(block) {
  const snippet = contentToPlainText(block.content)
  if (!snippet) return '\u6bcd\u4f53\u6682\u65f6\u8fd8\u6ca1\u6709\u6b63\u6587\u6458\u8981'
  return snippet.length > 84 ? `${snippet.slice(0, 84)}...` : snippet
}

function buildCandidateMeta(block) {
  return ['domain', 'format', 'project']
    .flatMap((dimension) => (block.dimensions?.[dimension] ?? []).map((value) => ({ dimension, value })))
    .slice(0, 3)
}

function getPhantomTextblocks(editor) {
  const { doc, selection } = editor.state
  const textblocks = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return

    const text = node.textContent ?? ''
    const trimmed = text.trim()
    if (!trimmed) return

    textblocks.push({
      text,
      trimmed,
      start: pos + 1,
      end: pos + node.nodeSize - 1,
      after: pos + node.nodeSize,
      isCurrent: selection.from >= pos && selection.from <= pos + node.nodeSize,
    })
  })

  return textblocks
}

function getPhantomTextblockContext(editor) {
  const { selection } = editor.state
  const textblocks = getPhantomTextblocks(editor)

  if (textblocks.length === 0) return null

  const currentBlock = textblocks.find((item) => item.isCurrent && item.trimmed.length > 0)
  if (currentBlock) {
    return {
      paragraphText: currentBlock.text,
      paragraphStart: currentBlock.start,
      paragraphAfter: currentBlock.after,
      cursorOffset: clamp(selection.from - currentBlock.start, 0, currentBlock.text.length),
      contextParagraph: currentBlock.trimmed,
    }
  }

  const previousBlock = [...textblocks]
    .filter((item) => item.end < selection.from)
    .at(-1)

  if (!previousBlock) return null

  return {
    paragraphText: previousBlock.text,
    paragraphStart: previousBlock.start,
    paragraphAfter: previousBlock.after,
    cursorOffset: previousBlock.text.length,
    contextParagraph: previousBlock.trimmed,
  }
}

function findPhantomCues(editor, lexicon, currentDocumentKey, activePoolContext) {
  if (!editor || !lexicon?.entries.length) return []

  const textblockContext = getPhantomTextblockContext(editor)
  if (!textblockContext) return []

  return findLexiconMatches({
    activePoolContext,
    contextParagraph: textblockContext.contextParagraph,
    currentDocumentKey,
    cursorOffset: textblockContext.cursorOffset,
    lexicon,
    paragraphAfter: textblockContext.paragraphAfter,
    paragraphStart: textblockContext.paragraphStart,
    paragraphText: textblockContext.paragraphText,
  })
}

function cueListsAreEqual(left = [], right = []) {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((cue, index) => {
    const candidate = right[index]
    return (
      cue.blockId === candidate?.blockId &&
      cue.from === candidate?.from &&
      cue.to === candidate?.to &&
      cue.matchText === candidate?.matchText &&
      cue.reasonType === candidate?.reasonType &&
      cue.paragraphAfter === candidate?.paragraphAfter
    )
  })
}

function resolveCueElementFromTarget(target) {
  if (!target) return null

  if (target instanceof Element) {
    return target.closest('[data-phantom-weave="true"]')
  }

  if (target instanceof Node) {
    return target.parentElement?.closest('[data-phantom-weave="true"]') ?? null
  }

  return null
}

function ToolbarButton({ icon: Icon, label, isActive, action }) {
  const iconElement = Icon ? <Icon size={16} /> : null

  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        action()
      }}
      title={label}
      className={`cursor-pointer rounded-lg p-2 transition-all ${
        isActive
          ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
          : 'text-zinc-400 hover:bg-white hover:text-zinc-700 hover:shadow-sm'
      }`}
    >
      {iconElement}
    </button>
  )
}

export function EditorToolbar({ editor }) {
  const [, setRenderTick] = useState(0)

  useEffect(() => {
    if (!editor) return undefined

    const rerender = () => setRenderTick((value) => value + 1)
    editor.on('selectionUpdate', rerender)
    editor.on('transaction', rerender)
    editor.on('focus', rerender)
    editor.on('blur', rerender)

    return () => {
      editor.off('selectionUpdate', rerender)
      editor.off('transaction', rerender)
      editor.off('focus', rerender)
      editor.off('blur', rerender)
    }
  }, [editor])

  if (!editor) return null

  const toolbarGroups = [
    [
      {
        label: 'H1',
        icon: Heading1,
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive('heading', { level: 1 }),
      },
      {
        label: 'H2',
        icon: Heading2,
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive('heading', { level: 2 }),
      },
      {
        label: 'H3',
        icon: Heading3,
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.isActive('heading', { level: 3 }),
      },
    ],
    [
      {
        label: 'Bold',
        icon: Bold,
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        label: 'Italic',
        icon: Italic,
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        label: 'Underline',
        icon: UnderlineIcon,
        action: () => editor.chain().focus().toggleUnderline().run(),
        isActive: () => editor.isActive('underline'),
      },
      {
        label: 'Highlight',
        icon: Highlighter,
        action: () => editor.chain().focus().toggleHighlight().run(),
        isActive: () => editor.isActive('highlight'),
      },
    ],
    [
      {
        label: 'BulletList',
        icon: List,
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        label: 'OrderedList',
        icon: ListOrdered,
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
      {
        label: 'TaskList',
        icon: ListTodo,
        action: () => editor.chain().focus().toggleTaskList().run(),
        isActive: () => editor.isActive('taskList'),
      },
    ],
    [
      {
        label: 'CodeBlock',
        icon: Code2,
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock'),
      },
      {
        label: 'Blockquote',
        icon: Quote,
        action: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote'),
      },
    ],
  ]

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      {toolbarGroups.map((group, groupIndex) => (
        <div
          key={`group-${groupIndex}`}
          className="flex items-center gap-1 rounded-xl bg-zinc-100/80 px-1.5 py-1"
        >
          {group.map((button) => (
            <ToolbarButton
              key={button.label}
              icon={button.icon}
              label={button.label}
              isActive={button.isActive()}
              action={button.action}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MentionList({ items, command, selectedIndex }) {
  if (items.length === 0) {
    return (
      <div className="w-80 rounded-3xl border border-zinc-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div className="text-sm text-zinc-500">{copy.empty}</div>
      </div>
    )
  }

  return (
    <div className="w-[22rem] rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="mb-2 flex items-center gap-2 px-2 py-2 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
        <Command className="h-3.5 w-3.5" />
        Block Search
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => command(item)}
            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
              index === selectedIndex
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-transparent bg-white hover:border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900">{item.title}</div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                  {contentToPlainText(item.content)}
                </div>
              </div>
              <div className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                {item.id}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function createMentionSuggestion(blocks) {
  let selectedIndex = 0

  return {
    items: ({ query }) => {
      const normalizedQuery = query.trim().toLowerCase()

      return blocks
        .filter((block) => {
          if (!normalizedQuery) return true

          return [block.title, contentToPlainText(block.content), ...Object.values(block.dimensions).flat()]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        })
        .slice(0, 6)
    },

    render: () => {
      let component
      let popup

      const updateProps = (props) => {
        component.updateProps({
          ...props,
          selectedIndex,
          command: (item) => props.command(item),
        })
      }

      return {
        onStart: (props) => {
          selectedIndex = 0
          component = new ReactRenderer(MentionList, {
            props: {
              ...props,
              selectedIndex,
              command: (item) => props.command(item),
            },
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            offset: [0, 10],
            showOnCreate: true,
          })
        },

        onUpdate(props) {
          selectedIndex = 0
          updateProps(props)

          if (!props.clientRect || !popup?.[0]) return
          popup[0].setProps({ getReferenceClientRect: props.clientRect })
        },

        onKeyDown(props) {
          const items = props.items ?? []
          if (items.length === 0) return false

          if (props.event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex + items.length - 1) % items.length
            updateProps(props)
            return true
          }

          if (props.event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % items.length
            updateProps(props)
            return true
          }

          if (props.event.key === 'Enter') {
            props.command(items[selectedIndex])
            return true
          }

          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return false
        },

        onExit() {
          popup?.[0]?.destroy()
          component.destroy()
        },
      }
    },
  }
}

function buildAdaptiveLensPayload(block, contextParagraph) {
  return {
    type: 'adaptiveLens',
    attrs: {
      blockId: block.id,
      title: block.title,
      content: contentToPlainText(block.content),
      summary: '',
      userIntent: '',
      contextParagraph,
      requestState: 'draft',
      tone: 'info',
    },
  }
}

function insertAdaptiveLens(editor, range, block, contextParagraphOverride) {
  const rawParagraph = editor.state.selection.$from.parent.textContent
  const contextParagraph = contextParagraphOverride ?? rawParagraph.replace(/@[^\s]*$/, '').trim()

  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      buildAdaptiveLensPayload(block, contextParagraph),
      {
        type: 'paragraph',
      },
    ])
    .run()
}

export function FluxEditor({ documentKey = 'new', initialContent = '', onChange, onEditorReady }) {
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const recordPoolEvent = useFluxStore((state) => state.recordPoolEvent)
  const recordAssimilationRevision = useFluxStore((state) => state.recordAssimilationRevision)
  const recentAssimilationRevisions = useFluxStore((state) => state.recentAssimilationRevisions)
  const rollbackAssimilationRevision = useFluxStore((state) => state.rollbackAssimilationRevision)
  const setPeekBlockId = useFluxStore((state) => state.setPeekBlockId)
  const updateBlock = useFluxStore((state) => state.updateBlock)
  const mentionSuggestion = useMemo(() => createMentionSuggestion(fluxBlocks), [fluxBlocks])
  const phantomSourceBlocks = useMemo(
    () =>
      fluxBlocks
        .map((block) => ({
          ...block,
          title: block.title?.trim() ?? '',
        })),
    [fluxBlocks],
  )
  const phantomLexicon = useMemo(() => buildPhantomLexicon(phantomSourceBlocks), [phantomSourceBlocks])
  const blocksById = useMemo(
    () => new Map(fluxBlocks.map((block) => [block.id, block])),
    [fluxBlocks],
  )
  const editorShellRef = useRef(null)
  const tooltipRef = useRef(null)
  const activePoolContextRef = useRef(activePoolContext)
  const phantomLexiconRef = useRef(phantomLexicon)
  const hoverHideTimeoutRef = useRef(null)
  const assimilationBadgeTimeoutRef = useRef(null)
  const [hoveredCue, setHoveredCue] = useState(null)
  const [assimilationState, setAssimilationState] = useState({
    blockId: null,
    status: 'idle',
    message: '',
  })
  const [assimilationBadge, setAssimilationBadge] = useState(null)
  const [assimilationPreview, setAssimilationPreview] = useState(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Underline,
      Placeholder.configure({
        placeholder: '\u5199\u4e0b\u8fd9\u4e2a\u77e5\u8bc6\u5757\u7684\u6b63\u6587\uff0c\u8f93\u5165 @ \u53ef\u4ee5\u5f15\u7528\u5176\u4ed6 Block\u3002',
      }),
      AdaptiveLensNode,
      PhantomWeavingExtension,
      Mention.configure({
        HTMLAttributes: { class: 'hidden' },
        suggestion: {
          ...mentionSuggestion,
          char: '@',
          command: ({ editor, range, props }) => insertAdaptiveLens(editor, range, props),
        },
      }),
    ],
    content: normalizeEditorContent(initialContent),
    onUpdate: ({ editor }) => {
      onChange?.({
        html: editor.getHTML(),
        text: editor.getText(),
      })
    },
    editorProps: {
      attributes: {
        class: 'tiptap min-h-[420px] max-w-none px-1 py-2',
      },
    },
  })

  const hoveredBlock = hoveredCue ? blocksById.get(hoveredCue.blockId) ?? null : null
  const hoveredMeta = hoveredBlock ? buildCandidateMeta(hoveredBlock) : []
  const isAssimilatingCurrent = assimilationState.status === 'pending' && assimilationState.blockId === hoveredBlock?.id
  const latestAssimilationRevision = useMemo(() => {
    const badgeRevisionId = assimilationBadge?.revisionId
    if (badgeRevisionId) {
      return recentAssimilationRevisions.find((revision) => revision.id === badgeRevisionId) ?? null
    }

    return recentAssimilationRevisions[0] ?? null
  }, [assimilationBadge?.revisionId, recentAssimilationRevisions])

  useEffect(() => {
    activePoolContextRef.current = activePoolContext
  }, [activePoolContext])

  useEffect(() => {
    phantomLexiconRef.current = phantomLexicon
  }, [phantomLexicon])

  const scheduleHideCue = () => {
    window.clearTimeout(hoverHideTimeoutRef.current)
    hoverHideTimeoutRef.current = window.setTimeout(() => {
      setHoveredCue(null)
    }, 120)
  }

  const readCueElement = (element) => {
    if (!element) return null

    const blockId = element.dataset.phantomBlockId
    const paragraphAfter = Number(element.dataset.phantomParagraphAfter)
    if (!blockId || Number.isNaN(paragraphAfter)) return null

    return {
      anchorEl: element,
      blockId,
      blockTitle: element.dataset.phantomBlockTitle ?? '',
      matchText: element.dataset.phantomMatchText ?? '',
      paragraphAfter,
      contextParagraph: element.dataset.phantomContext ?? '',
      reasonLabel: element.dataset.phantomReasonLabel ?? '',
      reasonType: element.dataset.phantomReasonType ?? '',
      score: Number(element.dataset.phantomScore ?? 0),
      rect: element.getBoundingClientRect(),
    }
  }

  useEffect(() => {
    if (!editor) return undefined

    let debounceId = 0
    let idleId = 0

    const dispatchCues = () => {
      const nextCues = findPhantomCues(
        editor,
        phantomLexiconRef.current,
        documentKey,
        activePoolContextRef.current,
      )
      const currentCues = phantomWeavingPluginKey.getState(editor.state)?.cues ?? []

      if (cueListsAreEqual(currentCues, nextCues)) return

      editor.view.dispatch(editor.state.tr.setMeta(phantomWeavingPluginKey, { cues: nextCues }))
    }

    const scheduleIdleDispatch = () => {
      if (typeof window === 'undefined') return

      if (typeof window.cancelIdleCallback === 'function' && idleId) {
        window.cancelIdleCallback(idleId)
      }

      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => {
          dispatchCues()
        }, { timeout: 1200 })
        return
      }

      idleId = window.setTimeout(() => {
        dispatchCues()
      }, 0)
    }

    const scheduleCueUpdate = () => {
      window.clearTimeout(debounceId)
      if (typeof window.cancelIdleCallback === 'function' && idleId) {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }

      const currentParagraph = getPhantomTextblockContext(editor)?.paragraphText ?? ''
      let hasImmediateMatch = false
      if (currentParagraph && phantomLexiconRef.current.regex) {
        phantomLexiconRef.current.regex.lastIndex = 0
        hasImmediateMatch = phantomLexiconRef.current.regex.test(currentParagraph)
      }

      if (hasImmediateMatch) {
        dispatchCues()
        return
      }

      const delay = 1200
      debounceId = window.setTimeout(scheduleIdleDispatch, delay)
    }

    scheduleCueUpdate()
    editor.on('update', scheduleCueUpdate)
    editor.on('selectionUpdate', scheduleCueUpdate)

    return () => {
      window.clearTimeout(debounceId)
      if (typeof window.cancelIdleCallback === 'function' && idleId) {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
      editor.off('update', scheduleCueUpdate)
      editor.off('selectionUpdate', scheduleCueUpdate)
    }
  }, [documentKey, editor, phantomLexicon.signature])

  useEffect(() => {
    if (!editor) return
    onEditorReady?.(editor)
    return () => {
      onEditorReady?.(null)
    }
  }, [editor, onEditorReady])

  useEffect(() => {
    if (!editor) return

    const normalized = normalizeEditorContent(initialContent)
    editor.commands.setContent(normalized, false)
    editor.view.dispatch(editor.state.tr.setMeta(phantomWeavingPluginKey, { cues: [] }))
    setHoveredCue(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey, editor])

  useEffect(
    () => () => {
      window.clearTimeout(hoverHideTimeoutRef.current)
      window.clearTimeout(assimilationBadgeTimeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    const shell = editorShellRef.current
    if (!shell) return undefined

    const handlePointerOver = (event) => {
      const cueElement = resolveCueElementFromTarget(event.target)

      if (!cueElement) return

      window.clearTimeout(hoverHideTimeoutRef.current)
      const nextCue = readCueElement(cueElement)
      if (nextCue) {
        setHoveredCue(nextCue)
      }
    }

    const handlePointerOut = (event) => {
      const cueElement = resolveCueElementFromTarget(event.target)

      if (!cueElement) return

      const nextTarget = event.relatedTarget
      const nextCueElement = resolveCueElementFromTarget(nextTarget)
      if (nextCueElement && nextCueElement === cueElement) return
      if (nextTarget instanceof Node && tooltipRef.current?.contains(nextTarget)) return
      scheduleHideCue()
    }

    const handleClick = (event) => {
      const cueElement = resolveCueElementFromTarget(event.target)
      if (!cueElement) return

      event.preventDefault()
      event.stopPropagation()
      window.clearTimeout(hoverHideTimeoutRef.current)

      const nextCue = readCueElement(cueElement)
      if (nextCue) {
        setHoveredCue(nextCue)
      }
    }

    shell.addEventListener('mouseover', handlePointerOver)
    shell.addEventListener('mouseout', handlePointerOut)
    shell.addEventListener('click', handleClick, true)

    return () => {
      shell.removeEventListener('mouseover', handlePointerOver)
      shell.removeEventListener('mouseout', handlePointerOut)
      shell.removeEventListener('click', handleClick, true)
    }
  }, [])

  useEffect(() => {
    if (!hoveredCue?.anchorEl) return undefined

    const syncRect = () => {
      if (!hoveredCue.anchorEl.isConnected) {
        setHoveredCue(null)
        return
      }

      setHoveredCue((current) => {
        if (!current?.anchorEl || current.anchorEl !== hoveredCue.anchorEl) return current
        return {
          ...current,
          rect: hoveredCue.anchorEl.getBoundingClientRect(),
        }
      })
    }

    window.addEventListener('scroll', syncRect, true)
    window.addEventListener('resize', syncRect)

    return () => {
      window.removeEventListener('scroll', syncRect, true)
      window.removeEventListener('resize', syncRect)
    }
  }, [hoveredCue?.anchorEl])

  const handleExtractLens = () => {
    if (!editor || !hoveredCue || !hoveredBlock) return

    window.clearTimeout(hoverHideTimeoutRef.current)
    insertAdaptiveLens(editor, hoveredCue.paragraphAfter, hoveredBlock, hoveredCue.contextParagraph)
    setHoveredCue(null)
    editor.commands.focus()
  }

  const handleAssimilate = async () => {
    if (!editor || !hoveredCue || !hoveredBlock) return

    const aiConfig = readAiConfig()
    if (!aiConfig.apiKey?.trim()) {
      setAssimilationState({
        blockId: hoveredBlock.id,
        status: 'error',
        message: '请先在设置中配置 API Key。',
      })
      return
    }

    const macroContext = editor.getText().slice(0, 2000).trim()
    const newContent = hoveredCue.contextParagraph?.trim()

    if (!newContent) {
      setAssimilationState({
        blockId: hoveredBlock.id,
        status: 'error',
        message: '当前段落还没有足够的新内容可供同化。',
      })
      return
    }

    setAssimilationState({
      blockId: hoveredBlock.id,
      status: 'pending',
      message: '',
    })

    try {
      const response = await fetch(resolveChatCompletionsUrl(aiConfig.baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.model || 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                '你是一位严谨的知识库架构师。请阅读【母体原文】，再分析【用户新段落】里的新增洞察。你的任务不是简单追加，而是把这些新增知识自然编织进母体原文的合适位置，必要时可补一个极简小标题。必须保留原有内容的核心信息和整体结构，不要写解释说明，不要输出分析过程。最终只返回融合后的正文内容本身。如果原文是 HTML 片段，就返回合法 HTML 片段；如果原文是普通文本，也返回适合直接渲染的正文内容。',
            },
            {
              role: 'user',
              content: `【当前文章的宏观语境】：\n${
                macroContext || '暂无内容'
              }\n\n【用户刚写下的新段落】：\n${newContent}\n\n【需要被更新的目标母体标题】：\n${
                hoveredBlock.title
              }\n\n【母体原文】：\n${hoveredBlock.content || '暂无内容'}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const rawText = payload?.choices?.[0]?.message?.content ?? ''
      const nextContent = normalizeEditorContent(extractAssimilationContent(rawText))

      if (!nextContent.trim()) {
        throw new Error('模型没有返回可用内容')
      }
      setAssimilationPreview({
        afterContent: nextContent,
        beforeContent: hoveredBlock.content || '',
        blockId: hoveredBlock.id,
        contextParagraph: newContent,
        rect: hoveredCue.anchorEl?.getBoundingClientRect?.() ?? hoveredCue.rect,
        title: hoveredBlock.title,
      })
      setAssimilationState({
        blockId: hoveredBlock.id,
        status: 'preview',
        message: '已生成同化预览，请确认后应用。',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      setAssimilationState({
        blockId: hoveredBlock.id,
        status: 'error',
        message: `同化失败：${message}`,
      })
    }
  }

  const handleCancelAssimilationPreview = () => {
    setAssimilationPreview(null)
    setAssimilationState({
      blockId: null,
      status: 'idle',
      message: '',
    })
  }

  const handleApplyAssimilationPreview = () => {
    if (!assimilationPreview) return

    const revisionId = `assimilation_revision_${Date.now()}`
    updateBlock(assimilationPreview.blockId, (old) => ({
      content: assimilationPreview.afterContent,
      updatedAt: new Date().toISOString().slice(0, 10),
      dimensions: old.dimensions,
    }))
    recordAssimilationRevision({
      id: revisionId,
      afterContent: assimilationPreview.afterContent,
      beforeContent: assimilationPreview.beforeContent,
      blockId: assimilationPreview.blockId,
      blockTitle: assimilationPreview.title,
      contextParagraph: assimilationPreview.contextParagraph,
      poolContextKey: activePoolContext?.key ?? null,
      poolId: activePoolContext?.poolId ?? null,
      poolName: activePoolContext?.name ?? null,
    })

    setAssimilationState({
      blockId: assimilationPreview.blockId,
      status: 'success',
      message: '已确认并收录到相关母体。',
    })
    setAssimilationBadge({
      blockId: assimilationPreview.blockId,
      message: '已收录至相关母体',
      rect: assimilationPreview.rect,
      revisionId,
      title: assimilationPreview.title,
    })

    if (activePoolContext?.key) {
      recordPoolEvent({
        blockId: assimilationPreview.blockId,
        blockTitle: assimilationPreview.title,
        message: '已收录至相关母体',
        poolContextKey: activePoolContext.key,
        poolId: activePoolContext.poolId,
        poolName: activePoolContext.name,
        type: 'assimilation',
      })
    }

    window.clearTimeout(assimilationBadgeTimeoutRef.current)
    assimilationBadgeTimeoutRef.current = window.setTimeout(() => {
      setAssimilationBadge(null)
    }, 5000)
    setPeekBlockId(assimilationPreview.blockId)
    setAssimilationPreview(null)
  }

  const handleRollbackAssimilation = (revision) => {
    if (!revision || revision.rolledBackAt) return

    rollbackAssimilationRevision(revision.id)
    setAssimilationState({
      blockId: revision.blockId,
      status: 'success',
      message: '已撤销最近一次同化。',
    })
    setAssimilationBadge({
      blockId: revision.blockId,
      message: '已撤销最近一次同化',
      rect: assimilationBadge?.rect ?? null,
      revisionId: revision.id,
      title: revision.blockTitle,
    })

    if (revision.poolContextKey) {
      recordPoolEvent({
        blockId: revision.blockId,
        blockTitle: revision.blockTitle,
        message: '已撤销最近一次同化',
        poolContextKey: revision.poolContextKey,
        poolId: revision.poolId,
        poolName: revision.poolName,
        type: 'rollback',
      })
    }

    window.clearTimeout(assimilationBadgeTimeoutRef.current)
    assimilationBadgeTimeoutRef.current = window.setTimeout(() => {
      setAssimilationBadge(null)
    }, 5000)
  }

  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
  const tooltipLeft = hoveredCue?.rect ? clamp(hoveredCue.rect.left, 16, viewportWidth - 368) : 0
  const tooltipTop = hoveredCue?.rect ? hoveredCue.rect.bottom + 12 : 0
  const assimilationBadgeLeft = assimilationBadge?.rect
    ? clamp(assimilationBadge.rect.left, 16, viewportWidth - 240)
    : 0
  const assimilationBadgeTop = assimilationBadge?.rect
    ? clamp(assimilationBadge.rect.bottom + 10, 16, viewportHeight - 80)
    : 0
  const floatingOverlays = typeof document === 'undefined'
    ? null
    : createPortal(
        <>
          <AnimatePresence>
            {assimilationPreview ? (
              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-zinc-900/20 backdrop-blur-sm"
              >
                <MotionDiv
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="absolute left-1/2 top-1/2 flex max-h-[86vh] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
                >
                  <div className="border-b border-zinc-100 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Assimilation Preview</div>
                        <h3 className="mt-1 text-xl font-semibold text-zinc-950">{assimilationPreview.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          先核对这次同化会如何改写母体，再决定是否应用。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelAssimilationPreview}
                        className="rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                      >
                        取消
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <AssimilationDiffPanel
                        beforeContent={assimilationPreview.beforeContent}
                        afterContent={assimilationPreview.afterContent}
                        beforeLabel="当前母体"
                        afterLabel="拟应用后"
                        className="md:col-span-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
                    <div className="text-xs text-zinc-400">应用后仍可一键撤销最近一次同化。</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelAssimilationPreview}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                      >
                        暂不应用
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAssimilationPreview}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        确认同化
                      </button>
                    </div>
                  </div>
                </MotionDiv>
              </MotionDiv>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {hoveredCue && hoveredBlock ? (
              <MotionDiv
                ref={tooltipRef}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                onMouseEnter={() => window.clearTimeout(hoverHideTimeoutRef.current)}
                onMouseLeave={scheduleHideCue}
                className="fixed z-50 w-80 rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                style={{ left: tooltipLeft, top: tooltipTop }}
              >
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>幽灵回声</span>
                      </div>
                      <h4 className="truncate text-base font-bold text-zinc-900">{hoveredBlock.title}</h4>
                    </div>
                    <span className="shrink-0 rounded-md border border-amber-200/50 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      {`${hoveredCue.reasonLabel || '命中'}: ${hoveredCue.matchText}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {activePoolContext ? (
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                        {activePoolContext.name}
                      </span>
                    ) : null}
                    {hoveredMeta.map((tag) => (
                      <span
                        key={`${hoveredBlock.id}-${tag.dimension}-${tag.value}`}
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${dimensionStyles[tag.dimension]}`}
                      >
                        {tag.value}
                      </span>
                    ))}
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">
                    {buildCandidateSnippet(hoveredBlock)}
                  </p>

                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.preventDefault()
                        handleExtractLens()
                      }}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-100/50 bg-indigo-50 px-1 py-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                    >
                      <Wand2 size={16} />
                      <span className="text-[11px] font-medium">提取为透镜</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.preventDefault()
                        void handleAssimilate()
                      }}
                      disabled={isAssimilatingCurrent}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors ${
                        isAssimilatingCurrent
                          ? 'cursor-wait border-emerald-100/50 bg-emerald-50 text-emerald-600'
                          : 'border-emerald-100/50 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {isAssimilatingCurrent ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Dna size={16} />
                      )}
                      <span className="text-[11px] font-medium">{isAssimilatingCurrent ? '同化中' : '同化新知'}</span>
                    </button>
                  </div>

                  {assimilationState.blockId === hoveredBlock.id && assimilationState.status !== 'idle' ? (
                    <div
                      className={`text-[11px] ${
                        assimilationState.status === 'error'
                          ? 'text-rose-500'
                          : assimilationState.status === 'preview'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {assimilationState.message}
                    </div>
                  ) : null}

                  <div
                    onClick={() => {
                      setPeekBlockId(hoveredBlock.id)
                      setHoveredCue(null)
                    }}
                    className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-400 transition-colors hover:text-zinc-700"
                  >
                    <PanelRightOpen size={14} />
                    <span>在侧边抽屉全面预览</span>
                  </div>
                </div>
              </MotionDiv>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {assimilationBadge ? (
              <MotionDiv
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="fixed z-[65] flex items-center gap-2"
                style={{ left: assimilationBadgeLeft, top: assimilationBadgeTop }}
              >
                <MotionButton
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setPeekBlockId(assimilationBadge.blockId)
                    setAssimilationBadge(null)
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.08)] backdrop-blur-xl transition hover:border-emerald-200 hover:bg-emerald-50/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{assimilationBadge.message}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </MotionButton>

                {latestAssimilationRevision && !latestAssimilationRevision.rolledBackAt ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleRollbackAssimilation(latestAssimilationRevision)}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200/90 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-zinc-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>撤销</span>
                  </button>
                ) : null}
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </>,
        document.body,
      )

  return (
    <>
      <section
        ref={editorShellRef}
        className="overflow-hidden rounded-[32px] border border-zinc-200/70 bg-white/55 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm"
      >
        <div className="px-6 py-5">
          <EditorContent editor={editor} />
        </div>
      </section>
      {floatingOverlays}
    </>
  )
}
