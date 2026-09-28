import { describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import { createInitialLayerState } from '@/entities/layer/model/state/initial-state'

describe('createInitialLayerState', () => {
  it('слой выключен, загрузки не было, прозрачность из реестра', () => {
    const config = baseLayerRegistry.get(layerId('temperature'))

    expect(createInitialLayerState(config)).toEqual({
      enabled: false,
      opacity: 0.7,
      load: { kind: 'idle' },
    })
  })
})
