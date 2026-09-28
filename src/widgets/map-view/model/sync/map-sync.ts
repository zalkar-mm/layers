import {
  type LayerConfig,
  type LayerData,
  type LayerId,
  type LayersById,
  type LayerState,
  visibleData,
} from '@/entities/layer'

import type { PointValue } from '../../lib/point-values'
import type { MapPort } from '../map/map-port'

import { mapLayerId, mapSourceId } from './layer-style'
import { renderStrategy } from './render-strategies'

const firstEnabled = (ids: readonly LayerId[], byId: LayersById, limit: number): Set<LayerId> => {
  const result = new Set<LayerId>()
  for (const id of ids) {
    if (result.size >= limit) break
    if (byId[id]?.enabled === true) result.add(id)
  }

  return result
}

type Ring = readonly (readonly number[])[]

const ringContains = (ring: Ring, lng: number, lat: number): boolean => {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity
  for (const [pointLng = NaN, pointLat = NaN] of ring) {
    if (pointLng < west) west = pointLng
    if (pointLng > east) east = pointLng
    if (pointLat < south) south = pointLat
    if (pointLat > north) north = pointLat
  }

  return lng >= west && lng < east && lat >= south && lat < north
}

const findCell = (data: LayerData, lng: number, lat: number) =>
  data.features.find((feature) => ringContains(feature.geometry.coordinates[0] ?? [], lng, lat))
    ?.properties

export const MAP_LAYER_LIMIT = 10

type Applied = {
  readonly layer: LayerState
  readonly data: LayerData
  readonly config: LayerConfig
}

type Dependencies = {
  readonly subscribe: (listener: (byId: LayersById) => void) => () => void
  readonly getIds: () => readonly LayerId[]
  readonly getConfig: (id: LayerId) => LayerConfig
  readonly limit?: number
}

export const createMapSync = (
  port: MapPort,
  { subscribe, getIds, getConfig, limit = MAP_LAYER_LIMIT }: Dependencies,
) => {
  const applied = new Map<LayerId, Applied>()

  const remove = (id: LayerId) => {
    port.removeLayer(mapLayerId(id))
    port.removeSource(mapSourceId(id))
    applied.delete(id)
  }

  const add = (id: LayerId, layer: LayerState, data: LayerData) => {
    const config = getConfig(id)
    const strategy = renderStrategy(config)
    const layerId = mapLayerId(id)
    port.addSource(mapSourceId(id), strategy.toSourceData(data))
    port.addLayer(layerId, strategy.mapLayerKind, mapSourceId(id))
    const style = strategy.style(config, layer.opacity)
    for (const [name, value] of style.layout) port.setLayoutProperty(layerId, name, value)
    for (const [name, value] of style.paint) port.setPaintProperty(layerId, name, value)
    applied.set(id, { layer, data, config })
  }

  const update = (id: LayerId, previous: Applied, layer: LayerState, data: LayerData) => {
    const strategy = renderStrategy(previous.config)
    if (previous.data !== data) port.setSourceData(mapSourceId(id), strategy.toSourceData(data))
    if (previous.layer.opacity !== layer.opacity) {
      port.setPaintProperty(mapLayerId(id), strategy.opacityProperty, layer.opacity)
    }
    applied.set(id, { ...previous, layer, data })
  }

  const reorder = (ids: readonly LayerId[]) => {
    const ranked = ids.flatMap((id) => {
      const entry = applied.get(id)

      return entry === undefined ? [] : [{ id, rank: renderStrategy(entry.config).stackRank }]
    })
    ranked.sort((first, second) => first.rank - second.rank)
    for (const { id } of ranked) port.moveLayer(mapLayerId(id))
  }

  const sync = (byId: LayersById) => {
    const ids = getIds()
    const allowed = firstEnabled(ids, byId, limit)
    let added = false

    for (const id of [...applied.keys()]) {
      if (!allowed.has(id)) remove(id)
    }

    for (const id of allowed) {
      const layer = byId[id]
      if (layer === undefined) continue
      const previous = applied.get(id)
      if (previous?.layer === layer) continue
      const data = visibleData(layer.load)?.data ?? null
      if (data === null) {
        if (previous !== undefined) remove(id)
        continue
      }
      if (previous === undefined) {
        add(id, layer, data)
        added = true
      } else {
        update(id, previous, layer, data)
      }
    }

    if (added) reorder(ids)
  }

  const unsubscribe = subscribe(sync)

  return {
    renderedLayerIds: (): string[] => [...applied.keys()].map(mapLayerId),
    valuesAt: (lng: number, lat: number): PointValue[] =>
      getIds().flatMap((id) => {
        const entry = applied.get(id)
        const cell = entry === undefined ? undefined : findCell(entry.data, lng, lat)
        if (entry === undefined || cell === undefined) return []

        return [{ config: entry.config, value: cell.value, direction: cell.direction }]
      }),
    dispose: () => {
      unsubscribe()
      for (const id of [...applied.keys()]) remove(id)
    },
  }
}

export type MapSync = ReturnType<typeof createMapSync>
