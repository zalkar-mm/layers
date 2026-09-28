import { type ComponentType, memo } from 'react'

import styled from 'styled-components'

import {
  LayerToggle,
  type LoadActionProps,
  OpacityControl,
  RefreshButton,
  RetryButton,
} from '@/features/layer-control'

import {
  getLayerConfig,
  type LayerId,
  LayerLegend,
  type LayerRowView,
  LayerStatus,
  useLayerRow,
} from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

type LayerRowKind = LayerRowView['kind']

const LOAD_ACTIONS: Readonly<Record<LayerRowKind, ComponentType<LoadActionProps> | null>> = {
  error: RetryButton,
  success: RefreshButton,
  idle: null,
  loading: null,
}

type LayerRowProps = {
  readonly id: LayerId
}

export const LayerRow = memo(function LayerRow({ id }: LayerRowProps) {
  const view = useLayerRow(id)
  const config = getLayerConfig(id)
  const renderCountName = `row:${id}`
  const isOpacityDisabled = !view.enabled
  const loadError =
    view.kind === 'error' ? { message: view.errorMessage, attempt: view.attempt } : null

  return (
    <Row role="group" aria-label={config.title}>
      <RenderCount name={renderCountName} />
      <Head>
        <LayerToggle id={id} checked={view.enabled} title={config.title} />
        <Title>
          {config.title} <Unit>{config.unit}</Unit>
        </Title>
        <Actions>
          <RowLoadAction kind={view.kind} id={id} title={config.title} />
        </Actions>
      </Head>
      <LayerStatus status={view} />
      <LayerLegend config={config} />
      <OpacityControl
        id={id}
        opacity={view.opacity}
        disabled={isOpacityDisabled}
        title={config.title}
      />
      <LoadErrorText error={loadError} />
    </Row>
  )
})

type RowLoadActionProps = LoadActionProps & {
  readonly kind: LayerRowKind
}

function RowLoadAction({ kind, id, title }: RowLoadActionProps) {
  const Action = LOAD_ACTIONS[kind]
  if (Action === null) return null

  return <Action id={id} title={title} />
}

type LoadError = {
  readonly message: string
  readonly attempt: number
}

type LoadErrorTextProps = {
  readonly error: LoadError | null
}

function LoadErrorText({ error }: LoadErrorTextProps) {
  if (error === null) return null

  return (
    <ErrorText>
      {error.message} · попытка {error.attempt}
    </ErrorText>
  )
}

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
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Unit = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.regular};
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
