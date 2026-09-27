import styled from 'styled-components'

import { useLayerEvents } from '@/entities/layer'

import { formatEvent } from '../lib/format-event'

export function EventLog() {
  const events = useLayerEvents()

  return (
    <Log aria-label="Лог событий">
      {events.length === 0 ? <Empty>Событий пока нет</Empty> : null}
      {events.map((event) => (
        <Entry key={event.seq} $kind={event.kind}>
          {formatEvent(event)}
        </Entry>
      ))}
    </Log>
  )
}

const Log = styled.ol`
  display: grid;
  gap: 2px;
  max-height: 240px;
  margin: 0;
  padding: ${({ theme }) => theme.space.sm};
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  list-style: none;
`

const Entry = styled.li<{ $kind: string }>`
  color: ${({ theme, $kind }) =>
    $kind === 'stale-dropped' || $kind === 'abort' ? theme.colors.warning : theme.colors.text};
`

const Empty = styled.li`
  color: ${({ theme }) => theme.colors.textMuted};
`
