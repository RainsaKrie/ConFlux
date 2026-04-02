import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Binary, Bot, CircleDot, Command, Compass, Settings, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { buildPoolContext, buildPoolContextKey, encodePoolFilters, poolFiltersToTokens } from '../features/pools/utils'
import { useFluxStore } from '../store/useFluxStore'
import { DEFAULT_AI_CONFIG, readAiConfig, saveAiConfig } from '../utils/aiConfig'

const MotionDiv = motion.div
const LazyCommandDeck = lazy(() =>
  import('../components/command/CommandDeck').then((module) => ({ default: module.CommandDeck })),
)

const navItems = [
  { to: '/feed', label: '知识流', description: '动态流', icon: Compass },
  { to: '/write', label: '写作场', description: '沉浸创作', icon: Bot },
  { to: '/graph', label: '关系图', description: '星图', icon: Binary },
]

export function SidebarLayout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [config, setConfig] = useState(() => readAiConfig() ?? DEFAULT_AI_CONFIG)
  const savedPools = useFluxStore((state) => state.savedPools)
  const removePool = useFluxStore((state) => state.removePool)
  const activePoolContext = useFluxStore((state) => state.activePoolContext)
  const clearActivePoolContext = useFluxStore((state) => state.clearActivePoolContext)
  const setActivePoolContext = useFluxStore((state) => state.setActivePoolContext)
  const activeFiltersToken = searchParams.get('filters')

  const activePoolId = useMemo(
    () =>
      savedPools.find((pool) => buildPoolContextKey(pool.filters) === activePoolContext?.key)?.id ??
      savedPools.find((pool) => encodePoolFilters(poolFiltersToTokens(pool.filters)) === activeFiltersToken)?.id ??
      null,
    [activeFiltersToken, activePoolContext?.key, savedPools],
  )

  const hasApiKey = Boolean(config.apiKey?.trim())

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event.key || event.key === 'flux_ai_config') {
        setConfig(readAiConfig())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
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

  return (
    <>
      <div className="min-h-screen bg-[#F9F9FB] text-zinc-900">
        <div className="mx-auto flex min-h-screen max-w-[1680px]">
          <aside className="w-full max-w-[248px] border-r border-zinc-200 bg-white/95">
            <div className="sticky top-0 flex min-h-screen flex-col px-5 py-6">
              <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                  <CircleDot className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-['Space_Grotesk',_'Noto_Sans_SC',_sans-serif] text-lg font-semibold tracking-tight text-zinc-950">
                    Flux
                  </div>
                  <div className="text-xs text-zinc-400">主动生长的知识流</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">导航</div>
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

              <div className="mt-8">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">观察主题</div>
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
                            <div className="mt-1 text-xs text-zinc-400">{tokens.map((token) => token.value).join(' / ')}</div>
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
                            aria-label={`移除观察主题 ${pool.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">指令台</div>
                <div className="mt-2 text-sm leading-6 text-zinc-500">Cmd/Ctrl + K 打开全局指令台</div>
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
                <span>配置大模型引擎</span>
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">
            {!hasApiKey ? (
              <div className="sticky top-0 z-50 -mx-6 -mt-6 mb-6 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 lg:-mx-8">
                <div className="flex items-center justify-between gap-4">
                  <span>欢迎进入 Flux。系统检测到尚未配置大模型引擎，自动打标与原文更新能力暂时不可用。</span>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-200"
                  >
                    立即配置 API →
                  </button>
                </div>
              </div>
            ) : null}

            <Outlet />
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
            className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <MotionDiv
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">大模型引擎</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">配置兼容 OpenAI Chat Completions 的接口。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">接口地址</span>
                  <input
                    type="text"
                    placeholder="https://api.deepseek.com/v1"
                    value={config.baseURL}
                    onChange={(event) => handleConfigChange('baseURL', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">模型名称</span>
                  <input
                    type="text"
                    placeholder="deepseek-chat"
                    value={config.model}
                    onChange={(event) => handleConfigChange('model', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">API 密钥</span>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={config.apiKey}
                    onChange={(event) => handleConfigChange('apiKey', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  saveAiConfig(config)
                  setIsSettingsOpen(false)
                }}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                保存并关闭
              </button>
            </MotionDiv>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  )
}
