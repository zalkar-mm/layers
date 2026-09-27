import { createAbortError, type FetchLayerData, isAbortError, LayerApiError } from '@/shared/api'

import type { LayerCache } from './cache'
import type { LayerEventInput } from './event-log'
import { type LayerStore, type LayerUpdater, updateLayer, updateLayers } from './store'
import {
  completeLoading,
  failLoading,
  isCurrentRequest,
  startLoading,
  turnOff,
  visibleData,
  withOpacity,
} from './transitions'
import type { CachedData, LayerData, LayerError, LayerId, LayerState } from './types'

type Dependencies = {
  readonly store: LayerStore
  readonly fetchLayerData: FetchLayerData
  readonly cache: LayerCache
  readonly now: () => number
  readonly onEvents?: (events: readonly LayerEventInput[]) => void
  readonly scheduleBulkRequests?: (task: () => void) => void
  readonly scheduleResponseFlush?: (flush: () => void) => void
}

export const BULK_LAYERS_THRESHOLD = 50

type LayerResponse = {
  readonly id: LayerId
  readonly requestId: number
  readonly outcome:
    | { readonly ok: true; readonly data: LayerData }
    | { readonly ok: false; readonly error: unknown }
}

type InFlight = { readonly requestId: number; readonly controller: AbortController }

const toLayerError = (error: unknown): LayerError =>
  error instanceof LayerApiError
    ? { kind: error.kind, message: error.message }
    : { kind: 'server', message: 'Неизвестная ошибка загрузки' }

export const createLayerService = ({
  store,
  fetchLayerData,
  cache,
  now,
  onEvents,
  scheduleBulkRequests,
  scheduleResponseFlush,
}: Dependencies) => {
  const inFlight = new Map<LayerId, InFlight>()
  const failedAttempts = new Map<LayerId, number>()
  let lastRequestId = 0
  const cancelReason = createAbortError()

  let eventBuffer: LayerEventInput[] | null = null

  const emit = (event: LayerEventInput) => {
    if (eventBuffer === null) onEvents?.([event])
    else eventBuffer.push(event)
  }

  const withBatchedEvents =
    <Args extends unknown[]>(command: (...args: Args) => void) =>
    (...args: Args): void => {
      if (eventBuffer !== null) {
        command(...args)

        return
      }
      eventBuffer = []
      try {
        command(...args)
      } finally {
        const events = eventBuffer
        eventBuffer = null
        if (events.length > 0) onEvents?.(events)
      }
    }

  const cancel = (id: LayerId) => {
    const current = inFlight.get(id)
    if (current === undefined) return
    inFlight.delete(id)
    current.controller.abort(cancelReason)
    emit({ kind: 'abort', layerId: id, requestId: current.requestId, at: now() })
  }

  const dropStale = (id: LayerId, requestId: number) => {
    if (inFlight.get(id)?.requestId === requestId) inFlight.delete(id)
    emit({ kind: 'stale-dropped', layerId: id, requestId, at: now() })
  }

  const resolveSuccess = (id: LayerId, requestId: number, data: LayerData): LayerUpdater | null => {
    const layer = store.get('byId')[id]
    if (layer === undefined || !isCurrentRequest(layer, requestId)) {
      dropStale(id, requestId)

      return null
    }
    const loadedAt = now()
    inFlight.delete(id)
    failedAttempts.delete(id)
    if (cache.set(id, data, loadedAt)) {
      emit({ kind: 'cache-updated', layerId: id, requestId, at: loadedAt })
    }

    return (current) => completeLoading(current, requestId, data, loadedAt)
  }

  const resolveFailure = (id: LayerId, requestId: number, error: unknown): LayerUpdater | null => {
    const layer = store.get('byId')[id]
    if (layer === undefined || !isCurrentRequest(layer, requestId)) {
      dropStale(id, requestId)

      return null
    }
    inFlight.delete(id)
    const attempt = (failedAttempts.get(id) ?? 0) + 1
    failedAttempts.set(id, attempt)
    emit({ kind: 'error', layerId: id, requestId, at: now() })

    return (current) => failLoading(current, requestId, toLayerError(error), attempt)
  }

  const applyResponses = withBatchedEvents((responses: readonly LayerResponse[]) => {
    const updaters = new Map<LayerId, LayerUpdater>()
    for (const response of responses) {
      const updater = response.outcome.ok
        ? resolveSuccess(response.id, response.requestId, response.outcome.data)
        : resolveFailure(response.id, response.requestId, response.outcome.error)
      if (updater !== null) updaters.set(response.id, updater)
    }
    if (updaters.size === 0) return
    updateLayers(store, [...updaters.keys()], (layer, id) => updaters.get(id)?.(layer, id) ?? layer)
  })

  let pendingResponses: LayerResponse[] = []

  const flushResponses = () => {
    const responses = pendingResponses
    pendingResponses = []
    applyResponses(responses)
  }

  const receive = (response: LayerResponse) => {
    const collecting = pendingResponses.length > 0
    if (
      scheduleResponseFlush === undefined ||
      (!collecting && inFlight.size < BULK_LAYERS_THRESHOLD)
    ) {
      applyResponses([response])

      return
    }
    pendingResponses.push(response)
    if (!collecting) scheduleResponseFlush(flushResponses)
  }

  const load = (
    ids: readonly LayerId[],
    pickStale: (layer: LayerState, id: LayerId) => CachedData | null,
  ) => {
    if (ids.length === 0) return
    const byId = store.get('byId')
    const startedAt = now()
    const requests = new Map<LayerId, { requestId: number; stale: CachedData | null }>()

    for (const id of ids) {
      const layer = byId[id]
      if (layer === undefined) continue
      cancel(id)
      lastRequestId += 1
      requests.set(id, { requestId: lastRequestId, stale: pickStale(layer, id) })
    }

    const controllers = new Map<LayerId, AbortController>()
    for (const [id, { requestId }] of requests) {
      const controller = new AbortController()
      controllers.set(id, controller)
      inFlight.set(id, { requestId, controller })
    }

    updateLayers(store, [...requests.keys()], (layer, id) => {
      const request = requests.get(id)

      return request === undefined ? layer : startLoading(layer, { ...request, startedAt })
    })

    const start = () => {
      for (const [id, { requestId }] of requests) {
        const controller = controllers.get(id)
        if (controller === undefined || controller.signal.aborted) continue
        emit({ kind: 'request', layerId: id, requestId, at: now() })
        let response: Promise<LayerData>
        try {
          response = fetchLayerData(id, { signal: controller.signal })
        } catch (error) {
          response = Promise.reject(error instanceof Error ? error : new Error(String(error)))
        }
        response.then(
          (data) => {
            receive({ id, requestId, outcome: { ok: true, data } })
          },
          (error: unknown) => {
            if (!isAbortError(error)) receive({ id, requestId, outcome: { ok: false, error } })
          },
        )
      }
    }

    if (scheduleBulkRequests !== undefined && requests.size >= BULK_LAYERS_THRESHOLD)
      scheduleBulkRequests(withBatchedEvents(start))
    else start()
  }

  const staleFromCache = (_layer: LayerState, id: LayerId): CachedData | null => {
    const result = cache.lookup(id)
    if (result.kind === 'expired') emit({ kind: 'cache-expired', layerId: id, at: now() })
    if (result.kind !== 'hit') return null
    emit({ kind: 'cache-hit', layerId: id, at: now(), ageMs: now() - result.entry.loadedAt })

    return result.entry
  }

  const keepStale = (layer: LayerState): CachedData | null => {
    const stale = visibleData(layer.load)

    return stale !== null && cache.isFresh(stale.loadedAt) ? stale : null
  }

  const layerOf = (id: LayerId) => store.get('byId')[id]

  const disableMany = (ids: readonly LayerId[]) => {
    for (const id of ids) {
      cancel(id)
      failedAttempts.delete(id)
    }
    updateLayers(store, ids, turnOff)
  }

  const enableMany = (ids: readonly LayerId[]) => {
    load(
      ids.filter((id) => layerOf(id)?.enabled === false),
      staleFromCache,
    )
  }

  const retryMany = (ids: readonly LayerId[]) => {
    load(
      ids.filter((id) => layerOf(id)?.load.kind === 'error'),
      keepStale,
    )
  }

  return {
    enable: withBatchedEvents((id: LayerId) => {
      enableMany([id])
    }),
    disable: withBatchedEvents((id: LayerId) => {
      disableMany([id])
    }),
    toggle: withBatchedEvents((id: LayerId) => {
      const layer = layerOf(id)
      if (layer === undefined) return
      if (layer.enabled) disableMany([id])
      else enableMany([id])
    }),
    retry: withBatchedEvents((id: LayerId) => {
      retryMany([id])
    }),
    refresh: withBatchedEvents((id: LayerId) => {
      load(layerOf(id)?.load.kind === 'success' ? [id] : [], keepStale)
    }),
    setOpacity: (id: LayerId, value: number) => {
      updateLayer(store, id, (layer) => withOpacity(layer, value))
    },
    clearCache: () => {
      cache.clear()
    },
    enableLayers: withBatchedEvents((ids: readonly LayerId[]) => {
      enableMany(ids)
    }),
    enableAll: withBatchedEvents(() => {
      enableMany(store.get('ids'))
    }),
    disableAll: withBatchedEvents(() => {
      disableMany(store.get('ids'))
    }),
    retryFailed: withBatchedEvents(() => {
      retryMany(store.get('ids'))
    }),
    cancelAll: withBatchedEvents(() => {
      for (const id of [...inFlight.keys()]) cancel(id)
      failedAttempts.clear()
    }),
    inFlightCount: () => inFlight.size,
  }
}

export type LayerService = ReturnType<typeof createLayerService>
