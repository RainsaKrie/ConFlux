import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import { Binary, Bot, Compass, FileSearch, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/I18nProvider'
import { useFluxStore } from '../../store/useFluxStore'
import { contentToPlainText } from '../../utils/blocks'
import { displayDimensionValue } from '../../utils/displayTag'

const MotionDiv = motion.div

function buildSnippet(block, t, language) {
  const domainLabel = block.dimensions?.domain?.[0]
  if (domainLabel) return `[${displayDimensionValue('domain', domainLabel, language)}]`

  const plainText = contentToPlainText(block.content)
  if (!plainText) return t('feed.emptyPreview')

  return plainText.length > 28 ? `${plainText.slice(0, 28)}...` : plainText
}

export function CommandDeck({ isOpen, onOpenChange }) {
  const { language, t } = useTranslation()
  const navigate = useNavigate()
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const [query, setQuery] = useState('')

  const actions = useMemo(
    () => [
      {
        id: 'go-feed',
        label: t('command.quickCapture'),
        description: t('command.goFeed'),
        icon: Compass,
        run: (targetNavigate) => targetNavigate('/feed'),
      },
      {
        id: 'go-write',
        label: t('command.newNote'),
        description: t('command.goWrite'),
        icon: Bot,
        run: (targetNavigate) => targetNavigate('/write'),
      },
      {
        id: 'go-graph',
        label: t('command.openGraph'),
        description: t('command.goGraph'),
        icon: Binary,
        run: (targetNavigate) => targetNavigate('/graph'),
      },
    ],
    [t],
  )

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(!isOpen)
        return
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onOpenChange])

  const knowledgeResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const sortedBlocks = [...fluxBlocks].sort((left, right) => {
      return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
    })

    if (!normalizedQuery) {
      return sortedBlocks.slice(0, 8)
    }

    return sortedBlocks.filter((block) => {
      const haystack = [block.title, contentToPlainText(block.content)].join(' ').toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [fluxBlocks, query])

  const runAndClose = (handler) => {
    setQuery('')
    onOpenChange(false)
    handler()
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <div className="flex min-h-full items-start justify-center px-4 pt-[14vh]">
            <MotionDiv
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200/50 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <Command
                shouldFilter={false}
                label={t('command.title')}
                className="max-h-[70vh] overflow-hidden"
              >
                <div className="border-b border-zinc-100">
                  <Command.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder={t('command.placeholder')}
                    className="w-full px-6 py-4 text-lg text-zinc-900 outline-none placeholder:text-zinc-300"
                  />
                </div>

                <Command.List className="max-h-[56vh] overflow-y-auto px-3 py-3">
                  <Command.Group className="mb-4">
                    <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                      {t('command.actions')}
                    </div>
                    <div className="space-y-1">
                      {actions.map((action) => {
                        const Icon = action.icon
                        const iconElement = Icon ? <Icon className="h-4 w-4 text-zinc-400" /> : null
                        return (
                          <Command.Item
                            key={action.id}
                            value={`${action.label} ${action.description}`}
                            onSelect={() => runAndClose(() => action.run(navigate))}
                            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-700 outline-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900"
                          >
                            {iconElement}
                            <span className="flex-1">{`→ ${action.label}`}</span>
                            <span className="text-xs text-zinc-400">{action.description}</span>
                          </Command.Item>
                        )
                      })}
                    </div>
                  </Command.Group>

                  <Command.Group>
                    <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                      {t('command.notes')}
                    </div>
                    {knowledgeResults.length > 0 ? (
                      <div className="space-y-1">
                        {knowledgeResults.map((block) => (
                          <Command.Item
                            key={block.id}
                            value={`${block.title} ${contentToPlainText(block.content)}`}
                            onSelect={() => runAndClose(() => navigate(`/write?id=${block.id}`))}
                            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-700 outline-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900"
                          >
                            <Search className="h-4 w-4 shrink-0 text-zinc-300" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-zinc-900">{block.title || t('common.untitledNote')}</div>
                            </div>
                            <div className="max-w-[220px] truncate text-xs text-zinc-400">{buildSnippet(block, t, language)}</div>
                          </Command.Item>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl px-3 py-6 text-sm text-zinc-400">
                        <FileSearch className="h-4 w-4" />
                        <span>{t('command.noResults')}</span>
                      </div>
                    )}
                  </Command.Group>
                </Command.List>
              </Command>
            </MotionDiv>
          </div>
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  )
}
