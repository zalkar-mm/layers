import { createMockLayerApi } from '@/shared/api'

import { getActiveRegistry } from '../model/layer-store'

export const layerApi = createMockLayerApi({
  describeLayer: (id) => {
    const config = getActiveRegistry().find(id)
    if (config === undefined) throw new Error(`Слой ${id} не найден в реестре`)

    return { valueRange: config.valueRange, withDirection: config.render === 'arrows' }
  },
})
