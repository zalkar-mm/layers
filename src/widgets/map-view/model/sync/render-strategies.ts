import type { LayerConfig, LayerData, LayerRenderKind } from '@/entities/layer'

import { cellCentroids } from '../../lib/cell-centroids'
import type { MapLayerKind, MapSourceData, PaintPropertyName } from '../map/map-port'

import { arrowsStyle, fillStyle, heatmapStyle, type StyleProperties } from './layer-style'

export type RenderStrategy = {
  readonly mapLayerKind: MapLayerKind
  readonly opacityProperty: PaintPropertyName
  readonly stackRank: number
  readonly style: (config: LayerConfig, opacity: number) => StyleProperties
  readonly toSourceData: (data: LayerData) => MapSourceData
}

export type RenderStrategies = Readonly<Record<LayerRenderKind, RenderStrategy>>

const asIs = (data: LayerData): MapSourceData => data

export const RENDER_STRATEGIES: RenderStrategies = {
  fill: {
    mapLayerKind: 'fill',
    opacityProperty: 'fill-opacity',
    stackRank: 0,
    style: fillStyle,
    toSourceData: asIs,
  },
  heatmap: {
    mapLayerKind: 'heatmap',
    opacityProperty: 'heatmap-opacity',
    stackRank: 1,
    style: heatmapStyle,
    toSourceData: cellCentroids,
  },
  arrows: {
    mapLayerKind: 'symbol',
    opacityProperty: 'icon-opacity',
    stackRank: 2,
    style: arrowsStyle,
    toSourceData: asIs,
  },
}

export const renderStrategy = (config: LayerConfig): RenderStrategy =>
  RENDER_STRATEGIES[config.render]
