import { visibleData } from '../state/transitions'
import type { LayerId, LayerState, LoadStateKind } from '../state/types'
import type { LayersById, LayersState } from '../store/store'

export type LayerMapStatus = 'off' | 'loading' | 'shown' | 'failed'

const STATUS_WITHOUT_DATA: Readonly<Record<LoadStateKind, LayerMapStatus>> = {
  loading: 'loading',
  error: 'failed',
  idle: 'off',
  success: 'off',
}

export const mapStatusOf = (layer: LayerState | undefined): LayerMapStatus => {
  if (!layer?.enabled) return 'off'
  if (visibleData(layer.load) !== null) return 'shown'

  return STATUS_WITHOUT_DATA[layer.load.kind]
}

export type MapOverlayView = {
  readonly shownIds: readonly LayerId[]
  readonly enabledCount: number
}

const overlayViews = new WeakMap<
  LayersById,
  { readonly ids: LayersState['ids']; readonly limit: number; readonly view: MapOverlayView }
>()

export const selectMapOverlay = (
  state: Pick<LayersState, 'ids' | 'byId'>,
  limit: number,
): MapOverlayView => {
  const hit = overlayViews.get(state.byId)
  if (hit?.ids === state.ids && hit.limit === limit) return hit.view
  const shownIds: LayerId[] = []
  let enabledCount = 0
  for (const id of state.ids) {
    if (state.byId[id]?.enabled !== true) continue
    enabledCount += 1
    if (shownIds.length < limit) shownIds.push(id)
  }
  const view = { shownIds, enabledCount }
  overlayViews.set(state.byId, { ids: state.ids, limit, view })

  return view
}
