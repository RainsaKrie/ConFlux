import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef } from 'react'
import { Binary, Bot, CircleDot, Command, Compass, Settings, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { OutlinerPanel } from '../components/editor/OutlinerPanel'
import { MetadataOverviewPanel } from '../components/sidebar/MetadataOverviewPanel'
import { RecentAiTasksPanel } from '../components/sidebar/RecentAiTasksPanel'
import { WindowTitlebar } from '../components/layout/WindowTitlebar'
import {
  cleanupOrphanedNativeMediaFiles,
  ensureMediaDirectory,
  isTauriRuntime,
} from '../features/media/localMediaService'
import { buildPoolContext, buildPoolContextKey, encodePoolFilters, poolFiltersToTokens } from '../features/pools/utils'
import {
  getInitialRuntimeDiagnostics,
  getRuntimeDiagnostics,
} from '../features/runtime/runtimeDiagnostics'
import { useTranslation } from '../i18n/I18nProvider'
import { flushPersistedStoreWrites, useFluxStore } from '../store/useFluxStore'
import { DEFAULT_AI_CONFIG, isAiConfigReady, readAiConfig, saveAiConfig } from '../utils/aiConfig'
import { displayDimensionValue } from '../utils/displayTag'

const MotionDiv = motion.div
const LazyCommandDeck = lazy(() =>
  import('../components/command/CommandDeck').then((module) => ({ default: module.CommandDeck })),
)

export function SidebarLayout() {
  const { language, setLanguage, t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [config, setConfig] = useState(() => readAiConfig() ?? DEFAULT_AI_CONFIG)
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState(() => getInitialRuntimeDiagnostics())
  const [sidebarOutliner, setSidebarOutliner] = useState(null)
  const hasSweptOrphanMediaRef = useRef(false)
  const fluxBlocks = useFluxStore((state) => state.fluxBlocks)
  const hasHydrated = useFluxStore((state) => state.hasHydrated)
  const savedPools = useFluxStore((state) => state.savedPools)
  const removePool = useFluxStore((state) => state.removePool)
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const clearActivePoolContext = useFluxStore((state) => state.clearActivePoolContext)
  const recentAiTasks = useFluxStore((state) => state.recentAiTasks)
  const removeDimensionValueFromAllBlocks = useFluxStore((state) => state.removeDimensionValueFromAllBlocks)
  const setActivePoolContext = useFluxStore((state) => state.setActivePoolContext)
  const activeFiltersToken = searchParams.get('filters')

  const activePoolId = useMemo(
    () =>
      savedPools.find((pool) => buildPoolContextKey(pool.filters) === activePoolContext?.key)?.id ??
      savedPools.find((pool) => encodePoolFilters(poolFiltersToTokens(pool.filters)) === activeFiltersToken)?.id ??
      null,
    [activeFiltersToken, activePoolContext?.key, savedPools],
  )

  const hasAiConfig = isAiConfigReady(config)
  const navItems = useMemo(
    () => [
      { to: '/feed', label: t('nav.feedLabel'), description: t('nav.feedDescription'), icon: Compass },
      { to: '/write', label: t('nav.writeLabel'), description: t('nav.writeDescription'), icon: Bot },
      { to: '/graph', label: t('nav.graphLabel'), description: t('nav.graphDescription'), icon: Binary },
    ],
    [t],
  )

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event.key || event.key === 'flux_ai_config') {
        setConfig(readAiConfig())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const syncRuntimeDiagnostics = async () => {
      const nextDiagnostics = await getRuntimeDiagnostics()
      if (!isCancelled) {
        setRuntimeDiagnostics(nextDiagnostics)
      }
    }

    void syncRuntimeDiagnostics()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isTauriRuntime) return undefined

    let isMounted = true

    ensureMediaDirectory().catch((error) => {
      if (!isMounted) return
      console.warn('Failed to initialize native media directory.', error)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isTauriRuntime || !hasHydrated || hasSweptOrphanMediaRef.current) return undefined

    hasSweptOrphanMediaRef.current = true
    const timeoutId = window.setTimeout(() => {
      const referencedHtmlList = fluxBlocks.map((block) => block.content ?? '')
      void cleanupOrphanedNativeMediaFiles(referencedHtmlList)
    }, 1200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [fluxBlocks, hasHydrated])

  useEffect(() => {
    if (!isTauriRuntime) return undefined

    const flushPendingWrites = () => {
      void flushPersistedStoreWrites()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingWrites()
      }
    }

    window.addEventListener('beforeunload', flushPendingWrites)
    window.addEventListener('pagehide', flushPendingWrites)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', flushPendingWrites)
      window.removeEventListener('pagehide', flushPendingWrites)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleConfigChange = (key, value) => {
    setConfig((current) => {
      const nextConfig = {
        ...current,
        [key]: value,
      }
      saveAiConfig(nextConfig)
      return nextConfig
    })
  }

  const handleOpenMetadataFilter = (dimension, value) => {
    const filters = { [dimension]: [value] }
    setActivePoolContext(
      buildPoolContext({
        name: `${t(`editor.tagDimension.${dimension}`)}：${displayDimensionValue(dimension, value, language)}`,
        filters,
        sourceView: 'sidebar',
      }),
    )
    navigate(`/feed?filters=${encodePoolFilters([{ dimension, value }])}`)
  }

  const handleRemoveMetadataValue = (dimension, value) => {
    const label = t(`editor.tagDimension.${dimension}`)
    const confirmed = window.confirm(
      `${t('common.remove')}${label}「${displayDimensionValue(dimension, value, language)}」？`,
    )
    if (!confirmed) return

    removeDimensionValueFromAllBlocks(dimension, value)
  }

  const runtimeLabel = runtimeDiagnostics.runtime === 'desktop'
    ? t('settings.runtimeDesktopLabel')
    : t('settings.runtimeWebLabel')
  const databaseLocation = runtimeDiagnostics.runtime === 'desktop'
    ? runtimeDiagnostics.persistence.locationValue
    : t('settings.webStorageValue')
  const mediaLocation = runtimeDiagnostics.runtime === 'desktop'
    ? runtimeDiagnostics.media.locationValue
    : t('settings.webMediaValue')

  const handleCopyValue = async (value) => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return

    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.warn('Failed to copy runtime diagnostic value.', error)
    }
  }

  return (
    <>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50 text-zinc-900">
        <WindowTitlebar />

        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-zinc-200/60 bg-white">
            <div className="flex-shrink-0 p-6 pb-2">
              <div className="flex items-center gap-3 rounded-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                  <CircleDot className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-['Space_Grotesk',_'Noto_Sans_SC',_sans-serif] text-lg font-semibold tracking-tight text-zinc-950">
                    Conflux
                  </div>
                  <div className="text-xs text-zinc-400">{t('nav.brandTagline')}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div>
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">{t('nav.navigation')}</div>
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `block rounded-2xl px-4 py-3 transition ${
                            isActive
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="mt-0.5 text-xs text-zinc-400">{item.description}</div>
                          </div>
                        </div>
                      </NavLink>
                    )
                  })}
                </nav>
              </div>

              {sidebarOutliner ? (
                <OutlinerPanel
                  activeId={sidebarOutliner.activeId}
                  collapsedIds={sidebarOutliner.collapsedIds}
                  emptyLabel={sidebarOutliner.emptyLabel}
                  items={sidebarOutliner.items}
                  onJump={sidebarOutliner.onJump}
                  onToggleCollapse={sidebarOutliner.onToggleCollapse}
                  title={sidebarOutliner.title}
                />
              ) : null}

              <div className="mt-8">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">{t('nav.smartViews')}</div>
                <div className="space-y-1.5">
                  {savedPools.map((pool) => {
                    const isActive = activePoolId === pool.id
                    const tokens = poolFiltersToTokens(pool.filters)
                    return (
                      <div
                        key={pool.id}
                        className={`group rounded-2xl px-4 py-3 transition ${
                          isActive
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePoolContext(
                                buildPoolContext({
                                  poolId: pool.id,
                                  name: pool.name,
                                  filters: pool.filters,
                                  sourceView: 'sidebar',
                                }),
                              )
                              navigate(`/feed?filters=${encodePoolFilters(tokens)}`)
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="text-sm font-medium">{pool.name}</div>
                            <div className="mt-1 text-xs text-zinc-400">
                              {tokens.map((token) => displayDimensionValue(token.dimension, token.value, language)).join(' / ')}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (activePoolContext?.poolId === pool.id) {
                                clearActivePoolContext()
                              }
                              removePool(pool.id)
                            }}
                            className="mt-0.5 rounded-full p-1 text-zinc-300 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-600 group-hover:opacity-100"
                            aria-label={t('nav.removeSmartView', { name: pool.name })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <MetadataOverviewPanel
                blocks={fluxBlocks}
                onOpenFilter={handleOpenMetadataFilter}
                onRemoveValue={handleRemoveMetadataValue}
              />

              <RecentAiTasksPanel
                tasks={recentAiTasks}
                onOpenBlock={(blockId) => navigate(`/write?id=${blockId}`)}
              />
            </div>

            <div className="flex-shrink-0 p-6 pb-6 pt-2">
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">{t('nav.globalSearch')}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-500">{t('nav.globalSearchHint')}</div>
                <button
                  type="button"
                  onClick={() => setIsCommandOpen(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-600 transition hover:bg-zinc-200"
                >
                  <Command className="h-3.5 w-3.5" />
                  Cmd/Ctrl + K
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="mt-3 inline-flex items-center gap-2 self-start rounded-full px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{t('nav.aiSettings')}</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="mt-2 inline-flex items-center gap-2 self-start rounded-full px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <Command className="h-3.5 w-3.5" />
                <span>{t('common.languageToggle')}</span>
              </button>
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {!hasAiConfig ? (
              <div className="mb-2 flex items-center justify-center gap-2 py-2 text-xs text-amber-600/60 bg-transparent">
                <span>{t('settings.missingApiBanner')}</span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="underline transition-colors cursor-pointer hover:text-amber-700"
                >
                  {t('settings.openButton')}
                </button>
              </div>
            ) : null}

            <div className="relative flex-1 overflow-y-auto p-6 md:p-8">
              <Outlet context={{ setSidebarOutliner }} />
            </div>
          </main>
        </div>
      </div>

      <Suspense fallback={null}>
        {isCommandOpen ? <LazyCommandDeck isOpen={isCommandOpen} onOpenChange={setIsCommandOpen} /> : null}
      </Suspense>

      <AnimatePresence>
        {isSettingsOpen ? (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <MotionDiv
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-6 pb-0">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{t('settings.title')}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{t('settings.description')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{t('settings.baseUrl')}</span>
                    <input
                      type="text"
                      placeholder="https://api.deepseek.com/v1"
                      value={config.baseURL}
                      onChange={(event) => handleConfigChange('baseURL', event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{t('settings.model')}</span>
                    <input
                      type="text"
                      placeholder="deepseek-chat"
                      value={config.model}
                      onChange={(event) => handleConfigChange('model', event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{t('settings.apiKey')}</span>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={config.apiKey}
                      onChange={(event) => handleConfigChange('apiKey', event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </label>
                </div>

                <div className="mt-8 border-t border-zinc-100 pt-5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                    {t('settings.dataStorageTitle')}
                  </div>

                  <div className="mt-3 text-xs text-zinc-500">
                    {t('settings.runtimeLabel')}: {runtimeLabel}
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-[11px] font-medium text-zinc-400">
                      {t('settings.databaseFileLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={databaseLocation}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyValue(databaseLocation)}
                        className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700"
                      >
                        {t('settings.copyButton')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-[11px] font-medium text-zinc-400">
                      {t('settings.mediaDirectoryLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={mediaLocation}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyValue(mediaLocation)}
                        className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700"
                      >
                        {t('settings.copyButton')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    saveAiConfig(config)
                    setIsSettingsOpen(false)
                  }}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  {t('settings.saveAndClose')}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  )
}
