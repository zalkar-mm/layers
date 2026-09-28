import { bindVedroStore } from '@/shared/lib/vedro'

import { type LayerRowView, toLayerRowView } from '../../lib/row-view'
import type { LayerCacheStats } from '../loading/cache'
import type { LayerEvent } from '../loading/event-log'
import { layerCacheStatsStore, layerEventLog } from '../runtime'
import type { LayerId } from '../state/types'
import { layerStore } from '../store/layer-store'

import {
  type LayerMapStatus,
  type MapOverlayView,
  mapStatusOf,
  selectMapOverlay,
} from './map-status'
import { createSummarySelector, type LayersSummary } from './summary'

const layerBinding = bindVedroStore(layerStore)
const eventsBinding = bindVedroStore(layerEventLog.store)
const cacheStatsBinding = bindVedroStore(layerCacheStatsStore)

export const LayerStoreProvider = layerBinding.Provider
export const LayerEventsProvider = eventsBinding.Provider
export const LayerCacheStatsProvider = cacheStatsBinding.Provider

const useLayerSelector = layerBinding.useSelector

export const useLayerRow = (id: LayerId): LayerRowView =>
  useLayerSelector((state) => toLayerRowView(state.byId[id]))

export const useLayerIds = (): readonly LayerId[] => useLayerSelector((state) => state.ids)

const selectSummary = createSummarySelector()

export const useLayersSummary = (): LayersSummary => useLayerSelector(selectSummary)

export const useMapOverlay = (limit: number): MapOverlayView =>
  useLayerSelector((state) => selectMapOverlay(state, limit))

export const useLayerMapStatus = (id: LayerId): LayerMapStatus =>
  useLayerSelector((state) => mapStatusOf(state.byId[id]))

export const useLayerEvents = (): readonly LayerEvent[] =>
  eventsBinding.useSelector((state) => state.events)

export const useCacheStats = (): LayerCacheStats =>
  cacheStatsBinding.useSelector(({ size, limit }) => ({ size, limit }))
