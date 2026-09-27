import { useLayoutEffect, useRef } from 'react'

import styled from 'styled-components'

import { incrementRenderCount, RENDER_COUNTS_ENABLED } from './render-counts'

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

const Badge = styled.span`
  display: none;
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  padding: 0 4px;
  border-radius: 8px;
  background: #7c3aed;
  color: #ffffff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  pointer-events: none;

  html[data-render-counts='on'] & {
    display: block;
  }
`
