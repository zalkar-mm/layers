import type { LayerState } from '../model/state/types'

export type LayerRowStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly staleLoadedAt: number | null }
  | { readonly kind: 'success'; readonly durationMs: number }
  | {
      readonly kind: 'error'
      readonly staleLoadedAt: number | null
      readonly errorMessage: string
      readonly attempt: number
    }

export type LayerRowView = {
  readonly enabled: boolean
  readonly opacity: number
} & LayerRowStatus

const MISSING_LAYER_VIEW: LayerRowView = { enabled: false, opacity: 0, kind: 'idle' }

export const toLayerRowView = (layer: LayerState | undefined): LayerRowView => {
  if (layer === undefined) return MISSING_LAYER_VIEW
  const { enabled, opacity, load } = layer
  switch (load.kind) {
    case 'idle':
      return { enabled, opacity, kind: 'idle' }
    case 'loading':
      return { enabled, opacity, kind: 'loading', staleLoadedAt: load.stale?.loadedAt ?? null }
    case 'success':
      return { enabled, opacity, kind: 'success', durationMs: load.durationMs }
    case 'error':
      return {
        enabled,
        opacity,
        kind: 'error',
        staleLoadedAt: load.stale?.loadedAt ?? null,
        errorMessage: load.error.message,
        attempt: load.attempt,
      }
  }
}
