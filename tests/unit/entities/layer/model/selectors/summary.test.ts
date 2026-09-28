import { describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import { createSummarySelector } from '@/entities/layer/model/selectors/summary'
import { createLayersState } from '@/entities/layer/model/store/store'

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

  it('чередование prev/next не пересчитывает: результат берётся по ссылке byId', () => {
    const select = createSummarySelector()
    const state = createLayersState(baseLayerRegistry)
    const layer = state.byId[wind]
    if (layer === undefined) throw new Error('нет слоя')
    const next = { ids: state.ids, byId: { ...state.byId, [wind]: { ...layer, enabled: true } } }

    const prevSummary = select(state)
    const nextSummary = select(next)

    expect(select(state)).toBe(prevSummary)
    expect(select(next)).toBe(nextSummary)
    expect(nextSummary.enabled).toBe(1)
    expect(prevSummary.enabled).toBe(0)
  })
})
