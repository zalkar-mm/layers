import styled from 'styled-components'

import { formatNumber } from '@/shared/lib/format'
import { GradientBar } from '@/shared/ui'

import type { LayerConfig } from '../model/state/types'

type LayerLegendProps = {
  readonly config: LayerConfig
}

export function LayerLegend({ config }: LayerLegendProps) {
  const [min, max] = config.valueRange
  const minText = formatNumber(min)
  const maxText = formatNumber(max)

  return (
    <Legend>
      <GradientBar colors={config.palette} />
      <Range>
        <span>{minText}</span>
        <span>
          {maxText} {config.unit}
        </span>
      </Range>
    </Legend>
  )
}

const Legend = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.xxs};
`

const Range = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`
