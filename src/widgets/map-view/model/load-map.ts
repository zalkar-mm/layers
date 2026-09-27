import type { StyleSpecification } from 'maplibre-gl'

import { getActiveRegistry, getLayerConfig, subscribeToLayers } from '@/entities/layer'

import { createArrowImage } from '../lib/arrow-image'
import { formatPointValues } from '../lib/point-values'

import { createMapPort } from './create-map-port'
import { WIND_ARROW_IMAGE } from './layer-style'
import { createMapSync } from './map-sync'

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const INITIAL_CENTER: [lng: number, lat: number] = [74.6, 41.4]
const INITIAL_ZOOM = 5.4

const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef1f5' } }],
}

export type LoadedMap = { readonly destroy: () => void }

export const loadMap = async (container: HTMLElement, signal: AbortSignal): Promise<LoadedMap> => {
  const [{ Map, Popup, setWorkerUrl }, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ])
  if (signal.aborted) throw new DOMException('Карта больше не нужна', 'AbortError')
  setWorkerUrl(workerUrl)
  const map = new Map({
    container,
    style: BASEMAP_STYLE,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  })
  let sync: ReturnType<typeof createMapSync> | null = null

  const onStyleError = (event: { readonly error: unknown }) => {
    const url: unknown =
      typeof event.error === 'object' && event.error !== null
        ? Reflect.get(event.error, 'url')
        : null
    if (url !== BASEMAP_STYLE) return
    map.off('error', onStyleError)
    map.setStyle(FALLBACK_STYLE)
  }
  map.on('error', onStyleError)

  const start = () => {
    if (sync !== null || !map.isStyleLoaded()) return
    if (!map.hasImage(WIND_ARROW_IMAGE)) map.addImage(WIND_ARROW_IMAGE, createArrowImage())
    sync = createMapSync(createMapPort(map), {
      subscribe: subscribeToLayers,
      getIds: () => getActiveRegistry().ids,
      getConfig: getLayerConfig,
    })
  }
  map.on('load', start)
  map.on('style.load', start)

  map.on('click', (event) => {
    const values = sync?.valuesAt(event.lngLat.lng, event.lngLat.lat) ?? []
    if (values.length === 0) return
    new Popup({ closeButton: true })
      .setLngLat(event.lngLat)
      .setText(formatPointValues(values))
      .addTo(map)
  })

  return {
    destroy: () => {
      sync?.dispose()
      map.remove()
    },
  }
}
