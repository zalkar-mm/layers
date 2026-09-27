import { useSyncExternalStore } from 'react'

import { createStoreSubscribe } from '@/shared/lib/vedro'

import { layerApi } from '../api/layer-api'
import type { LayerRegistry } from '../config/layer-registry'

import { createLayerCache, type LayerCacheStats } from './cache'
import { createEventLog, type LayerEvent } from './event-log'
import { createLayerService } from './layer-service'
import { getActiveRegistry, layerStore, setActiveRegistry } from './layer-store'
import { updateLayers } from './store'
import { withOpacity } from './transitions'
import type { LayerId } from './types'

const now = () => Date.now()

const RESPONSE_BATCH_WINDOW_MS = 16

export const layerCache = createLayerCache({ now })

export const layerEventLog = createEventLog()

export const layerCommands = createLayerService({
  store: layerStore,
  fetchLayerData: layerApi.fetchLayerData,
  cache: layerCache,
  now,
  onEvents: layerEventLog.push,
  scheduleBulkRequests: (task) => {
    setTimeout(task, 0)
  },
  scheduleResponseFlush: (flush) => {
    setTimeout(flush, RESPONSE_BATCH_WINDOW_MS)
  },
})

type LayerSnapshot = ReadonlyMap<LayerId, { readonly enabled: boolean; readonly opacity: number }>

const snapshots = new WeakMap<LayerRegistry, LayerSnapshot>()

const takeSnapshot = (): LayerSnapshot => {
  const byId = layerStore.get('byId')
  const snapshot = new Map<LayerId, { enabled: boolean; opacity: number }>()
  for (const id of layerStore.get('ids')) {
    const layer = byId[id]
    if (layer !== undefined) snapshot.set(id, { enabled: layer.enabled, opacity: layer.opacity })
  }

  return snapshot
}

const restoreSnapshot = (snapshot: LayerSnapshot): void => {
  const ids = [...snapshot.keys()]
  updateLayers(layerStore, ids, (layer, id) => {
    const saved = snapshot.get(id)

    return saved === undefined ? layer : withOpacity(layer, saved.opacity)
  })
  layerCommands.enableLayers(ids.filter((id) => snapshot.get(id)?.enabled === true))
}

type SwitchOptions = {
  readonly restore?: boolean
}

export const switchLayerSet = (
  registry: LayerRegistry,
  { restore = false }: SwitchOptions = {},
): void => {
  snapshots.set(getActiveRegistry(), takeSnapshot())
  layerCommands.cancelAll()
  setActiveRegistry(registry)
  const saved = restore ? snapshots.get(registry) : undefined
  if (saved !== undefined) restoreSnapshot(saved)
}

const subscribeEvents = createStoreSubscribe(layerEventLog.store)
const getEvents = () => layerEventLog.store.get('events')

export const useLayerEvents = (): readonly LayerEvent[] =>
  useSyncExternalStore(subscribeEvents, getEvents)

export const useCacheStats = (): LayerCacheStats =>
  useSyncExternalStore(layerCache.subscribe, layerCache.getStats)
