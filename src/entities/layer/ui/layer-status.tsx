import styled from 'styled-components'

import { useNow } from '@/shared/lib/time'
import { Spinner } from '@/shared/ui'

import type { LayerRowStatus } from '../lib/row-view'
import { describeStatus, hasStaleData, type StatusTone, type StatusView } from '../lib/status'

const TICK_MS = 30_000

type LayerStatusProps = {
  readonly status: LayerRowStatus
}

export function LayerStatus({ status: rowStatus }: LayerStatusProps) {
  const now = useNow(TICK_MS, hasStaleData(rowStatus))
  const status = describeStatus(rowStatus, now)

  return (
    <Live role="status" aria-live="polite" aria-atomic="true">
      <StatusBadge status={status} />
    </Live>
  )
}

type StatusBadgeProps = {
  readonly status: StatusView | null
}

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === null) return null

  return (
    <Badge $tone={status.tone}>
      <BusySpinner busy={status.busy} />
      {status.text}
    </Badge>
  )
}

type BusySpinnerProps = {
  readonly busy: boolean
}

function BusySpinner({ busy }: BusySpinnerProps) {
  if (!busy) return null

  return <Spinner />
}

const Live = styled.span`
  display: inline-flex;
  min-width: 0;
`

const Badge = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $tone }) =>
    ({
      progress: theme.colors.textMuted,
      success: theme.colors.success,
      danger: theme.colors.danger,
    })[$tone]};
`
