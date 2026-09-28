import { describe, expect, it } from 'vitest'

import { createLayerApi, toLayerDataRequest } from '@/entities/layer/api/layer-api'
import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import type { LayerRenderKind } from '@/entities/layer/model/state/types'

const temperature = baseLayerRegistry.get(layerId('temperature'))

describe('запрос данных слоя к mock API', () => {
  it.each<[LayerRenderKind, boolean]>([
    ['fill', false],
    ['arrows', true],
    ['heatmap', false],
  ])('%s → withDirection: %s', (render, withDirection) => {
    expect(toLayerDataRequest({ ...temperature, render })).toEqual({
      valueRange: temperature.valueRange,
      withDirection,
    })
  })
})

describe('createLayerApi', () => {
  it('описывает слой через переданный поиск конфигурации', () => {
    const api = createLayerApi({ findConfig: () => undefined })
    const { signal } = new AbortController()

    expect(() => api.fetchLayerData('unknown', { signal })).toThrow(
      'Слой unknown не найден в реестре',
    )
  })
})
