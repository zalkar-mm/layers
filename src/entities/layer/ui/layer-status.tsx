import styled from 'styled-components'

import { useNow } from '@/shared/lib/time'
import { Spinner } from '@/shared/ui'

import { describeStatus, hasStaleData, type StatusTone } from '../lib/status'
import type { LoadState } from '../model/types'

const TICK_MS = 30_000

type LayerStatusProps = {
  readonly load: LoadState
}

export function LayerStatus({ load }: LayerStatusProps) {
  const now = useNow(TICK_MS, hasStaleData(load))
  const status = describeStatus(load, now)

  return (
    <Live role="status" aria-live="polite" aria-atomic="true">
      {status === null ? null : (
        <Badge $tone={status.tone}>
          {status.busy ? <Spinner /> : null}
          {status.text}
        </Badge>
      )}
    </Live>
  )
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
