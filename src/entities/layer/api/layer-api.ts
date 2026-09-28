import { createMockLayerApi, type LayerDataRequest, type MockLayerApi } from '@/shared/api'

import { RENDER_KIND_TRAITS } from '../config/render-kind-traits'
import type { LayerConfig } from '../model/state/types'

export const toLayerDataRequest = (config: LayerConfig): LayerDataRequest => ({
  valueRange: config.valueRange,
  withDirection: RENDER_KIND_TRAITS[config.render].withDirection,
})

type LayerApiDependencies = {
  readonly findConfig: (id: string) => LayerConfig | undefined
}

export const createLayerApi = ({ findConfig }: LayerApiDependencies): MockLayerApi =>
  createMockLayerApi({
    describeLayer: (id) => {
      const config = findConfig(id)
      if (config === undefined) throw new Error(`Слой ${id} не найден в реестре`)

      return toLayerDataRequest(config)
    },
  })
