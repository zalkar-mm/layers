import { useRef } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'

import type { LayerId } from '@/entities/layer'

import { LayerRow } from './layer-row'

export const VIRTUALIZATION_THRESHOLD = 50
const ESTIMATED_ROW_HEIGHT = 170
const INITIAL_RECT = { width: 360, height: 800 }

type LayerListProps = {
  readonly ids: readonly LayerId[]
}

export function LayerList({ ids }: LayerListProps) {
  if (ids.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <List>
        {ids.map((id) => (
          <Item key={id}>
            <LayerRow id={id} />
          </Item>
        ))}
      </List>
    )
  }

  return <VirtualLayerList ids={ids} />
}

function VirtualLayerList({ ids }: LayerListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => ids[index] ?? index,
    overscan: 5,
    initialRect: INITIAL_RECT,
  })

  const spacerStyle = { height: virtualizer.getTotalSize() }
  const items = virtualizer.getVirtualItems()

  return (
    <Scroller ref={scrollRef}>
      <Spacer style={spacerStyle}>
        {items.map((item) => (
          <VirtualRow
            key={item.key}
            id={ids[item.index]}
            index={item.index}
            start={item.start}
            measureRef={virtualizer.measureElement}
          />
        ))}
      </Spacer>
    </Scroller>
  )
}

type VirtualRowProps = {
  readonly id: LayerId | undefined
  readonly index: number
  readonly start: number
  readonly measureRef: (element: HTMLLIElement | null) => void
}

function VirtualRow({ id, index, start, measureRef }: VirtualRowProps) {
  if (id === undefined) return null
  const style = { transform: `translateY(${String(start)}px)` }

  return (
    <VirtualItem ref={measureRef} data-index={index} style={style}>
      <LayerRow id={id} />
    </VirtualItem>
  )
}

const List = styled.ul`
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
`

const Item = styled.li`
  list-style: none;
`

const Scroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const Spacer = styled.ul`
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
`

const VirtualItem = styled.li`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
`
