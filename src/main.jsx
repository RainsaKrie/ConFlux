import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'

async function probeDesktopShell() {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const message = await invoke('hello_conflux_desktop')
    console.info('[Conflux Desktop]', message)
  } catch (error) {
    console.warn('[Conflux Desktop] IPC probe failed', error)
  }
}

void probeDesktopShell()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
