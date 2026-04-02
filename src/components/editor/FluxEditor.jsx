import { useEffect, useMemo, useState } from 'react'
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react'
import Highlight from '@tiptap/extension-highlight'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Underline from '@tiptap/extension-underline'
import tippy from 'tippy.js'
import {
  Bold,
  Code2,
  Command,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useFluxStore } from '../../store/useFluxStore'
import { contentToPlainText } from '../../utils/blocks'
import { AdaptiveLensNode } from './extensions/AdaptiveLensNode'

const copy = {
  empty: '没有匹配的知识块',
  mentionTitle: '引用搜索',
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

function buildAdaptiveLensExcerpt(block) {
  const snippet = contentToPlainText(block.content)
  if (!snippet) return ''
  return snippet.length > 50 ? `${snippet.slice(0, 50)}...` : snippet
}

function buildAdaptiveLensPayload(block) {
  return {
    type: 'adaptiveLens',
    attrs: {
      blockId: block.id,
      title: block.title,
      content: contentToPlainText(block.content),
      excerpt: buildAdaptiveLensExcerpt(block),
    },
  }
}

function insertAdaptiveLens(editor, range, block) {
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      buildAdaptiveLensPayload(block),
      {
        type: 'paragraph',
      },
    ])
    .run()
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
        label: '加粗',
        icon: Bold,
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        label: '斜体',
        icon: Italic,
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        label: '下划线',
        icon: UnderlineIcon,
        action: () => editor.chain().focus().toggleUnderline().run(),
        isActive: () => editor.isActive('underline'),
      },
      {
        label: '高亮',
        icon: Highlighter,
        action: () => editor.chain().focus().toggleHighlight().run(),
        isActive: () => editor.isActive('highlight'),
      },
    ],
    [
      {
        label: '无序列表',
        icon: List,
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        label: '有序列表',
        icon: ListOrdered,
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
      {
        label: '任务列表',
        icon: ListTodo,
        action: () => editor.chain().focus().toggleTaskList().run(),
        isActive: () => editor.isActive('taskList'),
      },
    ],
    [
      {
        label: '代码块',
        icon: Code2,
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock'),
      },
      {
        label: '引用块',
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
        {copy.mentionTitle}
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

export function FluxEditor({ initialContent = '', onChange, onEditorReady }) {
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const mentionSuggestion = useMemo(() => createMentionSuggestion(fluxBlocks), [fluxBlocks])

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
        placeholder: '写下这条笔记的正文，输入 @ 可以引用其他知识块。',
      }),
      AdaptiveLensNode,
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
    if (editor.getHTML() === normalized) return

    editor.commands.setContent(normalized, false)
  }, [editor, initialContent])

  return (
    <section className="overflow-hidden rounded-[32px] border border-zinc-200/70 bg-white/55 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm">
      <div className="px-6 py-5">
        <EditorContent editor={editor} />
      </div>
    </section>
  )
}
