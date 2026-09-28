import type { ChangeEvent } from 'react'
import styled from 'styled-components'

import { focusRing } from '../../theme/mixins'

type SliderProps = {
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly disabled?: boolean
  readonly label: string
  readonly valueText: string
  readonly onChange: (value: number) => void
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  label,
  valueText,
  onChange,
}: SliderProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value))
  }

  return (
    <Range
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={handleChange}
    />
  )
}

const Range = styled.input`
  flex: 1;
  min-width: 0;
  accent-color: ${({ theme }) => theme.colors.accent};

  &:disabled {
    opacity: 0.4;
  }

  ${focusRing}
`
