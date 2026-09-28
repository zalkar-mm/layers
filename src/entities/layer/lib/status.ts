import { formatAge } from '@/shared/lib/format'

import type { LayerRowStatus } from './row-view'

export type StatusTone = 'progress' | 'success' | 'danger'

export type StatusView = {
  readonly tone: StatusTone
  readonly text: string
  readonly busy: boolean
}

type StaleAwareText = {
  readonly fresh: string
  readonly stale: string
}

const LOADING_TEXT: StaleAwareText = { fresh: 'Загрузка…', stale: 'Обновление · данные' }
const ERROR_TEXT: StaleAwareText = { fresh: 'Ошибка', stale: 'Ошибка · показаны данные' }

const staleAwareText = (text: StaleAwareText, staleLoadedAt: number | null, now: number) => {
  if (staleLoadedAt === null) return text.fresh

  return `${text.stale} ${formatAge(now - staleLoadedAt)}`
}

export const describeStatus = (status: LayerRowStatus, now: number): StatusView | null => {
  switch (status.kind) {
    case 'idle':
      return null
    case 'loading':
      return {
        tone: 'progress',
        text: staleAwareText(LOADING_TEXT, status.staleLoadedAt, now),
        busy: true,
      }
    case 'success':
      return { tone: 'success', text: `Готово · ${String(status.durationMs)} мс`, busy: false }
    case 'error':
      return {
        tone: 'danger',
        text: staleAwareText(ERROR_TEXT, status.staleLoadedAt, now),
        busy: false,
      }
  }
}

export const hasStaleData = (status: LayerRowStatus): boolean =>
  'staleLoadedAt' in status && status.staleLoadedAt !== null
