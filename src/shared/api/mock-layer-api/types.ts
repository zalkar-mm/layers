export type LinearRing = [lng: number, lat: number][]

export type CellProperties = {
  readonly value: number
  readonly direction: number | null
}

export type CellFeature = {
  readonly type: 'Feature'
  readonly id: number
  readonly geometry: { readonly type: 'Polygon'; readonly coordinates: LinearRing[] }
  readonly properties: CellProperties
}

export type LayerData = {
  readonly type: 'FeatureCollection'
  readonly features: CellFeature[]
}

export type LayerDataRequest = {
  readonly valueRange: readonly [min: number, max: number]
  readonly withDirection: boolean
}
