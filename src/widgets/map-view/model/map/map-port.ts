import type { FeatureCollection } from 'geojson'
import type { Map as MapLibreMap } from 'maplibre-gl'

export type PaintPropertyName = Parameters<MapLibreMap['setPaintProperty']>[1]
export type LayoutPropertyName = Parameters<MapLibreMap['setLayoutProperty']>[1]
export type PaintPropertyValue = Parameters<MapLibreMap['setPaintProperty']>[2]
export type LayoutPropertyValue = Parameters<MapLibreMap['setLayoutProperty']>[2]

export type MapLayerKind = 'fill' | 'symbol' | 'heatmap'

export type MapSourceData = FeatureCollection

export type MapPort = {
  readonly addSource: (id: string, data: MapSourceData) => void
  readonly setSourceData: (id: string, data: MapSourceData) => void
  readonly removeSource: (id: string) => void
  readonly addLayer: (id: string, kind: MapLayerKind, sourceId: string) => void
  readonly removeLayer: (id: string) => void
  readonly setPaintProperty: (
    layerId: string,
    name: PaintPropertyName,
    value: PaintPropertyValue,
  ) => void
  readonly setLayoutProperty: (
    layerId: string,
    name: LayoutPropertyName,
    value: LayoutPropertyValue,
  ) => void
  readonly moveLayer: (id: string) => void
}
