import { describe, expect, it } from 'vitest'

import { describeStatus, hasStaleData } from '@/entities/layer/lib/status'

describe('текст статуса слоя (ТЗ §7.2)', () => {
  const now = 10 * 60_000

  it.each([
    [{ kind: 'idle' }, null],
    [{ kind: 'loading', staleLoadedAt: null }, 'Загрузка…'],
    [{ kind: 'loading', staleLoadedAt: now - 2 * 60_000 }, 'Обновление · данные 2 мин назад'],
    [{ kind: 'success', durationMs: 840 }, 'Готово · 840 мс'],
    [
      { kind: 'error', staleLoadedAt: null, errorMessage: 'Сервер вернул ошибку', attempt: 1 },
      'Ошибка',
    ],
    [
      {
        kind: 'error',
        staleLoadedAt: now - 3 * 60_000,
        errorMessage: 'Сервер вернул ошибку',
        attempt: 1,
      },
      'Ошибка · показаны данные 3 мин назад',
    ],
  ] as const)('%o → %s', (status, text) => {
    expect(describeStatus(status, now)?.text ?? null).toBe(text)
  })

  it.each([
    [{ kind: 'idle' }, false],
    [{ kind: 'loading', staleLoadedAt: null }, false],
    [{ kind: 'loading', staleLoadedAt: 0 }, true],
    [{ kind: 'success', durationMs: 1 }, false],
    [{ kind: 'error', staleLoadedAt: 0, errorMessage: '', attempt: 1 }, true],
  ] as const)('hasStaleData(%o) → %s', (status, expected) => {
    expect(hasStaleData(status)).toBe(expected)
  })
})
