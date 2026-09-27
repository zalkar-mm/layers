import styled from 'styled-components'

import { focusRing } from './button'

type SwitchProps = {
  readonly checked: boolean
  readonly onToggle: () => void
  readonly label: string
}

export function Switch({ checked, onToggle, label }: SwitchProps) {
  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      $checked={checked}
    >
      <Thumb $checked={checked} />
    </Track>
  )
}

const Track = styled.button<{ $checked: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 11px;
  background: ${({ theme, $checked }) => ($checked ? theme.colors.accent : theme.colors.border)};
  cursor: pointer;
  transition: background 0.15s;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &::before {
    content: '';
    position: absolute;
    inset: -11px -2px;
  }

  ${focusRing}
`

const Thumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? '21px' : '3px')};
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  transition: left 0.15s;
`
