import type { LayerConfig, LayerId } from '../model/types'

export type LayerRegistry = {
  readonly ids: readonly LayerId[]
  readonly get: (id: LayerId) => LayerConfig
  readonly find: (value: string) => LayerConfig | undefined
}

export const createLayerRegistry = (configs: readonly LayerConfig[]): LayerRegistry => {
  const byId = new Map<string, LayerConfig>()
  for (const config of configs) {
    if (byId.has(config.id)) {
      throw new Error(`Дублирующийся id слоя в реестре: ${config.id}`)
    }
    byId.set(config.id, config)
  }

  return {
    ids: configs.map((config) => config.id),
    get: (id) => {
      const config = byId.get(id)
      if (config === undefined) {
        throw new Error(`Слой ${id} не найден в реестре`)
      }

      return config
    },
    find: (value) => byId.get(value),
  }
}
