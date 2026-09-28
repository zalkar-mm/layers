import type { ReactNode } from 'react'
import styled, { type DefaultTheme } from 'styled-components'

import { type LayerEvent, type LayerEventKind, useLayerEvents } from '@/entities/layer'

import { formatEvent } from '../lib/format-event'

type EntryTone = 'normal' | 'warning'

const EVENT_TONE: Readonly<Record<LayerEventKind, EntryTone>> = {
  request: 'normal',
  error: 'normal',
  abort: 'warning',
  'stale-dropped': 'warning',
  'cache-hit': 'normal',
  'cache-expired': 'normal',
  'cache-updated': 'normal',
}

const TONE_COLOR: Readonly<Record<EntryTone, (theme: DefaultTheme) => string>> = {
  normal: (theme) => theme.colors.text,
  warning: (theme) => theme.colors.warning,
}

const LOG_MAX_HEIGHT = '240px'
const LOG_FONT_FAMILY = "ui-monospace, 'SFMono-Regular', Menlo, monospace"

export function EventLog() {
  const events = useLayerEvents()

  return (
    <Log aria-label="Лог событий">
      <EventEntries events={events} />
    </Log>
  )
}

type EventEntriesProps = {
  readonly events: readonly LayerEvent[]
}

function EventEntries({ events }: EventEntriesProps): ReactNode {
  if (events.length === 0) return <Empty>Событий пока нет</Empty>

  return events.map((event) => <EventEntry key={event.seq} event={event} />)
}

type EventEntryProps = {
  readonly event: LayerEvent
}

function EventEntry({ event }: EventEntryProps) {
  const text = formatEvent(event)
  const tone = EVENT_TONE[event.kind]

  return <Entry $tone={tone}>{text}</Entry>
}

const Log = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space.xxs};
  max-height: ${LOG_MAX_HEIGHT};
  margin: 0;
  padding: ${({ theme }) => theme.space.sm};
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-family: ${LOG_FONT_FAMILY};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  list-style: none;
`

const Entry = styled.li<{ $tone: EntryTone }>`
  color: ${({ theme, $tone }) => TONE_COLOR[$tone](theme)};
`

const Empty = styled.li`
  color: ${({ theme }) => theme.colors.textMuted};
`
