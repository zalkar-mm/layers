import type { ReactNode } from 'react'
import styled from 'styled-components'

import { useLayerIds } from '@/entities/layer'

import { RenderCount } from '@/shared/lib/dev'

import { LayerList } from './list/layer-list'
import { LayerPanelHeader } from './layer-panel-header'

type LayerPanelProps = {
  readonly headerExtra?: ReactNode
}

export function LayerPanel({ headerExtra }: LayerPanelProps) {
  const ids = useLayerIds()

  return (
    <Panel aria-label="Слои">
      <RenderCount name="panel" />
      <LayerPanelHeader>{headerExtra}</LayerPanelHeader>
      <LayerList ids={ids} />
    </Panel>
  )
}

const Panel = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${({ theme }) => theme.colors.surface};
`
