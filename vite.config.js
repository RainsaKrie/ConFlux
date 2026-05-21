import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function manualChunks(id) {
  if (id.includes('node_modules/onnxruntime-web')) {
    return 'vendor-onnxruntime'
  }

  if (id.includes('node_modules/@xenova/transformers')) {
    return 'vendor-transformers'
  }

  if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
    return 'vendor-editor'
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      checks: {
        eval: false,
        pluginTimings: false,
      },
      output: {
        manualChunks,
      },
    },
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
