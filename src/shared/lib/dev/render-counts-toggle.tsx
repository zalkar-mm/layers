import type { ChangeEvent } from 'react'
import styled from 'styled-components'

import { RENDER_COUNTS_ENABLED } from './render-counts'

const ATTRIBUTE = 'renderCounts'

const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
  document.documentElement.dataset[ATTRIBUTE] = event.target.checked ? 'on' : 'off'
}

export function RenderCountsToggle() {
  if (!RENDER_COUNTS_ENABLED) return null

  return (
    <Label>
      <input
        type="checkbox"
        defaultChecked={document.documentElement.dataset[ATTRIBUTE] === 'on'}
        onChange={handleChange}
      />
      Показать рендеры
    </Label>
  )
}

const Label = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
`
