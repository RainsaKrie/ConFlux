import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SidebarLayout } from './layouts/SidebarLayout'
import { EditorPage } from './pages/EditorPage'
import { FeedPage } from './pages/FeedPage'
import { GraphPage } from './pages/GraphPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/write" element={<EditorPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
