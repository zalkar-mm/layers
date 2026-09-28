import { createVedroStore } from '@/shared/lib/vedro'

import { createLayerApi } from '../api/layer-api'
import type { LayerRegistry } from '../config/registry/layer-registry'

import { createLayerCache, DEFAULT_CACHE_SETTINGS, type LayerCacheStats } from './loading/cache'
import { createEventLog } from './loading/event-log'
import { createLayerService } from './loading/layer-service/layer-service'
import { withOpacity } from './state/transitions'
import type { LayerId } from './state/types'
import { getActiveRegistry, layerStore, setActiveRegistry } from './store/layer-store'
import { updateLayers } from './store/store'

const now = () => Date.now()

const RESPONSE_BATCH_WINDOW_MS = 16

export const layerApi = createLayerApi({ findConfig: (id) => getActiveRegistry().find(id) })

export const layerCacheStatsStore = createVedroStore<LayerCacheStats>('layer-cache-stats', {
  size: 0,
  limit: DEFAULT_CACHE_SETTINGS.limit,
})

export const layerCache = createLayerCache({
  now,
  onStatsChange: (stats) => {
    layerCacheStatsStore.dispatch(stats)
  },
})

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
