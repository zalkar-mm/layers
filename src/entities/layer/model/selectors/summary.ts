import type { LayersById, LayersState } from '../store/store'

export type LayersSummary = {
  readonly total: number
  readonly enabled: number
  readonly loading: number
  readonly failed: number
}

const EMPTY_SUMMARY: LayersSummary = { total: 0, enabled: 0, loading: 0, failed: 0 }

export const createSummarySelector = () => {
  const computed = new WeakMap<LayersById, { ids: LayersState['ids']; summary: LayersSummary }>()
  let lastSummary = EMPTY_SUMMARY

  return (state: Pick<LayersState, 'ids' | 'byId'>): LayersSummary => {
    const hit = computed.get(state.byId)
    if (hit?.ids === state.ids) return hit.summary

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
    computed.set(state.byId, { ids: state.ids, summary: lastSummary })

    return lastSummary
  }
}
