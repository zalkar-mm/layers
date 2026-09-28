import styled from 'styled-components'

import { focusRing, touchArea } from '../theme/mixins'

export const Button = styled.button.attrs({ type: 'button' })`
  ${touchArea}
  min-height: ${({ theme }) => theme.sizes.control};
  padding: ${({ theme }) => `${theme.space.xs} ${theme.space.md}`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  ${focusRing}
`

export const IconButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.sizes.control};
  padding: 0;
`
