import { memo } from 'react'

import styled from 'styled-components'

import {
  getLayerConfig,
  type LayerId,
  LayerLegend,
  useEnabledLayerIds,
  useLayerMapStatus,
} from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

import { MAP_LAYER_LIMIT } from '../model/map-sync'

export function MapOverlay() {
  const enabledIds = useEnabledLayerIds()
  const shownIds = enabledIds.slice(0, MAP_LAYER_LIMIT)

  return (
    <Overlay>
      {shownIds.map((id) => (
        <OverlayItem key={id} id={id} />
      ))}
      {enabledIds.length > MAP_LAYER_LIMIT ? (
        <Note>
          На карте первые {MAP_LAYER_LIMIT} из {enabledIds.length} включённых слоёв
        </Note>
      ) : null}
    </Overlay>
  )
}

const OverlayItem = memo(function OverlayItem({ id }: { readonly id: LayerId }) {
  const status = useLayerMapStatus(id)
  const config = getLayerConfig(id)

  switch (status) {
    case 'shown':
      return (
        <Card>
          <RenderCount name={`map-legend:${id}`} />
          <CardTitle>{config.title}</CardTitle>
          <LayerLegend config={config} />
        </Card>
      )
    case 'loading':
      return <Chip role="status">Загружается: {config.title}</Chip>
    case 'off':
    case 'failed':
      return null
  }
})

const Overlay = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.space.sm};
  left: ${({ theme }) => theme.space.sm};
  display: grid;
  gap: ${({ theme }) => theme.space.xs};
  width: min(220px, calc(100% - 16px));
  max-height: calc(100% - 16px);
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
  box-shadow: 0 1px 4px rgb(0 0 0 / 15%);
  pointer-events: auto;
`

const CardTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
`

const Chip = styled.span`
  justify-self: start;
  padding: 2px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  box-shadow: 0 1px 4px rgb(0 0 0 / 15%);
`

const Note = styled.span`
  padding: ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`
