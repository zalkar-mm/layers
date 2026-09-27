import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
  },
  worker: {
    format: 'es',
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'docs/vedro-findings/**/*.test.{ts,tsx}',
      'perf/**/*.perf.test.{ts,tsx}',
    ],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/index.ts', 'src/app/main.tsx'],
    },
  },
})
