import { layerCommands, type LayerId } from '@/entities/layer'

import { Switch } from '@/shared/ui'

type LayerToggleProps = {
  readonly id: LayerId
  readonly checked: boolean
  readonly title: string
}

export function LayerToggle({ id, checked, title }: LayerToggleProps) {
  const label = `Слой «${title}»`
  const handleToggle = () => {
    layerCommands.toggle(id)
  }

  return <Switch checked={checked} onToggle={handleToggle} label={label} />
}
