import type { ReactNode } from 'react'
import styled from 'styled-components'

import { BulkActions } from '@/features/bulk-actions'

import { useLayersSummary } from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

type LayerPanelHeaderProps = {
  readonly children?: ReactNode
}

export function LayerPanelHeader({ children }: LayerPanelHeaderProps) {
  const summary = useLayersSummary()
  const detailsText = [
    summary.loading > 0 ? `загружается ${String(summary.loading)}` : null,
    summary.failed > 0 ? `ошибок ${String(summary.failed)}` : null,
  ]
    .filter((part) => part !== null)
    .join(' · ')
  const enableAllDisabled = summary.enabled === summary.total
  const disableAllDisabled = summary.enabled === 0
  const retryFailedDisabled = summary.failed === 0

  return (
    <Header>
      <RenderCount name="header" />
      <Title>
        Слои · активно {summary.enabled} из {summary.total}
      </Title>
      <Details aria-live="polite">{detailsText}</Details>
      <BulkActions
        enableAllDisabled={enableAllDisabled}
        disableAllDisabled={disableAllDisabled}
        retryFailedDisabled={retryFailedDisabled}
      />
      {children}
    </Header>
  )
}

const Header = styled.header`
  position: relative;
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
`

const Details = styled.p`
  min-height: 1em;
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`
