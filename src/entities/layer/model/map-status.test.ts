import { describe, expect, it } from 'vitest'

import type { LayerData } from '@/shared/api'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import { createEnabledIdsSelector, mapStatusOf } from './map-status'
import { createLayersState, type LayersState } from './store'

const data: LayerData = { type: 'FeatureCollection', features: [] }
const wind = layerId('wind')

describe('статус слоя на карте', () => {
  it.each([
    [{ enabled: false, opacity: 1, load: { kind: 'idle' } }, 'off'],
    [
      {
        enabled: true,
        opacity: 1,
        load: { kind: 'loading', requestId: 1, startedAt: 0, stale: null },
      },
      'loading',
    ],
    [
      {
        enabled: true,
        opacity: 1,
        load: { kind: 'loading', requestId: 1, startedAt: 0, stale: { data, loadedAt: 0 } },
      },
      'shown',
    ],
    [
      {
        enabled: true,
        opacity: 1,
        load: { kind: 'success', data, loadedAt: 0, durationMs: 1, source: 'network' },
      },
      'shown',
    ],
    [
      {
        enabled: true,
        opacity: 1,
        load: { kind: 'error', error: { kind: 'server', message: '' }, attempt: 1, stale: null },
      },
      'failed',
    ],
  ] as const)('%o → %s', (layer, status) => {
    expect(mapStatusOf(layer)).toBe(status)
  })
})

describe('createEnabledIdsSelector', () => {
  it('отдаёт тот же массив, пока набор включённых не изменился', () => {
    const select = createEnabledIdsSelector()
    const state = createLayersState(baseLayerRegistry)
    const layer = state.byId[wind]
    if (layer === undefined) throw new Error('нет слоя')
    const on: Pick<LayersState, 'ids' | 'byId'> = {
      ids: state.ids,
      byId: { ...state.byId, [wind]: { ...layer, enabled: true } },
    }

    const first = select(on)
    const onWind = on.byId[wind]
    if (onWind === undefined) throw new Error('нет слоя')
    const second = select({
      ids: on.ids,
      byId: { ...on.byId, [wind]: { ...onWind, opacity: 0.2 } },
    })

    expect(first).toEqual(['wind'])
    expect(second).toBe(first)
  })
})
