import { describe, expect, it } from 'vitest'

import { toLayerRowView } from '@/entities/layer/lib/row-view'
import type { LayerData, LayerState } from '@/entities/layer/model/state/types'

const data: LayerData = { type: 'FeatureCollection', features: [] }
const error = { kind: 'server', message: 'Сервер вернул ошибку' } as const

const layer = (load: LayerState['load']): LayerState => ({ enabled: true, opacity: 0.5, load })

describe('toLayerRowView', () => {
  it.each<[string, LayerState['load'], ReturnType<typeof toLayerRowView>]>([
    ['idle', { kind: 'idle' }, { enabled: true, opacity: 0.5, kind: 'idle' }],
    [
      'loading без кэша',
      { kind: 'loading', requestId: 1, startedAt: 0, stale: null },
      { enabled: true, opacity: 0.5, kind: 'loading', staleLoadedAt: null },
    ],
    [
      'loading поверх кэша',
      { kind: 'loading', requestId: 1, startedAt: 0, stale: { data, loadedAt: 100 } },
      { enabled: true, opacity: 0.5, kind: 'loading', staleLoadedAt: 100 },
    ],
    [
      'success',
      { kind: 'success', data, loadedAt: 900, durationMs: 840, source: 'network' },
      { enabled: true, opacity: 0.5, kind: 'success', durationMs: 840 },
    ],
    [
      'error без кэша',
      { kind: 'error', error, attempt: 2, stale: null },
      {
        enabled: true,
        opacity: 0.5,
        kind: 'error',
        staleLoadedAt: null,
        errorMessage: 'Сервер вернул ошибку',
        attempt: 2,
      },
    ],
    [
      'error поверх кэша',
      { kind: 'error', error, attempt: 1, stale: { data, loadedAt: 100 } },
      {
        enabled: true,
        opacity: 0.5,
        kind: 'error',
        staleLoadedAt: 100,
        errorMessage: 'Сервер вернул ошибку',
        attempt: 1,
      },
    ],
  ])('%s', (_, load, expected) => {
    const view = toLayerRowView(layer(load))

    expect(view).toEqual(expected)
    expect(JSON.stringify(view)).not.toContain('FeatureCollection')
  })

  it('отсутствующий слой — вид выключенного слоя без исключения', () => {
    expect(toLayerRowView(undefined)).toEqual({ enabled: false, opacity: 0, kind: 'idle' })
  })
})
