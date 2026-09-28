import { type ComponentType, memo } from 'react'

import styled from 'styled-components'

import {
  getLayerConfig,
  type LayerConfig,
  type LayerId,
  LayerLegend,
  type LayerMapStatus,
  useLayerMapStatus,
  useMapOverlay,
} from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

import { MAP_LAYER_LIMIT } from '../model/sync/map-sync'

const OVERLAY_WIDTH = '220px'

export function MapOverlay() {
  const { shownIds, enabledCount } = useMapOverlay(MAP_LAYER_LIMIT)

  return (
    <Overlay>
      {shownIds.map((id) => (
        <OverlayItem key={id} id={id} />
      ))}
      <LayerLimitNote enabledCount={enabledCount} />
    </Overlay>
  )
}

type LayerLimitNoteProps = {
  readonly enabledCount: number
}

function LayerLimitNote({ enabledCount }: LayerLimitNoteProps) {
  if (enabledCount <= MAP_LAYER_LIMIT) return null

  return (
    <Note>
      На карте первые {MAP_LAYER_LIMIT} из {enabledCount} включённых слоёв
    </Note>
  )
}

type OverlayItemProps = {
  readonly id: LayerId
}

type OverlayViewProps = {
  readonly id: LayerId
  readonly config: LayerConfig
}

const OVERLAY_VIEWS: Readonly<Record<LayerMapStatus, ComponentType<OverlayViewProps> | null>> = {
  shown: LegendCard,
  loading: LoadingChip,
  off: null,
  failed: null,
}

const OverlayItem = memo(function OverlayItem({ id }: OverlayItemProps) {
  const status = useLayerMapStatus(id)
  const config = getLayerConfig(id)
  const View = OVERLAY_VIEWS[status]
  if (View === null) return null

  return <View id={id} config={config} />
})

function LegendCard({ id, config }: OverlayViewProps) {
  const renderCountName = `map-legend:${id}`

  return (
    <Card>
      <RenderCount name={renderCountName} />
      <CardTitle>{config.title}</CardTitle>
      <LayerLegend config={config} />
    </Card>
  )
}

function LoadingChip({ config }: OverlayViewProps) {
  return <Chip role="status">Загружается: {config.title}</Chip>
}

const Overlay = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space.sm};
  left: ${({ theme }) => theme.space.sm};
  display: grid;
  gap: ${({ theme }) => theme.space.xs};
  width: min(${OVERLAY_WIDTH}, calc(100% - 2 * ${({ theme }) => theme.space.sm}));
  max-height: calc(100% - 2 * ${({ theme }) => theme.space.sm});
  overflow-y: auto;
  pointer-events: none;
`

const Card = styled.div`
  position: relative;
  display: grid;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.floating};
  pointer-events: auto;
`

const CardTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`

const Chip = styled.span`
  justify-self: start;
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  box-shadow: ${({ theme }) => theme.shadows.floating};
`

const Note = styled.span`
  padding: ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`
