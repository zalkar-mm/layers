import styled from 'styled-components'

import { formatNumber } from '@/shared/lib/time'
import { GradientBar } from '@/shared/ui'

import type { LayerConfig } from '../model/types'

type LayerLegendProps = {
  readonly config: LayerConfig
}

export function LayerLegend({ config }: LayerLegendProps) {
  const [min, max] = config.valueRange

  return (
    <Legend>
      <GradientBar colors={config.palette} />
      <Range>
        <span>{formatNumber(min)}</span>
        <span>
          {formatNumber(max)} {config.unit}
        </span>
      </Range>
    </Legend>
  )
}

const Legend = styled.div`
  display: grid;
  gap: 2px;
`

const Range = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`
