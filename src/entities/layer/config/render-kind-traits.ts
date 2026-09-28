import type { LayerRenderKind } from '../model/state/types'

export type RenderKindTraits = {
  readonly withDirection: boolean
}

export type RenderKindTraitsMap = Readonly<Record<LayerRenderKind, RenderKindTraits>>

export const RENDER_KIND_TRAITS: RenderKindTraitsMap = {
  fill: { withDirection: false },
  arrows: { withDirection: true },
  heatmap: { withDirection: false },
}
