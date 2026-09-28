import { subscribeToKey, type Unsubscribe } from '@/shared/lib/vedro'

import { baseLayerRegistry } from '../../config/layers/base-layers'
import type { LayerRegistry } from '../../config/registry/layer-registry'
import type { LayerConfig, LayerId } from '../state/types'

import { createLayerStore, type LayersById, replaceLayers } from './store'

let activeRegistry: LayerRegistry = baseLayerRegistry

export const layerStore = createLayerStore(activeRegistry)

export const getLayerConfig = (id: LayerId): LayerConfig => activeRegistry.get(id)

export const getActiveRegistry = (): LayerRegistry => activeRegistry

export const setActiveRegistry = (registry: LayerRegistry): void => {
  activeRegistry = registry
  replaceLayers(layerStore, registry)
}

export const subscribeToLayers = (
  listener: (byId: LayersById, prev: LayersById | undefined) => void,
): Unsubscribe => subscribeToKey(layerStore, 'byId', listener)
