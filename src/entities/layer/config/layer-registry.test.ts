import { describe, expect, it } from 'vitest'

import { BASE_LAYER_CONFIGS, layerId } from './base-layers'
import { createLayerRegistry } from './layer-registry'

const [temperature, wind] = BASE_LAYER_CONFIGS

describe('createLayerRegistry', () => {
  it('отдаёт конфиг по id и сохраняет порядок', () => {
    const registry = createLayerRegistry([...BASE_LAYER_CONFIGS].reverse())

    expect(registry.ids).toEqual(['insolation', 'wind', 'temperature'])
    expect(registry.get(layerId('wind'))).toBe(wind)
  })

  it('на неизвестный id бросает понятную ошибку', () => {
    const registry = createLayerRegistry(temperature === undefined ? [] : [temperature])

    expect(() => registry.get(layerId('wind'))).toThrow('Слой wind не найден в реестре')
  })

  it('на дублирующийся id бросает ошибку при создании', () => {
    expect(() => createLayerRegistry([...BASE_LAYER_CONFIGS, ...BASE_LAYER_CONFIGS])).toThrow(
      'Дублирующийся id слоя в реестре: temperature',
    )
  })
  it('find возвращает конфиг по строке или undefined', () => {
    const registry = createLayerRegistry(BASE_LAYER_CONFIGS)

    expect(registry.find('wind')).toBe(wind)
    expect(registry.find('unknown')).toBeUndefined()
  })
})
