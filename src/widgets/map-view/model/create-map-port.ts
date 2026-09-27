import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import type { MapPort } from './map-port'

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
    map.addLayer(
      kind === 'fill'
        ? { id, type: 'fill', source: sourceId }
        : { id, type: 'symbol', source: sourceId },
    )
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
