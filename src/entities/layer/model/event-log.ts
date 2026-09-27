import { createVedroStore } from '@/shared/lib/vedro'

import type { LayerId } from './types'

export type LayerEventKind =
  'request' | 'error' | 'abort' | 'stale-dropped' | 'cache-hit' | 'cache-expired' | 'cache-updated'

export type LayerEvent = {
  readonly seq: number
  readonly at: number
  readonly kind: LayerEventKind
  readonly layerId: LayerId
  readonly requestId: number | null
  readonly ageMs: number | null
}

export type LayerEventInput = Omit<LayerEvent, 'seq' | 'requestId' | 'ageMs'> &
  Partial<Pick<LayerEvent, 'requestId' | 'ageMs'>>

export const EVENT_LOG_LIMIT = 20

export const createEventLog = (limit = EVENT_LOG_LIMIT) => {
  const initial: { readonly events: readonly LayerEvent[] } = { events: [] }
  const store = createVedroStore('layer-events', initial)
  let seq = 0

  return {
    store,
    push: (inputs: readonly LayerEventInput[]): void => {
      if (inputs.length === 0) return
      const fresh = inputs.slice(-limit).map((input): LayerEvent => {
        seq += 1

        return { requestId: null, ageMs: null, ...input, seq }
      })
      store.dispatch((state) => ({ events: [...fresh.reverse(), ...state.events].slice(0, limit) }))
    },
    clear: (): void => {
      store.dispatch({ events: [] })
    },
  }
}

export type EventLog = ReturnType<typeof createEventLog>
