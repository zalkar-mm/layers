import type { AddLayerObject, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import type { MapLayerKind, MapPort } from './map-port'

type LayerSpecFactory = (id: string, source: string) => AddLayerObject

const LAYER_SPECS: Readonly<Record<MapLayerKind, LayerSpecFactory>> = {
  fill: (id, source) => ({ id, type: 'fill', source }),
  symbol: (id, source) => ({ id, type: 'symbol', source }),
  heatmap: (id, source) => ({ id, type: 'heatmap', source }),
}

export const createMapPort = (map: MapLibreMap): MapPort => ({
  addSource: (id, data) => {
    map.addSource(id, { type: 'geojson', data })
  },
  setSourceData: (id, data) => {
    void map.getSource<GeoJSONSource>(id)?.setData(data)
  },
  removeSource: (id) => {
    if (map.getSource(id) !== undefined) map.removeSource(id)
  },
  addLayer: (id, kind, sourceId) => {
    map.addLayer(LAYER_SPECS[kind](id, sourceId))
  },
  removeLayer: (id) => {
    if (map.getLayer(id) !== undefined) map.removeLayer(id)
  },
  setPaintProperty: (layerId, name, value) => {
    map.setPaintProperty(layerId, name, value)
  },
  setLayoutProperty: (layerId, name, value) => {
    map.setLayoutProperty(layerId, name, value)
  },
  moveLayer: (id) => {
    map.moveLayer(id)
  },
})
