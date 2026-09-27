import type { ApiErrorKind, LayerData } from '@/shared/api'

export type LayerId = string & { readonly __brand: 'LayerId' }

export type LayerRenderKind = 'fill' | 'arrows' | 'heatmap'

export type LayerConfig = {
  readonly id: LayerId
  readonly title: string
  readonly unit: string
  readonly valueRange: readonly [min: number, max: number]
  readonly palette: readonly string[]
  readonly render: LayerRenderKind
  readonly defaultOpacity: number
}

export type { LayerData }

export type LayerErrorKind = ApiErrorKind

export type LayerError = {
  readonly kind: LayerErrorKind
  readonly message: string
}

export type CachedData = {
  readonly data: LayerData
  readonly loadedAt: number
}

export type LoadState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'loading'
      readonly requestId: number
      readonly startedAt: number
      readonly stale: CachedData | null
    }
  | {
      readonly kind: 'success'
      readonly data: LayerData
      readonly loadedAt: number
      readonly durationMs: number
      readonly source: 'network'
    }
  | {
      readonly kind: 'error'
      readonly error: LayerError
      readonly attempt: number
      readonly stale: CachedData | null
    }

export type LoadStateKind = LoadState['kind']

export type LayerState = {
  readonly enabled: boolean
  readonly opacity: number
  readonly load: LoadState
}
