import type { LayersState } from './store'

export type LayersSummary = {
  readonly total: number
  readonly enabled: number
  readonly loading: number
  readonly failed: number
}

export const createSummarySelector = () => {
  let lastInput: Pick<LayersState, 'ids' | 'byId'> | null = null
  let lastSummary: LayersSummary = { total: 0, enabled: 0, loading: 0, failed: 0 }

  return (state: Pick<LayersState, 'ids' | 'byId'>): LayersSummary => {
    if (lastInput?.ids === state.ids && lastInput.byId === state.byId) return lastSummary
    lastInput = state

    let enabled = 0
    let loading = 0
    let failed = 0
    for (const id of state.ids) {
      const layer = state.byId[id]
      if (layer === undefined) continue
      if (layer.enabled) enabled += 1
      if (layer.load.kind === 'loading') loading += 1
      if (layer.load.kind === 'error') failed += 1
    }
    const total = state.ids.length

    if (
      lastSummary.total !== total ||
      lastSummary.enabled !== enabled ||
      lastSummary.loading !== loading ||
      lastSummary.failed !== failed
    ) {
      lastSummary = { total, enabled, loading, failed }
    }

    return lastSummary
  }
}
