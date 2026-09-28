import { describe, expect, it } from 'vitest'

import { formatEvent } from '@/widgets/chaos-panel/lib/format-event'

import { layerId } from '@/entities/layer/config/layers/base-layers'

const base = { seq: 1, at: 0, layerId: layerId('temperature'), requestId: 12, ageMs: null } as const

describe('формат событий лога (ТЗ §10.1)', () => {
  it.each([
    [{ ...base, kind: 'stale-dropped' }, 'r12 temperature → отброшен (устаревший)'],
    [{ ...base, kind: 'abort', requestId: 13 }, 'r13 temperature → abort'],
    [
      { ...base, kind: 'cache-hit', requestId: null, ageMs: 80_000 },
      'temperature → из кэша (1 мин 20 с)',
    ],
    [{ ...base, kind: 'cache-updated', requestId: 14 }, 'r14 temperature → кэш обновлён'],
  ] as const)('%o → %s', (event, text) => {
    expect(formatEvent(event)).toBe(text)
  })
})
