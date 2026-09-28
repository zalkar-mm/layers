import type { LayerConfig, LayerState } from './types'

export const createInitialLayerState = (config: LayerConfig): LayerState => ({
  enabled: false,
  opacity: config.defaultOpacity,
  load: { kind: 'idle' },
})
