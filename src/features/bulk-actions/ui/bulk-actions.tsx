import styled from 'styled-components'

import { layerCommands } from '@/entities/layer'

import { Button } from '@/shared/ui'

type BulkActionsProps = {
  readonly enableAllDisabled: boolean
  readonly disableAllDisabled: boolean
  readonly retryFailedDisabled: boolean
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

export function BulkActions({
  enableAllDisabled,
  disableAllDisabled,
  retryFailedDisabled,
}: BulkActionsProps) {
  return (
    <Group>
      <Button onClick={handleEnableAll} disabled={enableAllDisabled}>
        Включить все
      </Button>
      <Button onClick={handleDisableAll} disabled={disableAllDisabled}>
        Выключить все
      </Button>
      <Button onClick={handleRetryFailed} disabled={retryFailedDisabled}>
        Повторить ошибки
      </Button>
    </Group>
  )
}

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`
