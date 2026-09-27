import { describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer'

import { compassPoint, formatPointValues } from './point-values'

const config = (key: 'temperature' | 'wind' | 'insolation') => baseLayerRegistry.get(layerId(key))

describe('значения в точке (ТЗ §9)', () => {
  it('собирает строку по видимым слоям', () => {
    expect(
      formatPointValues([
        { config: config('temperature'), value: 18, direction: null },
        { config: config('wind'), value: 6, direction: 315 },
        { config: config('insolation'), value: 5.2, direction: null },
      ]),
    ).toBe('Температура +18 °C · Ветер 6 м/с, СЗ · Инсоляция 5,2 кВт·ч/м²·день')
  })

  it.each([
    [0, 'С'],
    [44, 'СВ'],
    [180, 'Ю'],
    [359, 'С'],
  ])('%i° → %s', (degrees, point) => {
    expect(compassPoint(degrees)).toBe(point)
  })
})
