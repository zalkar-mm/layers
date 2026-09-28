import { describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import { mapStatusOf, selectMapOverlay } from '@/entities/layer/model/selectors/map-status'
import type { LayerId } from '@/entities/layer/model/state/types'
import { createLayersState, type LayersState } from '@/entities/layer/model/store/store'

import type { LayerData } from '@/shared/api'

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

describe('selectMapOverlay', () => {
  const withEnabled = (state: Pick<LayersState, 'ids' | 'byId'>, ids: readonly LayerId[]) => {
    const byId = { ...state.byId }
    for (const id of ids) {
      const layer = byId[id]
      if (layer !== undefined) byId[id] = { ...layer, enabled: true }
    }

    return { ids: state.ids, byId }
  }

  it('отдаёт первые limit включённых и общее число включённых', () => {
    const state = withEnabled(createLayersState(baseLayerRegistry), [
      layerId('temperature'),
      wind,
      layerId('insolation'),
    ])

    expect(selectMapOverlay(state, 2)).toEqual({
      shownIds: ['temperature', 'wind'],
      enabledCount: 3,
    })
  })

  it('для того же byId возвращает тот же объект, в том числе при чередовании prev/next', () => {
    const base = createLayersState(baseLayerRegistry)
    const prev = withEnabled(base, [wind])
    const next = withEnabled(base, [])

    const first = selectMapOverlay(prev, 10)
    selectMapOverlay(next, 10)

    expect(selectMapOverlay(prev, 10)).toBe(first)
    expect(selectMapOverlay(next, 10)).toEqual({ shownIds: [], enabledCount: 0 })
  })
})
