import type { LayerConfig } from '../../model/state/types'
import { unsafeToLayerId } from '../registry/layer-id'

import { BASE_LAYER_CONFIGS } from './base-layers'

export const syntheticLayerId = (index: number) =>
  unsafeToLayerId(`synthetic-${String(index).padStart(3, '0')}`)

export const createSyntheticLayerConfigs = (count: number): readonly LayerConfig[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const base = BASE_LAYER_CONFIGS[index % BASE_LAYER_CONFIGS.length]
    if (base === undefined) throw new Error('Реестр реальных слоёв пуст')

    return {
      ...base,
      id: syntheticLayerId(number),
      title: `Слой ${String(number).padStart(3, '0')} · ${base.title}`,
      render: 'fill',
    }
  })
