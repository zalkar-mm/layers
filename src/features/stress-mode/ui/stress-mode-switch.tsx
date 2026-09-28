import { useId } from 'react'

import styled from 'styled-components'

import { insetFocusOutline, touchArea } from '@/shared/ui'

import { setStressMode, STRESS_MODES, type StressMode, useStressMode } from '../model/stress-mode'

export function StressModeSwitch() {
  const current = useStressMode()
  const legendId = useId()

  return (
    <Group role="radiogroup" aria-labelledby={legendId}>
      <Legend id={legendId}>Число слоёв</Legend>
      {STRESS_MODES.map((mode) => (
        <StressModeOption key={mode} mode={mode} current={current} />
      ))}
    </Group>
  )
}

type StressModeOptionProps = {
  readonly mode: StressMode
  readonly current: StressMode
}

function StressModeOption({ mode, current }: StressModeOptionProps) {
  const checked = mode === current
  const handleChange = () => {
    setStressMode(mode)
  }

  return (
    <Option>
      <Radio
        type="radio"
        name="stress-mode"
        value={mode}
        checked={checked}
        onChange={handleChange}
      />
      <OptionText>{mode}</OptionText>
    </Option>
  )
}

const OPTION_MIN_WIDTH = '48px'

const Group = styled.fieldset`
  display: inline-flex;
  margin: 0;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const Legend = styled.legend`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

const Option = styled.label`
  position: relative;
  cursor: pointer;
`

const Radio = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`

const OptionText = styled.span`
  ${touchArea}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${OPTION_MIN_WIDTH};
  min-height: ${({ theme }) => theme.sizes.control};
  background: ${({ theme }) => theme.colors.surface};

  ${Option}:first-of-type > & {
    border-radius: ${({ theme }) => `${theme.radii.sm} 0 0 ${theme.radii.sm}`};
  }

  ${Option}:last-of-type > & {
    border-radius: ${({ theme }) => `0 ${theme.radii.sm} ${theme.radii.sm} 0`};
  }

  input:checked + & {
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accentText};
  }

  input:focus-visible + & {
    ${insetFocusOutline}
  }
`
