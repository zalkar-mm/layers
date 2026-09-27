import { useId } from 'react'

import styled from 'styled-components'

import { setStressMode, STRESS_MODES, type StressMode, useStressMode } from '../model/stress-mode'

export function StressModeSwitch() {
  const current = useStressMode()
  const legendId = useId()

  return (
    <Group role="radiogroup" aria-labelledby={legendId}>
      <Legend id={legendId}>Число слоёв</Legend>
      {STRESS_MODES.map((mode: StressMode) => (
        <Option key={mode}>
          <Radio
            type="radio"
            name="stress-mode"
            value={mode}
            checked={mode === current}
            onChange={() => {
              setStressMode(mode)
            }}
          />
          <OptionText>{mode}</OptionText>
        </Option>
      ))}
    </Group>
  )
}

const Group = styled.fieldset`
  display: inline-flex;
  margin: 0;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 32px;
  background: ${({ theme }) => theme.colors.surface};

  input:checked + & {
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accentText};
  }

  input:focus-visible + & {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: -2px;
  }
`
