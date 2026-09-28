import styled from 'styled-components'

import { focusRing, touchArea } from '../../theme/mixins'

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

const TRACK_WIDTH = '40px'
const TRACK_HEIGHT = '22px'
const THUMB_SIZE = '16px'
const THUMB_INSET = '3px'
const THUMB_CHECKED_LEFT = '21px'

const Track = styled.button<{ $checked: boolean }>`
  ${touchArea}
  flex-shrink: 0;
  width: ${TRACK_WIDTH};
  height: ${TRACK_HEIGHT};
  padding: 0;
  border: none;
  border-radius: calc(${TRACK_HEIGHT} / 2);
  background: ${({ theme, $checked }) => ($checked ? theme.colors.accent : theme.colors.border)};
  cursor: pointer;
  transition: background 0.15s;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  ${focusRing}
`

const Thumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: ${THUMB_INSET};
  left: ${({ $checked }) => ($checked ? THUMB_CHECKED_LEFT : THUMB_INSET)};
  width: ${THUMB_SIZE};
  height: ${THUMB_SIZE};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  transition: left 0.15s;
`
