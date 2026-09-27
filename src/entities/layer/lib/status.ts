import { formatAge } from '@/shared/lib/format'

import type { LoadState } from '../model/types'

export type StatusTone = 'progress' | 'success' | 'danger'

export type StatusView = {
  readonly tone: StatusTone
  readonly text: string
  readonly busy: boolean
}

export const describeStatus = (load: LoadState, now: number): StatusView | null => {
  switch (load.kind) {
    case 'idle':
      return null
    case 'loading':
      return load.stale === null
        ? { tone: 'progress', text: 'Загрузка…', busy: true }
        : {
            tone: 'progress',
            text: `Обновление · данные ${formatAge(now - load.stale.loadedAt)}`,
            busy: true,
          }
    case 'success':
      return { tone: 'success', text: `Готово · ${String(load.durationMs)} мс`, busy: false }
    case 'error':
      return load.stale === null
        ? { tone: 'danger', text: 'Ошибка', busy: false }
        : {
            tone: 'danger',
            text: `Ошибка · показаны данные ${formatAge(now - load.stale.loadedAt)}`,
            busy: false,
          }
  }
}

export const hasStaleData = (load: LoadState): boolean =>
  (load.kind === 'loading' || load.kind === 'error') && load.stale !== null
