import styled, { keyframes } from 'styled-components'

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

export const Spinner = styled.span.attrs({ 'aria-hidden': true })`
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2.4s;
  }
`
