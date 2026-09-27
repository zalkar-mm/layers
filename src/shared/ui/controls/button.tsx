import styled, { css } from 'styled-components'

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`

export const Button = styled.button.attrs({ type: 'button' })`
  min-height: 32px;
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
  width: 32px;
  padding: 0;
`

export { focusRing }
