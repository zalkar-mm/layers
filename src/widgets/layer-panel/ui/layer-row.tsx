import { memo, type ReactNode } from 'react'

import styled from 'styled-components'

import { LayerToggle, OpacityControl, RefreshButton, RetryButton } from '@/features/layer-control'

import {
  getLayerConfig,
  type LayerId,
  LayerLegend,
  LayerStatus,
  type LoadState,
  useLayer,
} from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

type LayerRowProps = {
  readonly id: LayerId
}

const renderActions = (load: LoadState, id: LayerId, title: string): ReactNode => {
  switch (load.kind) {
    case 'error':
      return <RetryButton id={id} title={title} />
    case 'success':
      return <RefreshButton id={id} title={title} />
    case 'idle':
    case 'loading':
      return null
  }
}

export const LayerRow = memo(function LayerRow({ id }: LayerRowProps) {
  const layer = useLayer(id)
  const config = getLayerConfig(id)
  const { load } = layer

  return (
    <Row role="group" aria-label={config.title}>
      <RenderCount name={`row:${id}`} />
      <Head>
        <LayerToggle id={id} checked={layer.enabled} title={config.title} />
        <Title>
          {config.title} <Unit>{config.unit}</Unit>
        </Title>
        <Actions>{renderActions(load, id, config.title)}</Actions>
      </Head>
      <LayerStatus load={load} />
      <LayerLegend config={config} />
      <OpacityControl
        id={id}
        opacity={layer.opacity}
        disabled={!layer.enabled}
        title={config.title}
      />
      {load.kind === 'error' ? (
        <ErrorText>
          {load.error.message} · попытка {load.attempt}
        </ErrorText>
      ) : null}
    </Row>
  )
})

const Row = styled.div`
  position: relative;
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: ${({ theme }) => theme.sizes.touchTarget};
`

const Title = styled.span`
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Unit = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textMuted};
`

const Actions = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger};
`
