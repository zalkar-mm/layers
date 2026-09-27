import type { CellFeature, LayerData, LayerDataRequest, LinearRing } from './types'

export const GRID_BBOX = { west: 69.2, east: 80.3, south: 39.2, north: 43.3 } as const
export const GRID_STEP = 0.25

const WAVES = 3

type Wave = {
  readonly amplitude: number
  readonly freqLng: number
  readonly freqLat: number
  readonly phaseLng: number
  readonly phaseLat: number
}

const createWaves = (random: () => number): readonly Wave[] =>
  Array.from({ length: WAVES }, (_, index) => {
    const order = index + 1

    return {
      amplitude: 1 / order,
      freqLng: (0.15 + random() * 0.35) * order,
      freqLat: (0.15 + random() * 0.35) * order,
      phaseLng: random() * Math.PI * 2,
      phaseLat: random() * Math.PI * 2,
    }
  })

type SeparableField = {
  readonly columnTerms: readonly Float64Array[]
  readonly rowTerms: readonly Float64Array[]
  readonly totalAmplitude: number
}

const createSeparableField = (
  random: () => number,
  columnCenters: readonly number[],
  rowCenters: readonly number[],
): SeparableField => {
  const waves = createWaves(random)

  return {
    columnTerms: waves.map((wave) =>
      Float64Array.from(
        columnCenters,
        (lng) => wave.amplitude * Math.sin(wave.freqLng * lng + wave.phaseLng),
      ),
    ),
    rowTerms: waves.map((wave) =>
      Float64Array.from(rowCenters, (lat) => Math.cos(wave.freqLat * lat + wave.phaseLat)),
    ),
    totalAmplitude: waves.reduce((sum, wave) => sum + wave.amplitude, 0),
  }
}

const sampleField = (field: SeparableField, col: number, row: number): number => {
  let sum = 0
  for (let wave = 0; wave < WAVES; wave += 1) {
    sum += (field.columnTerms[wave]?.[col] ?? 0) * (field.rowTerms[wave]?.[row] ?? 0)
  }

  return (sum / field.totalAmplitude + 1) / 2
}

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits

  return Math.round(value * factor) / factor
}

const cellEdges = (origin: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) => round(origin + index * GRID_STEP, 4))

type CellGeometry = CellFeature['geometry']

type GridCell = {
  readonly id: number
  readonly col: number
  readonly row: number
  readonly geometry: CellGeometry
}

type GridLayout = {
  readonly cells: readonly GridCell[]
  readonly columnCenters: readonly number[]
  readonly rowCenters: readonly number[]
}

const createCellGeometry = (west: number, south: number): CellGeometry => {
  const east = round(west + GRID_STEP, 4)
  const north = round(south + GRID_STEP, 4)
  const ring: LinearRing = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]
  const geometry: CellGeometry = { type: 'Polygon', coordinates: [ring] }
  for (const point of ring) Object.freeze(point)
  Object.freeze(ring)
  Object.freeze(geometry.coordinates)
  Object.freeze(geometry)

  return geometry
}

const createGridLayout = (): GridLayout => {
  const cols = Math.ceil((GRID_BBOX.east - GRID_BBOX.west) / GRID_STEP)
  const rows = Math.ceil((GRID_BBOX.north - GRID_BBOX.south) / GRID_STEP)
  const wests = cellEdges(GRID_BBOX.west, cols)
  const souths = cellEdges(GRID_BBOX.south, rows)

  return {
    cells: Array.from({ length: rows * cols }, (_, id): GridCell => {
      const row = Math.floor(id / cols)
      const col = id % cols

      return { id, col, row, geometry: createCellGeometry(wests[col] ?? 0, souths[row] ?? 0) }
    }),
    columnCenters: wests.map((west) => west + GRID_STEP / 2),
    rowCenters: souths.map((south) => south + GRID_STEP / 2),
  }
}

const gridLayout = createGridLayout()

export const generateGrid = (request: LayerDataRequest, random: () => number): LayerData => {
  const [min, max] = request.valueRange
  const { cells, columnCenters, rowCenters } = gridLayout
  const valueField = createSeparableField(random, columnCenters, rowCenters)
  const directionField = createSeparableField(random, columnCenters, rowCenters)

  return {
    type: 'FeatureCollection',
    features: cells.map(({ id, col, row, geometry }) => ({
      type: 'Feature',
      id,
      geometry,
      properties: {
        value: round(min + sampleField(valueField, col, row) * (max - min), 1),
        direction: request.withDirection
          ? Math.round(sampleField(directionField, col, row) * 360) % 360
          : null,
      },
    })),
  }
}
