import type { Feature, FeatureCollection, Point, Position } from 'geojson'

import type { LayerData } from '@/entities/layer'

type CellFeature = LayerData['features'][number]
type CellProperties = CellFeature['properties']
type Ring = readonly (readonly number[])[]

export type CentroidData = FeatureCollection<Point, CellProperties>

const isClosed = (ring: Ring): boolean => {
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (ring.length < 2 || first === undefined || last === undefined) return false

  return first[0] === last[0] && first[1] === last[1]
}

export const ringCentroid = (ring: Ring): Position | null => {
  const count = isClosed(ring) ? ring.length - 1 : ring.length
  if (count === 0) return null
  let lng = 0
  let lat = 0
  for (let index = 0; index < count; index += 1) {
    const point = ring[index]
    lng += point?.[0] ?? NaN
    lat += point?.[1] ?? NaN
  }

  return [lng / count, lat / count]
}

export const cellCentroids = (data: LayerData): CentroidData => {
  const features: Feature<Point, CellProperties>[] = []
  for (const cell of data.features) {
    const coordinates = ringCentroid(cell.geometry.coordinates[0] ?? [])
    if (coordinates === null) continue
    features.push({
      type: 'Feature',
      id: cell.id,
      geometry: { type: 'Point', coordinates },
      properties: cell.properties,
    })
  }

  return { type: 'FeatureCollection', features }
}
