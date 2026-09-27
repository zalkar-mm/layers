import styled from 'styled-components'

type GradientBarProps = {
  readonly colors: readonly string[]
}

export function GradientBar({ colors }: GradientBarProps) {
  return (
    <Bar aria-hidden style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
  )
}

const Bar = styled.span`
  display: block;
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
`
