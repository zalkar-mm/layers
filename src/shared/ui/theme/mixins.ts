import { css } from 'styled-components'

const outline = (offset: 'outside' | 'inside') => css`
  outline: ${({ theme }) => `${theme.sizes.focusRing} solid ${theme.colors.focus}`};
  outline-offset: ${({ theme }) =>
    offset === 'outside' ? theme.sizes.focusRing : `-${theme.sizes.focusRing}`};
`

export const insetFocusOutline = outline('inside')

export const focusRing = css`
  &:focus-visible {
    ${outline('outside')}
  }
`

export const insetFocusRing = css`
  &:focus-visible {
    ${insetFocusOutline}
  }
`

export const touchArea = css`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, ${({ theme }) => theme.sizes.touchTarget});
    height: max(100%, ${({ theme }) => theme.sizes.touchTarget});
    transform: translate(-50%, -50%);
  }
`
