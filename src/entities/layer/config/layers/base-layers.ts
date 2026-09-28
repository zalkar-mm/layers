import type { LayerConfig, LayerId } from '../../model/state/types'
import { unsafeToLayerId } from '../registry/layer-id'
import { createLayerRegistry } from '../registry/layer-registry'

type LayerDraft = Omit<LayerConfig, 'id'>

const BASE_LAYERS = {
  temperature: {
    title: 'Температура',
    unit: '°C',
    valueRange: [-20, 40],
    palette: ['#2166ac', '#67a9cf', '#f7f7f7', '#ef8a62', '#b2182b'],
    render: 'fill',
    defaultOpacity: 0.7,
  },
  wind: {
    title: 'Ветер',
    unit: 'м/с',
    valueRange: [0, 25],
    palette: ['#deebf7', '#9ecae1', '#4292c6', '#08519c'],
    render: 'arrows',
    defaultOpacity: 0.9,
  },
  insolation: {
    title: 'Инсоляция',
    unit: 'кВт·ч/м²·день',
    valueRange: [1, 7],
    palette: ['#fff7bc', '#fec44f', '#fe9929', '#ec7014'],
    render: 'fill',
    defaultOpacity: 0.6,
  },
} as const satisfies Record<string, LayerDraft>

export type BaseLayerKey = keyof typeof BASE_LAYERS

const isBaseLayerKey = (key: string): key is BaseLayerKey => key in BASE_LAYERS

export const BASE_LAYER_KEYS: readonly BaseLayerKey[] =
  Object.keys(BASE_LAYERS).filter(isBaseLayerKey)

export const layerId = (key: BaseLayerKey): LayerId => unsafeToLayerId(key)

export const BASE_LAYER_CONFIGS: readonly LayerConfig[] = BASE_LAYER_KEYS.map((key) => ({
  id: layerId(key),
  ...BASE_LAYERS[key],
}))

export const baseLayerRegistry = createLayerRegistry(BASE_LAYER_CONFIGS)
