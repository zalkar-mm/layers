import type { ExpressionSpecification } from 'maplibre-gl'

import type { LayerConfig, LayerId } from '@/entities/layer'

import type {
  LayoutPropertyName,
  LayoutPropertyValue,
  PaintPropertyName,
  PaintPropertyValue,
} from '../map/map-port'

export const WIND_ARROW_IMAGE = 'wind-arrow'

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

const HEATMAP_INTENSITY = 0.5

const HEATMAP_VISIBLE_DENSITY = 0.02

const ARROW_SIZE_RANGE = { min: 0.35, max: 0.9 } as const

const ARROW_ICON_PADDING = 1

const HEATMAP_RADIUS_EXPONENT = 2

const HEATMAP_RADIUS_STOPS = {
  minZoom: 4,
  minRadius: 12,
  maxZoom: 8,
  maxRadius: 192,
} as const

export const mapLayerId = (id: LayerId): string => `layer:${id}`
export const mapSourceId = (id: LayerId): string => `source:${id}`

export type StyleProperties = {
  readonly paint: readonly (readonly [PaintPropertyName, PaintPropertyValue])[]
  readonly layout: readonly (readonly [LayoutPropertyName, LayoutPropertyValue])[]
}

export const colorRamp = (config: LayerConfig): ExpressionSpecification => {
  const [min, max] = config.valueRange
  const last = Math.max(1, config.palette.length - 1)
  const stops = config.palette.flatMap((color, index) => [
    min + ((max - min) * index) / last,
    color,
  ])

  return ['interpolate', ['linear'], ['get', 'value'], ...stops]
}

const normalizedValue = (config: LayerConfig): ExpressionSpecification => {
  const [min, max] = config.valueRange

  return ['interpolate', ['linear'], ['get', 'value'], min, 0, max, 1]
}

const densityRamp = (config: LayerConfig): ExpressionSpecification => {
  const last = Math.max(1, config.palette.length - 1)
  const stops = config.palette.flatMap((color, index) => [
    HEATMAP_VISIBLE_DENSITY + ((1 - HEATMAP_VISIBLE_DENSITY) * index) / last,
    color,
  ])

  return ['interpolate', ['linear'], ['heatmap-density'], 0, TRANSPARENT, ...stops]
}

const heatmapRadius = (): ExpressionSpecification => {
  const { minZoom, minRadius, maxZoom, maxRadius } = HEATMAP_RADIUS_STOPS

  return [
    'interpolate',
    ['exponential', HEATMAP_RADIUS_EXPONENT],
    ['zoom'],
    minZoom,
    minRadius,
    maxZoom,
    maxRadius,
  ]
}

export const fillStyle = (config: LayerConfig, opacity: number): StyleProperties => ({
  layout: [['visibility', 'visible']],
  paint: [
    ['fill-color', colorRamp(config)],
    ['fill-opacity', opacity],
    ['fill-outline-color', TRANSPARENT],
  ],
})

export const arrowsStyle = (config: LayerConfig, opacity: number): StyleProperties => {
  const [min, max] = config.valueRange

  return {
    layout: [
      ['visibility', 'visible'],
      ['icon-image', WIND_ARROW_IMAGE],
      ['icon-rotate', ['get', 'direction']],
      ['icon-rotation-alignment', 'map'],
      [
        'icon-size',
        [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          min,
          ARROW_SIZE_RANGE.min,
          max,
          ARROW_SIZE_RANGE.max,
        ],
      ],
      ['icon-allow-overlap', false],
      ['icon-padding', ARROW_ICON_PADDING],
    ],
    paint: [['icon-opacity', opacity]],
  }
}

export const heatmapStyle = (config: LayerConfig, opacity: number): StyleProperties => ({
  layout: [['visibility', 'visible']],
  paint: [
    ['heatmap-weight', normalizedValue(config)],
    ['heatmap-color', densityRamp(config)],
    ['heatmap-radius', heatmapRadius()],
    ['heatmap-intensity', HEATMAP_INTENSITY],
    ['heatmap-opacity', opacity],
  ],
})
