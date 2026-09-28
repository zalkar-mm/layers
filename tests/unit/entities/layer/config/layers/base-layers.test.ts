import { describe, expect, it } from 'vitest'

import {
  BASE_LAYER_CONFIGS,
  BASE_LAYER_KEYS,
  baseLayerRegistry,
  layerId,
} from '@/entities/layer/config/layers/base-layers'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

describe('реестр реальных слоёв (ТЗ §4.1)', () => {
  it('содержит три слоя в порядке отображения', () => {
    expect(BASE_LAYER_KEYS).toEqual(['temperature', 'wind', 'insolation'])
    expect(baseLayerRegistry.ids).toEqual(['temperature', 'wind', 'insolation'])
  })

  it.each([
    ['temperature', 'Температура', '°C', [-20, 40], 'fill', 0.7],
    ['wind', 'Ветер', 'м/с', [0, 25], 'arrows', 0.9],
    ['insolation', 'Инсоляция', 'кВт·ч/м²·день', [1, 7], 'fill', 0.6],
  ] as const)(
    '%s: параметры совпадают с таблицей §4.1',
    (key, title, unit, range, render, opacity) => {
      const config = baseLayerRegistry.get(layerId(key))

      expect(config).toMatchObject({
        id: key,
        title,
        unit,
        valueRange: range,
        render,
        defaultOpacity: opacity,
      })
    },
  )

  it.each(BASE_LAYER_CONFIGS.map((config) => [config.id, config] as const))(
    '%s: конфиг внутренне согласован',
    (_id, config) => {
      const [min, max] = config.valueRange

      expect(min).toBeLessThan(max)
      expect(config.defaultOpacity).toBeGreaterThanOrEqual(0)
      expect(config.defaultOpacity).toBeLessThanOrEqual(1)
      expect(config.palette.length).toBeGreaterThanOrEqual(2)
      for (const color of config.palette) expect(color).toMatch(HEX_COLOR)
    },
  )

  it('id создаётся только из известного ключа', () => {
    expect(layerId('wind')).toBe('wind')

    // @ts-expect-error
    layerId('temprature')
  })
})
