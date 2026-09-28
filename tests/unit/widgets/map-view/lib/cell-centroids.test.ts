import { describe, expect, it } from 'vitest'

import { cellCentroids, ringCentroid } from '@/widgets/map-view/lib/cell-centroids'

import type { LayerData } from '@/entities/layer'

describe('центроиды ячеек', () => {
  it('среднее вершин без замыкающей точки', () => {
    expect(
      ringCentroid([
        [74, 42],
        [74.25, 42],
        [74.25, 42.25],
        [74, 42.25],
        [74, 42],
      ]),
    ).toEqual([74.125, 42.125])
  })

  it('незамкнутое кольцо — среднее всех вершин, пустое — null', () => {
    expect(
      ringCentroid([
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ]),
    ).toEqual([1, 1])
    expect(ringCentroid([])).toBeNull()
  })

  it('точки сохраняют id и ссылку на исходные properties, пустые ячейки пропускаются', () => {
    const properties = { value: 3, direction: 90 }
    const data: LayerData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 7,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
          properties,
        },
        {
          type: 'Feature',
          id: 8,
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { value: 0, direction: null },
        },
      ],
    }

    const result = cellCentroids(data)

    expect(result.features).toHaveLength(1)
    expect(result.features[0]?.id).toBe(7)
    expect(result.features[0]?.geometry).toEqual({ type: 'Point', coordinates: [0.5, 0.5] })
    expect(result.features[0]?.properties).toBe(properties)
  })
})
