import { afterEach, describe, expect, it } from 'vitest'

import { setStressMode } from '@/features/stress-mode/model/stress-mode'

import {
  getActiveRegistry,
  layerCommands,
  type LayersById,
  subscribeToLayers,
} from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'

const currentLayers = (): LayersById => {
  let current: LayersById = {}
  subscribeToLayers((byId) => {
    current = byId
  })()

  return current
}

afterEach(() => {
  setStressMode(3)
})

describe('стресс-режим (ТЗ §10.2)', () => {
  it('переключает набор слоёв: 3 реальных, 100 и 1000 синтетических', () => {
    setStressMode(100)
    expect(getActiveRegistry().ids).toHaveLength(100)
    expect(getActiveRegistry().ids[0]).toBe('synthetic-001')

    setStressMode(1000)
    expect(getActiveRegistry().ids).toHaveLength(1000)

    setStressMode(3)
    expect(getActiveRegistry().ids).toEqual(['temperature', 'wind', 'insolation'])
  })

  it('bulk-действия работают на всех слоях', () => {
    setStressMode(100)

    layerCommands.enableAll()

    expect(layerCommands.inFlightCount()).toBe(100)
    layerCommands.disableAll()
    expect(layerCommands.inFlightCount()).toBe(0)
  })

  it('возврат в режим 3 восстанавливает включённые слои и прозрачность (БАГ-1)', () => {
    const temperature = layerId('temperature')
    const wind = layerId('wind')
    layerCommands.setOpacity(temperature, 0.3)
    layerCommands.enable(temperature)

    setStressMode(1000)
    setStressMode(3)

    const layers = currentLayers()
    expect(layers[temperature]).toMatchObject({ enabled: true, opacity: 0.3 })
    expect(layers[wind]?.enabled).toBe(false)
    expect(layerCommands.inFlightCount()).toBe(1)
  })

  it('стресс-набор тоже возвращается в оставленном виде', () => {
    setStressMode(100)
    const first = getActiveRegistry().ids[0]
    if (first === undefined) throw new Error('Нет слоёв')
    layerCommands.enable(first)

    setStressMode(3)
    setStressMode(100)

    expect(currentLayers()[first]?.enabled).toBe(true)
  })
})
