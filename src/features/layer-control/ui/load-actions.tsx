import { layerCommands, type LayerId } from '@/entities/layer'

import { Button, IconButton } from '@/shared/ui'

export type LoadActionProps = {
  readonly id: LayerId
  readonly title: string
}

export function RetryButton({ id, title }: LoadActionProps) {
  const label = `Повторить загрузку слоя «${title}»`
  const handleClick = () => {
    layerCommands.retry(id)
  }

  return (
    <Button onClick={handleClick} aria-label={label}>
      Повторить
    </Button>
  )
}

export function RefreshButton({ id, title }: LoadActionProps) {
  const label = `Обновить слой «${title}»`
  const handleClick = () => {
    layerCommands.refresh(id)
  }

  return (
    <IconButton onClick={handleClick} aria-label={label} title="Обновить">
      <span aria-hidden>↻</span>
    </IconButton>
  )
}
