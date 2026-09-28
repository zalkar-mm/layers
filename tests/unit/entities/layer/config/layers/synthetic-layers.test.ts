import { describe, expect, it } from 'vitest'

import {
  createSyntheticLayerConfigs,
  syntheticLayerId,
} from '@/entities/layer/config/layers/synthetic-layers'
import { createLayerRegistry } from '@/entities/layer/config/registry/layer-registry'

describe('синтетические слои (ТЗ §10.2)', () => {
  it('создаёт N слоёв с id synthetic-001… через тот же реестр', () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(1000))

    expect(registry.ids).toHaveLength(1000)
    expect(registry.ids[0]).toBe('synthetic-001')
    expect(registry.ids[999]).toBe('synthetic-1000')
  })

  it('палитры и диапазоны повторяют реальные слои по кругу', () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(4))

    expect(registry.get(syntheticLayerId(1)).unit).toBe('°C')
    expect(registry.get(syntheticLayerId(2)).unit).toBe('м/с')
    expect(registry.get(syntheticLayerId(4)).unit).toBe('°C')
    expect(registry.get(syntheticLayerId(2)).render).toBe('fill')
  })
})
