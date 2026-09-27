import styled from 'styled-components'

import { layerCommands, type LayerId } from '@/entities/layer'

import { Slider } from '@/shared/ui'

type OpacityControlProps = {
  readonly id: LayerId
  readonly opacity: number
  readonly disabled: boolean
  readonly title: string
}

export function OpacityControl({ id, opacity, disabled, title }: OpacityControlProps) {
  const percent = Math.round(opacity * 100)
  const handleChange = (value: number) => {
    layerCommands.setOpacity(id, value / 100)
  }

  return (
    <Row>
      <Slider
        value={percent}
        min={0}
        max={100}
        disabled={disabled}
        label={`Прозрачность слоя «${title}»`}
        valueText={`${String(percent)} процентов`}
        onChange={handleChange}
      />
      <Value>{percent} %</Value>
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`

const Value = styled.span`
  min-width: 40px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme }) => theme.colors.textMuted};
`
