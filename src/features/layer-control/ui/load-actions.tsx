import { layerCommands, type LayerId } from '@/entities/layer'

import { Button, IconButton } from '@/shared/ui'

type ActionProps = {
  readonly id: LayerId
  readonly title: string
}

export function RetryButton({ id, title }: ActionProps) {
  const handleClick = () => {
    layerCommands.retry(id)
  }

  return (
    <Button onClick={handleClick} aria-label={`Повторить загрузку слоя «${title}»`}>
      Повторить
    </Button>
  )
}

export function RefreshButton({ id, title }: ActionProps) {
  const handleClick = () => {
    layerCommands.refresh(id)
  }

  return (
    <IconButton onClick={handleClick} aria-label={`Обновить слой «${title}»`} title="Обновить">
      <span aria-hidden>↻</span>
    </IconButton>
  )
}
