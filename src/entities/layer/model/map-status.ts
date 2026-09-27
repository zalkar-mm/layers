import type { LayersState } from './store'
import { visibleData } from './transitions'
import type { LayerId, LayerState } from './types'

export type LayerMapStatus = 'off' | 'loading' | 'shown' | 'failed'

export const mapStatusOf = (layer: LayerState | undefined): LayerMapStatus => {
  if (!layer?.enabled) return 'off'
  if (visibleData(layer.load) !== null) return 'shown'
  switch (layer.load.kind) {
    case 'loading':
      return 'loading'
    case 'error':
      return 'failed'
    case 'idle':
    case 'success':
      return 'off'
  }
}

export const createEnabledIdsSelector = () => {
  let lastInput: Pick<LayersState, 'ids' | 'byId'> | null = null
  let lastResult: readonly LayerId[] = []

  return (state: Pick<LayersState, 'ids' | 'byId'>): readonly LayerId[] => {
    if (lastInput?.ids === state.ids && lastInput.byId === state.byId) return lastResult
    lastInput = state
    const next = state.ids.filter((id) => state.byId[id]?.enabled === true)
    const same =
      next.length === lastResult.length && next.every((id, index) => id === lastResult[index])
    if (!same) lastResult = next

    return lastResult
  }
}
