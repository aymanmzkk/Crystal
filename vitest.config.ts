import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // IndexedDB simulado en memoria para probar la base de datos sin navegador
    setupFiles: ['fake-indexeddb/auto'],
  },
})
