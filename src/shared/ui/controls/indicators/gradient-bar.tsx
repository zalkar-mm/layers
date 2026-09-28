import styled from 'styled-components'

type GradientBarProps = {
  readonly colors: readonly string[]
}

const BAR_HEIGHT = '6px'

export function GradientBar({ colors }: GradientBarProps) {
  const style = { background: `linear-gradient(to right, ${colors.join(', ')})` }

  return <Bar aria-hidden style={style} />
}

const Bar = styled.span`
  display: block;
  height: ${BAR_HEIGHT};
  border-radius: ${({ theme }) => theme.radii.sm};
`
