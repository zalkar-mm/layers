import { describe, expect, it } from 'vitest'

import type { LayerData } from '@/shared/api'

import { describeStatus } from './status'

const data: LayerData = { type: 'FeatureCollection', features: [] }
const error = { kind: 'server', message: 'Сервер вернул ошибку' } as const

describe('текст статуса слоя (ТЗ §7.2)', () => {
  const now = 10 * 60_000

  it.each([
    [{ kind: 'idle' }, null],
    [{ kind: 'loading', requestId: 1, startedAt: 0, stale: null }, 'Загрузка…'],
    [
      { kind: 'loading', requestId: 1, startedAt: 0, stale: { data, loadedAt: now - 2 * 60_000 } },
      'Обновление · данные 2 мин назад',
    ],
    [{ kind: 'success', data, loadedAt: 0, durationMs: 840, source: 'network' }, 'Готово · 840 мс'],
    [{ kind: 'error', error, attempt: 1, stale: null }, 'Ошибка'],
    [
      { kind: 'error', error, attempt: 1, stale: { data, loadedAt: now - 3 * 60_000 } },
      'Ошибка · показаны данные 3 мин назад',
    ],
  ] as const)('%o → %s', (load, text) => {
    expect(describeStatus(load, now)?.text ?? null).toBe(text)
  })
})
