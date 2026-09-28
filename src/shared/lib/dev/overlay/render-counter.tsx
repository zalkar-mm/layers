import { useLayoutEffect, useRef } from 'react'

import styled from 'styled-components'

import { incrementRenderCount, RENDER_COUNTS_ENABLED } from '../render-counts'

type RenderCountProps = {
  readonly name: string
}

function RenderCountBadge({ name }: RenderCountProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const next = incrementRenderCount(name)
    if (ref.current !== null) ref.current.textContent = String(next)
  })

  return <Badge ref={ref} aria-hidden data-render-count={name} />
}

function RenderCountStub(_props: RenderCountProps) {
  return null
}

export const RenderCount = RENDER_COUNTS_ENABLED ? RenderCountBadge : RenderCountStub

const BADGE_MIN_WIDTH = '18px'
const BADGE_FONT_SIZE = '10px'
const BADGE_LINE_HEIGHT = '16px'

const Badge = styled.span`
  display: none;
  position: absolute;
  top: ${({ theme }) => theme.space.xxs};
  right: ${({ theme }) => theme.space.xxs};
  min-width: ${BADGE_MIN_WIDTH};
  padding: 0 ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.debug};
  color: ${({ theme }) => theme.colors.accentText};
  font-size: ${BADGE_FONT_SIZE};
  line-height: ${BADGE_LINE_HEIGHT};
  text-align: center;
  pointer-events: none;

  html[data-render-counts='on'] & {
    display: block;
  }
`
