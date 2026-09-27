import type { ExpressionSpecification } from 'maplibre-gl'

import type { LayerConfig, LayerId } from '@/entities/layer'

import type {
  LayoutPropertyName,
  LayoutPropertyValue,
  MapLayerKind,
  PaintPropertyName,
  PaintPropertyValue,
} from './map-port'

export const WIND_ARROW_IMAGE = 'wind-arrow'

export const mapLayerId = (id: LayerId): string => `layer:${id}`
export const mapSourceId = (id: LayerId): string => `source:${id}`

export const mapLayerKind = (config: LayerConfig): MapLayerKind =>
  config.render === 'arrows' ? 'symbol' : 'fill'

export const opacityProperty = (config: LayerConfig): PaintPropertyName =>
  config.render === 'arrows' ? 'icon-opacity' : 'fill-opacity'

export const colorRamp = (config: LayerConfig): ExpressionSpecification => {
  const [min, max] = config.valueRange
  const last = Math.max(1, config.palette.length - 1)
  const stops = config.palette.flatMap((color, index) => [
    min + ((max - min) * index) / last,
    color,
  ])

  return ['interpolate', ['linear'], ['get', 'value'], ...stops]
}

export type StyleProperties = {
  readonly paint: readonly (readonly [PaintPropertyName, PaintPropertyValue])[]
  readonly layout: readonly (readonly [LayoutPropertyName, LayoutPropertyValue])[]
}

export const layerStyle = (config: LayerConfig, opacity: number): StyleProperties => {
  if (config.render === 'arrows') {
    const [min, max] = config.valueRange

    return {
      layout: [
        ['visibility', 'visible'],
        ['icon-image', WIND_ARROW_IMAGE],
        ['icon-rotate', ['get', 'direction']],
        ['icon-rotation-alignment', 'map'],
        ['icon-size', ['interpolate', ['linear'], ['get', 'value'], min, 0.35, max, 0.9]],
        ['icon-allow-overlap', false],
        ['icon-padding', 1],
      ],
      paint: [['icon-opacity', opacity]],
    }
  }

  return {
    layout: [['visibility', 'visible']],
    paint: [
      ['fill-color', colorRamp(config)],
      ['fill-opacity', opacity],
      ['fill-outline-color', 'rgba(0, 0, 0, 0)'],
    ],
  }
}
