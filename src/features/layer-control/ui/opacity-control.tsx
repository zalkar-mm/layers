import styled from 'styled-components'

import { layerCommands, type LayerId } from '@/entities/layer'

import { formatPercentValueText, fromPercent, PERCENT_MAX, toPercent } from '@/shared/lib/format'
import { Slider } from '@/shared/ui'

type OpacityControlProps = {
  readonly id: LayerId
  readonly opacity: number
  readonly disabled: boolean
  readonly title: string
}

const VALUE_MIN_WIDTH = '40px'

export function OpacityControl({ id, opacity, disabled, title }: OpacityControlProps) {
  const percent = toPercent(opacity)
  const label = `Прозрачность слоя «${title}»`
  const valueText = formatPercentValueText(percent)
  const handleChange = (value: number) => {
    layerCommands.setOpacity(id, fromPercent(value))
  }

  return (
    <Row>
      <Slider
        value={percent}
        min={0}
        max={PERCENT_MAX}
        disabled={disabled}
        label={label}
        valueText={valueText}
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
  min-width: ${VALUE_MIN_WIDTH};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${({ theme }) => theme.colors.textMuted};
`
