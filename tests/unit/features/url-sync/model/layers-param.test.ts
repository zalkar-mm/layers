import { describe, expect, it } from 'vitest'

import {
  parseLayersParam,
  serializeLayers,
  withLayersParam,
} from '@/features/url-sync/model/layers-param'

import { baseLayerRegistry, type LayerId, type LayerState } from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'
import { createInitialLayerState } from '@/entities/layer/model/state/initial-state'

describe('параметр слоёв в URL (ТЗ §11.1)', () => {
  it('разбирает включённые слои и прозрачность', () => {
    expect(parseLayersParam('temperature:70,wind:90', baseLayerRegistry)).toEqual([
      { id: 'temperature', opacity: 0.7 },
      { id: 'wind', opacity: 0.9 },
    ])
  })

  it.each([
    ['unknown:50,wind:40', [{ id: 'wind', opacity: 0.4 }]],
    ['wind:abc', [{ id: 'wind', opacity: null }]],
    ['wind:150', [{ id: 'wind', opacity: null }]],
    ['wind:-5', [{ id: 'wind', opacity: null }]],
    ['wind', [{ id: 'wind', opacity: null }]],
    ['wind:40:1', [{ id: 'wind', opacity: null }]],
    ['wind:40,wind:10', [{ id: 'wind', opacity: 0.4 }]],
    [',,,', []],
    ['', []],
  ])('невалидное игнорируется молча: %s', (value, expected) => {
    expect(parseLayersParam(value, baseLayerRegistry)).toEqual(expected)
  })

  it('сериализует только включённые слои в порядке списка', () => {
    const byId: Record<LayerId, LayerState> = {}
    for (const id of baseLayerRegistry.ids)
      byId[id] = createInitialLayerState(baseLayerRegistry.get(id))
    const wind = byId[layerId('wind')]
    const temperature = byId[layerId('temperature')]
    if (wind === undefined || temperature === undefined) throw new Error('нет слоёв')
    byId[layerId('wind')] = { ...wind, enabled: true, opacity: 0.9 }
    byId[layerId('temperature')] = { ...temperature, enabled: true, opacity: 0.704 }

    expect(serializeLayers(baseLayerRegistry.ids, byId)).toBe('temperature:70,wind:90')
  })

  it('обновляет параметр и сохраняет остальные, пустое значение убирает параметр', () => {
    expect(withLayersParam('?debug=1', 'wind:90')).toBe('?debug=1&l=wind:90')
    expect(withLayersParam('?l=wind:90', '')).toBe('')
  })
})
