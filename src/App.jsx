import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from './i18n/I18nProvider'
import { SidebarLayout } from './layouts/SidebarLayout'

const FeedPage = lazy(() => import('./pages/FeedPage').then((module) => ({ default: module.FeedPage })))
const EditorPage = lazy(() => import('./pages/EditorPage').then((module) => ({ default: module.EditorPage })))
const GraphPage = lazy(() => import('./pages/GraphPage').then((module) => ({ default: module.GraphPage })))

function RouteLoadingState() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto mt-14 max-w-4xl px-4">
      <div className="rounded-[32px] border border-zinc-200/80 bg-white/70 px-6 py-8 text-sm text-zinc-500 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        {t('common.loadingView')}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route
            path="/feed"
            element={(
              <Suspense fallback={<RouteLoadingState />}>
                <FeedPage />
              </Suspense>
            )}
          />
          <Route
            path="/write"
            element={(
              <Suspense fallback={<RouteLoadingState />}>
                <EditorPage />
              </Suspense>
            )}
          />
          <Route
            path="/graph"
            element={(
              <Suspense fallback={<RouteLoadingState />}>
                <GraphPage />
              </Suspense>
            )}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
