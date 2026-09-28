import { describe, expect, it } from 'vitest'

import { generateGrid } from '@/shared/api/mock-layer-api/generation/grid'
import { createRandom } from '@/shared/api/mock-layer-api/generation/random'

const TEMPERATURE = { valueRange: [-20, 40], withDirection: false } as const

describe('сетка mock API: общая геометрия', () => {
  it('разные ответы переиспользуют одни и те же полигоны, значения у них свои', () => {
    const first = generateGrid(TEMPERATURE, createRandom(1))
    const second = generateGrid(TEMPERATURE, createRandom(2))

    expect(second.features[0]?.geometry).toBe(first.features[0]?.geometry)
    expect(second.features.map((feature) => feature.properties.value)).not.toEqual(
      first.features.map((feature) => feature.properties.value),
    )
  })

  it('общую геометрию нельзя изменить из одного ответа и сломать другие', () => {
    const geometry = generateGrid(TEMPERATURE, createRandom(1)).features[0]?.geometry
    const point = geometry?.coordinates[0]?.[0]

    expect(Object.isFrozen(geometry)).toBe(true)
    expect(Object.isFrozen(geometry?.coordinates[0])).toBe(true)
    expect(() => point?.splice(0, 1)).toThrow(TypeError)
  })
})
