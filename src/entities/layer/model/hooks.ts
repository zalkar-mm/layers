import { useSyncExternalStore } from 'react'

import { createStoreSubscribe } from '@/shared/lib/vedro'

import { layerStore } from './layer-store'
import { createEnabledIdsSelector, type LayerMapStatus, mapStatusOf } from './map-status'
import { createSummarySelector, type LayersSummary } from './summary'
import type { LayerId, LayerState } from './types'

const subscribe = createStoreSubscribe(layerStore)

const getIds = () => layerStore.get('ids')

const selectSummary = createSummarySelector()
const getSummary = () => selectSummary({ ids: layerStore.get('ids'), byId: layerStore.get('byId') })

export const useLayer = (id: LayerId): LayerState => {
  const layer = useSyncExternalStore(subscribe, () => layerStore.get('byId')[id])
  if (layer === undefined) throw new Error(`Слой ${id} отсутствует в сторе`)

  return layer
}

export const useLayerIds = (): readonly LayerId[] => useSyncExternalStore(subscribe, getIds)

export const useLayersSummary = (): LayersSummary => useSyncExternalStore(subscribe, getSummary)

const selectEnabledIds = createEnabledIdsSelector()
const getEnabledIds = () =>
  selectEnabledIds({ ids: layerStore.get('ids'), byId: layerStore.get('byId') })

export const useEnabledLayerIds = (): readonly LayerId[] =>
  useSyncExternalStore(subscribe, getEnabledIds)

export const useLayerMapStatus = (id: LayerId): LayerMapStatus =>
  useSyncExternalStore(subscribe, () => mapStatusOf(layerStore.get('byId')[id]))
