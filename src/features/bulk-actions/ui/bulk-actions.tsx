import styled from 'styled-components'

import { layerCommands, type LayersSummary } from '@/entities/layer'

import { Button } from '@/shared/ui'

type BulkActionsProps = {
  readonly summary: LayersSummary
}

const handleEnableAll = () => {
  layerCommands.enableAll()
}
const handleDisableAll = () => {
  layerCommands.disableAll()
}
const handleRetryFailed = () => {
  layerCommands.retryFailed()
}

export function BulkActions({ summary }: BulkActionsProps) {
  return (
    <Group>
      <Button onClick={handleEnableAll} disabled={summary.enabled === summary.total}>
        Включить все
      </Button>
      <Button onClick={handleDisableAll} disabled={summary.enabled === 0}>
        Выключить все
      </Button>
      <Button onClick={handleRetryFailed} disabled={summary.failed === 0}>
        Повторить ошибки
      </Button>
    </Group>
  )
}

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`
