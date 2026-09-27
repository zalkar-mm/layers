import { createVedroStore, type Vedro } from '@/shared/lib/vedro'

import type { LayerRegistry } from '../config/layer-registry'

import { createInitialLayerState } from './initial-state'
import type { LayerId, LayerState } from './types'

export type LayersById = Readonly<Record<LayerId, LayerState>>

export type LayersState = {
  readonly ids: readonly LayerId[]
  readonly byId: LayersById
}

export type LayerStore = Vedro<LayersState>

export const createLayersState = (registry: LayerRegistry): LayersState => {
  const byId: Record<LayerId, LayerState> = {}
  for (const id of registry.ids) byId[id] = createInitialLayerState(registry.get(id))

  return { ids: registry.ids, byId }
}

export const createLayerStore = (registry: LayerRegistry): LayerStore =>
  createVedroStore('layers', createLayersState(registry))

export type LayerUpdater = (layer: LayerState, id: LayerId) => LayerState

export const updateLayers = (
  store: LayerStore,
  ids: readonly LayerId[],
  updater: LayerUpdater,
): void => {
  const current = store.get('byId')
  let next: Record<LayerId, LayerState> | null = null

  for (const id of ids) {
    const layer = current[id]
    if (layer === undefined) continue
    const updated = updater(layer, id)
    if (updated === layer) continue
    next ??= { ...current }
    next[id] = updated
  }

  if (next !== null) store.dispatch({ byId: next })
}

export const updateLayer = (store: LayerStore, id: LayerId, updater: LayerUpdater): void => {
  updateLayers(store, [id], updater)
}

export const replaceLayers = (store: LayerStore, registry: LayerRegistry): void => {
  store.dispatch(createLayersState(registry))
}
