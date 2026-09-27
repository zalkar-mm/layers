import { describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import { createLayersState } from './store'
import { createSummarySelector } from './summary'

const wind = layerId('wind')

describe('createSummarySelector', () => {
  it('считает total, enabled, loading, failed', () => {
    const state = createLayersState(baseLayerRegistry)
    const byId = {
      ...state.byId,
      [wind]: {
        enabled: true,
        opacity: 1,
        load: { kind: 'loading', requestId: 1, startedAt: 0, stale: null },
      },
    } as const

    expect(createSummarySelector()({ ids: state.ids, byId })).toEqual({
      total: 3,
      enabled: 1,
      loading: 1,
      failed: 0,
    })
  })

  it('при тех же числах возвращает тот же объект', () => {
    const select = createSummarySelector()
    const state = createLayersState(baseLayerRegistry)
    const first = select(state)
    const layer = state.byId[wind]
    if (layer === undefined) throw new Error('нет слоя')

    const second = select({
      ids: state.ids,
      byId: { ...state.byId, [wind]: { ...layer, opacity: 0.1 } },
    })

    expect(second).toBe(first)
  })
})
