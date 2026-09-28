import { useState } from 'react'

import styled from 'styled-components'

import { Switch } from '@/shared/ui'

import {
  isRenderCountsVisible,
  RENDER_COUNTS_ENABLED,
  setRenderCountsVisible,
} from '../render-counts'

const TOGGLE_LABEL = 'Показать рендеры'

export function RenderCountsToggle() {
  if (!RENDER_COUNTS_ENABLED) return null

  return <RenderCountsSwitch />
}

function RenderCountsSwitch() {
  const [visible, setVisible] = useState(isRenderCountsVisible)

  const handleToggle = () => {
    const next = !visible
    setRenderCountsVisible(next)
    setVisible(next)
  }

  return (
    <Label>
      <Switch checked={visible} label={TOGGLE_LABEL} onToggle={handleToggle} />
      <span aria-hidden>{TOGGLE_LABEL}</span>
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
