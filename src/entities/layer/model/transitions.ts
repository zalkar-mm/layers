import type { CachedData, LayerData, LayerError, LayerState, LoadState } from './types'

const IDLE: LoadState = { kind: 'idle' }

export const isCurrentRequest = (layer: LayerState, requestId: number): boolean =>
  layer.load.kind === 'loading' && layer.load.requestId === requestId

export const visibleData = (load: LoadState): CachedData | null => {
  switch (load.kind) {
    case 'idle':
      return null
    case 'loading':
    case 'error':
      return load.stale
    case 'success':
      return { data: load.data, loadedAt: load.loadedAt }
  }
}

export const startLoading = (
  layer: LayerState,
  request: { requestId: number; startedAt: number; stale: CachedData | null },
): LayerState => ({
  ...layer,
  enabled: true,
  load: { kind: 'loading', ...request },
})

export const completeLoading = (
  layer: LayerState,
  requestId: number,
  data: LayerData,
  loadedAt: number,
): LayerState => {
  if (layer.load.kind !== 'loading' || layer.load.requestId !== requestId) return layer

  return {
    ...layer,
    load: {
      kind: 'success',
      data,
      loadedAt,
      durationMs: loadedAt - layer.load.startedAt,
      source: 'network',
    },
  }
}

export const failLoading = (
  layer: LayerState,
  requestId: number,
  error: LayerError,
  attempt: number,
): LayerState => {
  if (layer.load.kind !== 'loading' || layer.load.requestId !== requestId) return layer

  return { ...layer, load: { kind: 'error', error, attempt, stale: layer.load.stale } }
}

export const turnOff = (layer: LayerState): LayerState =>
  !layer.enabled && layer.load.kind === 'idle' ? layer : { ...layer, enabled: false, load: IDLE }

export const clampOpacity = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

export const withOpacity = (layer: LayerState, value: number): LayerState => {
  const opacity = clampOpacity(value)

  return opacity === layer.opacity ? layer : { ...layer, opacity }
}
