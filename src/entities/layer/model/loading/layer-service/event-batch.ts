import type { LayerEventInput } from '../event-log'

export type EventsListener = (events: readonly LayerEventInput[]) => void

export const createEventBatch = (onEvents: EventsListener | undefined) => {
  let buffer: LayerEventInput[] | null = null

  const emit = (event: LayerEventInput): void => {
    if (buffer === null) onEvents?.([event])
    else buffer.push(event)
  }

  const withBatchedEvents =
    <Args extends unknown[]>(command: (...args: Args) => void) =>
    (...args: Args): void => {
      if (buffer !== null) {
        command(...args)

        return
      }
      buffer = []
      try {
        command(...args)
      } finally {
        const events = buffer
        buffer = null
        if (events.length > 0) onEvents?.(events)
      }
    }

  return { emit, withBatchedEvents }
}
