import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMockLayerApi,
  type FetchLayerData,
  LayerApiError,
  type LayerData,
} from '@/shared/api'

import { baseLayerRegistry, layerId } from '../config/base-layers'
import { createLayerRegistry, type LayerRegistry } from '../config/layer-registry'
import { createSyntheticLayerConfigs } from '../config/synthetic-layers'

import { createLayerCache, type LayerCacheSettings } from './cache'
import type { LayerEventInput } from './event-log'
import { createLayerService } from './layer-service'
import { createLayerStore, type LayerStore } from './store'
import type { LayerId, LayerState } from './types'

const temperature = layerId('temperature')
const wind = layerId('wind')

const dataOf = (label: number): LayerData => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: label,
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { value: label, direction: null },
    },
  ],
})

type PendingCall = {
  readonly id: string
  readonly signal: AbortSignal
  readonly resolve: (data: LayerData) => void
  readonly reject: (error: unknown) => void
}

const createControlledFetch = ({ honorAbort = true } = {}) => {
  const calls: PendingCall[] = []
  const fetchLayerData: FetchLayerData = (id, { signal }) =>
    new Promise<LayerData>((resolve, reject) => {
      calls.push({ id, signal, resolve, reject })
      if (honorAbort) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Запрос отменён', 'AbortError'))
        })
      }
    })

  const call = (index: number): PendingCall => {
    const found = calls[index]
    if (found === undefined) throw new Error(`Запроса №${String(index)} не было`)

    return found
  }

  return { fetchLayerData, calls, call }
}

const setup = (
  options: {
    fetchLayerData?: FetchLayerData
    registry?: LayerRegistry
    cache?: Partial<LayerCacheSettings>
  } = {},
) => {
  const registry = options.registry ?? baseLayerRegistry
  const store = createLayerStore(registry)
  const cache = createLayerCache({ now: Date.now, settings: options.cache ?? {} })
  const controlled = createControlledFetch()
  const events: LayerEventInput[] = []
  const service = createLayerService({
    store,
    cache,
    now: Date.now,
    fetchLayerData: options.fetchLayerData ?? controlled.fetchLayerData,
    onEvents: (batch) => {
      events.push(...batch)
    },
  })

  return { store, cache, service, controlled, events }
}

const layerOf = (store: LayerStore, id: LayerId): LayerState => {
  const layer = store.get('byId')[id]
  if (layer === undefined) throw new Error(`Нет слоя ${id}`)

  return layer
}

const recordHistory = (store: LayerStore, id: LayerId) => {
  const history: LayerState['load']['kind'][] = []
  store.on('byId', (byId) => {
    const layer = byId[id]
    if (layer !== undefined) history.push(layer.load.kind)
  })

  return history
}

const serverError = () => new LayerApiError('server', 'Сервер вернул ошибку')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-26T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('машина состояний (ТЗ §5.2)', () => {
  it('enable: loading без кэша → success', async () => {
    const { store, service, controlled } = setup()

    service.enable(temperature)
    expect(layerOf(store, temperature)).toMatchObject({
      enabled: true,
      load: { kind: 'loading', stale: null },
    })

    vi.advanceTimersByTime(840)
    controlled.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load).toMatchObject({
      kind: 'success',
      data: dataOf(1),
      durationMs: 840,
      source: 'network',
    })
  })

  it('disable во время loading: выкл/idle, abort запроса и событие в логе', () => {
    const { store, service, controlled, events } = setup()

    service.enable(temperature)
    service.disable(temperature)

    expect(layerOf(store, temperature)).toMatchObject({ enabled: false, load: { kind: 'idle' } })
    expect(controlled.call(0).signal.aborted).toBe(true)
    expect(events.map((event) => event.kind)).toEqual(['request', 'abort'])
    expect(service.inFlightCount()).toBe(0)
  })

  it('AbortError — не ошибка: слой не уходит в error', async () => {
    const { store, service } = setup()
    const history = recordHistory(store, temperature)

    service.enable(temperature)
    service.disable(temperature)
    await vi.runAllTimersAsync()

    expect(history).not.toContain('error')
  })

  it('retry и refresh во время loading игнорируются', () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    const before = layerOf(store, temperature)

    service.retry(temperature)
    service.refresh(temperature)

    expect(layerOf(store, temperature)).toBe(before)
    expect(controlled.calls).toHaveLength(1)
  })

  it('refresh из success: текущие данные уходят в stale', async () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    controlled.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    service.refresh(temperature)

    expect(layerOf(store, temperature).load).toMatchObject({
      kind: 'loading',
      stale: { data: dataOf(1) },
    })
  })

  it('disable из error сбрасывает attempt', async () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    controlled.call(0).reject(serverError())
    await vi.runAllTimersAsync()

    service.disable(temperature)
    service.enable(temperature)
    controlled.call(1).reject(serverError())
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'error', attempt: 1 })
  })

  it('setOpacity клампит в [0, 1] и не трогает загрузку', () => {
    const { store, service } = setup()

    service.setOpacity(wind, 1.7)
    expect(layerOf(store, wind).opacity).toBe(1)
    service.setOpacity(wind, -3)
    expect(layerOf(store, wind)).toMatchObject({ opacity: 0, load: { kind: 'idle' } })
  })

  it('ошибка содержит типизированное описание на русском', async () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    controlled.call(0).reject(new LayerApiError('network', 'Нет соединения с сервером'))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load).toMatchObject({
      kind: 'error',
      error: { kind: 'network', message: 'Нет соединения с сервером' },
    })
  })
})

describe('сценарии гонок (ТЗ §6)', () => {
  it('R1: вкл → выкл → вкл, первый ответ пришёл после второго — итог по второму', async () => {
    const fetch = createControlledFetch({ honorAbort: false })
    const { store, service, events } = setup({ fetchLayerData: fetch.fetchLayerData })

    service.enable(temperature)
    service.disable(temperature)
    service.enable(temperature)
    fetch.call(1).resolve(dataOf(2))
    await vi.runAllTimersAsync()
    fetch.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'success', data: dataOf(2) })
    expect(events).toContainEqual(expect.objectContaining({ kind: 'stale-dropped', requestId: 1 }))
  })

  it('R2: выкл во время loading, ответ пришёл позже — idle, success не появляется ни на кадр', async () => {
    const fetch = createControlledFetch({ honorAbort: false })
    const { store, service } = setup({ fetchLayerData: fetch.fetchLayerData })
    const history = recordHistory(store, temperature)

    service.enable(temperature)
    service.disable(temperature)
    fetch.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load.kind).toBe('idle')
    expect(history).not.toContain('success')
  })

  it('R3: двойной клик по retry — ровно один запрос в полёте', async () => {
    const { service, controlled } = setup()
    service.enable(temperature)
    controlled.call(0).reject(serverError())
    await vi.runAllTimersAsync()

    service.retry(temperature)
    service.retry(temperature)

    expect(controlled.calls).toHaveLength(2)
    expect(service.inFlightCount()).toBe(1)
  })

  it('R4: ошибка → retry → успех; attempt = 1 во время ошибки', async () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    controlled.call(0).reject(serverError())
    await vi.runAllTimersAsync()
    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'error', attempt: 1 })

    service.retry(temperature)
    controlled.call(1).resolve(dataOf(2))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'success', data: dataOf(2) })
  })

  it('R5: 50 переключений за 1 секунду — итог по последнему клику, в полёте ≤ 1 запроса', async () => {
    const api = createMockLayerApi({
      describeLayer: () => ({ valueRange: [0, 1], withDirection: false }),
      settings: { seed: 7, minDelayMs: 300, maxDelayMs: 2000, errorRate: 0 },
    })
    const { store, service } = setup({ fetchLayerData: api.fetchLayerData })

    for (let click = 0; click < 50; click += 1) {
      service.toggle(temperature)
      expect(service.inFlightCount()).toBeLessThanOrEqual(1)
      expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
      await vi.advanceTimersByTimeAsync(20)
    }
    await vi.runAllTimersAsync()
    expect(layerOf(store, temperature)).toMatchObject({ enabled: false, load: { kind: 'idle' } })

    service.toggle(temperature)
    await vi.runAllTimersAsync()
    expect(layerOf(store, temperature)).toMatchObject({ enabled: true, load: { kind: 'success' } })
  })

  it('R6: enableAll на 100 слоях, через 100 мс disableAll — всё idle, 0 запросов, 0 success', async () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(100))
    const api = createMockLayerApi({
      describeLayer: () => ({ valueRange: [0, 1], withDirection: false }),
      settings: { seed: 3, minDelayMs: 300, maxDelayMs: 2000, errorRate: 0.2 },
    })
    const { store, service } = setup({ fetchLayerData: api.fetchLayerData, registry })
    const kinds = new Set<string>()
    store.on('byId', (byId) => {
      for (const layer of Object.values(byId)) kinds.add(layer.load.kind)
    })

    service.enableAll()
    expect(service.inFlightCount()).toBe(100)
    await vi.advanceTimersByTimeAsync(100)
    service.disableAll()
    await vi.runAllTimersAsync()

    expect(service.inFlightCount()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(Object.values(store.get('byId')).every((layer) => layer.load.kind === 'idle')).toBe(true)
    expect(kinds.has('success')).toBe(false)
  })

  it('R7: слой A грузится, слой B переключают 10 раз — A не затронут', async () => {
    const { store, service, controlled } = setup()
    service.enable(temperature)
    const layerA = layerOf(store, temperature)

    for (let click = 0; click < 10; click += 1) service.toggle(wind)

    expect(layerOf(store, temperature)).toBe(layerA)
    controlled.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()
    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'success', data: dataOf(1) })
  })

  it('R8: abort не отклонил промис — requestId отбрасывает ответ', async () => {
    const fetch = createControlledFetch({ honorAbort: false })
    const { store, service } = setup({ fetchLayerData: fetch.fetchLayerData })

    service.enable(temperature)
    service.disable(temperature)
    service.enable(temperature)
    fetch.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load.kind).toBe('loading')
    fetch.call(1).resolve(dataOf(2))
    await vi.runAllTimersAsync()
    expect(layerOf(store, temperature).load).toMatchObject({ kind: 'success', data: dataOf(2) })
  })

  it('R9: structural sharing — изменение A не меняет ссылки byId[B] и ids', () => {
    const { store, service } = setup()
    const before = { ids: store.get('ids'), wind: layerOf(store, wind) }

    service.enable(temperature)
    service.setOpacity(temperature, 0.3)

    expect(store.get('ids')).toBe(before.ids)
    expect(layerOf(store, wind)).toBe(before.wind)
  })
})

describe('кэш (ТЗ §5.3, §6)', () => {
  const loadOnce = async (
    env: ReturnType<typeof setup>,
    id: LayerId,
    callIndex: number,
    label: number,
  ) => {
    env.service.enable(id)
    env.controlled.call(callIndex).resolve(dataOf(label))
    await vi.runAllTimersAsync()
  }

  it('R10: загружен → выкл → вкл в пределах TTL — сразу loading со stale, затем success со свежими', async () => {
    const env = setup()
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)
    vi.advanceTimersByTime(60_000)

    env.service.enable(temperature)
    expect(layerOf(env.store, temperature).load).toMatchObject({
      kind: 'loading',
      stale: { data: dataOf(1) },
    })
    expect(env.events).toContainEqual(
      expect.objectContaining({ kind: 'cache-hit', layerId: temperature, ageMs: 60_000 }),
    )

    env.controlled.call(1).resolve(dataOf(2))
    await vi.runAllTimersAsync()
    expect(layerOf(env.store, temperature).load).toMatchObject({ kind: 'success', data: dataOf(2) })
  })

  it('R11: кэш есть, повторный запрос упал — error со stale', async () => {
    const env = setup()
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)

    env.service.enable(temperature)
    env.controlled.call(1).reject(serverError())
    await vi.runAllTimersAsync()

    expect(layerOf(env.store, temperature).load).toMatchObject({
      kind: 'error',
      attempt: 1,
      stale: { data: dataOf(1) },
    })
  })

  it('R11: retry из error сохраняет stale', async () => {
    const env = setup()
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)
    env.service.enable(temperature)
    env.controlled.call(1).reject(serverError())
    await vi.runAllTimersAsync()

    env.service.retry(temperature)

    expect(layerOf(env.store, temperature).load).toMatchObject({
      kind: 'loading',
      stale: { data: dataOf(1) },
    })
  })

  it('R12: устаревший ответ r1 пришёл после r2 — в кэше данные r2', async () => {
    const fetch = createControlledFetch({ honorAbort: false })
    const env = setup({ fetchLayerData: fetch.fetchLayerData })

    env.service.enable(temperature)
    env.service.disable(temperature)
    env.service.enable(temperature)
    fetch.call(1).resolve(dataOf(2))
    await vi.runAllTimersAsync()
    fetch.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(env.cache.get(temperature)?.data).toEqual(dataOf(2))
    expect(env.events.filter((event) => event.kind === 'cache-updated')).toHaveLength(1)
    expect(env.events).toContainEqual(
      expect.objectContaining({ kind: 'stale-dropped', requestId: 1 }),
    )
  })

  it('R13: вкл после истечения TTL — stale = null, запись кэша удалена', async () => {
    const env = setup({ cache: { ttlMs: 10_000 } })
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)
    vi.advanceTimersByTime(10_001)

    env.service.enable(temperature)

    expect(layerOf(env.store, temperature).load).toMatchObject({ kind: 'loading', stale: null })
    expect(env.cache.getStats().size).toBe(0)
    expect(env.events).toContainEqual(expect.objectContaining({ kind: 'cache-expired' }))
  })

  it('retry после истечения TTL не показывает просроченные данные', async () => {
    const env = setup({ cache: { ttlMs: 10_000 } })
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)
    env.service.enable(temperature)
    env.controlled.call(1).reject(serverError())
    await vi.runAllTimersAsync()
    vi.advanceTimersByTime(60_000)

    env.service.retry(temperature)

    expect(layerOf(env.store, temperature).load).toMatchObject({ kind: 'loading', stale: null })
  })

  it('R14: 60 слоёв при лимите 50 — в кэше 50, вытеснены самые давно использованные', async () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(60))
    const env = setup({ registry })
    env.service.enableAll()
    registry.ids.forEach((_id, index) => {
      env.controlled.call(index).resolve(dataOf(index))
    })
    await vi.runAllTimersAsync()

    expect(env.cache.getStats()).toEqual({ size: 50, limit: 50 })
    const [first, , , , , , , , , , eleventh] = registry.ids
    if (first === undefined || eleventh === undefined) throw new Error('нет слоёв')
    expect(env.cache.get(first)).toBeNull()
    expect(env.cache.get(eleventh)).not.toBeNull()
  })

  it('R15: кэш выключен — поведение как без кэша', async () => {
    const env = setup({ cache: { enabled: false } })
    await loadOnce(env, temperature, 0, 1)
    env.service.disable(temperature)

    env.service.enable(temperature)

    expect(layerOf(env.store, temperature).load).toMatchObject({ kind: 'loading', stale: null })
    expect(env.cache.getStats().size).toBe(0)
  })

  it('выключение слоя не очищает кэш', async () => {
    const env = setup()
    await loadOnce(env, temperature, 0, 1)

    env.service.disable(temperature)

    expect(env.cache.get(temperature)?.data).toEqual(dataOf(1))
  })

  it('clearCache очищает кэш и не трогает стор', async () => {
    const env = setup()
    await loadOnce(env, temperature, 0, 1)
    const layer = layerOf(env.store, temperature)

    env.service.clearCache()

    expect(env.cache.getStats().size).toBe(0)
    expect(layerOf(env.store, temperature)).toBe(layer)
  })
})

describe('массовые команды (ТЗ §5)', () => {
  it('enableAll и disableAll — одним dispatch на изменение флагов', () => {
    const { store, service } = setup()
    let dispatches = 0
    store.on('@state', () => {
      dispatches += 1
    })
    dispatches = 0

    service.enableAll()
    expect(dispatches).toBe(1)
    service.disableAll()
    expect(dispatches).toBe(2)
  })

  it('события массовой команды уходят одной пачкой', () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(100))
    const store = createLayerStore(registry)
    const batches: number[] = []
    const service = createLayerService({
      store,
      cache: createLayerCache({ now: Date.now }),
      now: Date.now,
      fetchLayerData: createControlledFetch().fetchLayerData,
      onEvents: (events) => {
        batches.push(events.length)
      },
    })

    service.enableAll()
    service.disableAll()

    expect(batches).toEqual([100, 100])
  })

  it('retryFailed перезапускает только слои в error', async () => {
    const { store, service, controlled } = setup()
    service.enableAll()
    controlled.call(0).reject(serverError())
    controlled.call(1).resolve(dataOf(1))
    controlled.call(2).reject(serverError())
    await vi.runAllTimersAsync()

    service.retryFailed()

    expect(controlled.calls).toHaveLength(5)
    expect(layerOf(store, wind).load.kind).toBe('success')
  })
})

describe('устойчивость', () => {
  it('подписчик стора выключает слой во время dispatch — запрос отменён, inFlight согласован', async () => {
    const { store, service, controlled } = setup()
    store.on('byId', (byId) => {
      if (byId[temperature]?.load.kind === 'loading') service.disable(temperature)
    })

    service.enable(temperature)
    await vi.runAllTimersAsync()

    expect(layerOf(store, temperature).load.kind).toBe('idle')
    expect(service.inFlightCount()).toBe(0)
    expect(controlled.calls).toHaveLength(0)
  })

  it('синхронная ошибка транспорта переводит слои в error, а не оставляет в loading', async () => {
    const { store, service } = setup({
      fetchLayerData: () => {
        throw new Error('сломался транспорт')
      },
    })

    service.enableAll()
    await vi.runAllTimersAsync()

    for (const id of store.get('ids')) expect(layerOf(store, id).load.kind).toBe('error')
    expect(service.inFlightCount()).toBe(0)
  })

  it('cancelAll отменяет всё в полёте', () => {
    const { service, controlled } = setup()
    service.enableAll()

    service.cancelAll()

    expect(service.inFlightCount()).toBe(0)
    expect(controlled.calls.every((call) => call.signal.aborted)).toBe(true)
  })
})

describe('отложенный старт массовых запросов', () => {
  const setupDeferred = (count: number) => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(count))
    const store = createLayerStore(registry)
    const controlled = createControlledFetch()
    const tasks: (() => void)[] = []
    const batches: LayerEventInput['kind'][][] = []
    const service = createLayerService({
      store,
      cache: createLayerCache({ now: Date.now }),
      now: Date.now,
      fetchLayerData: controlled.fetchLayerData,
      onEvents: (events) => {
        batches.push(events.map((event) => event.kind))
      },
      scheduleBulkRequests: (task) => {
        tasks.push(task)
      },
    })
    const flush = () => {
      for (const task of tasks.splice(0)) task()
    }

    return { store, service, controlled, batches, flush }
  }

  it('enableAll на 100 слоях: loading сразу, запросы — в следующей задаче одной пачкой событий', () => {
    const { store, service, controlled, batches, flush } = setupDeferred(100)

    service.enableAll()

    expect(store.get('ids').every((id) => layerOf(store, id).load.kind === 'loading')).toBe(true)
    expect(controlled.calls).toHaveLength(0)

    flush()

    expect(controlled.calls).toHaveLength(100)
    expect(batches).toHaveLength(1)
    expect(batches[0]?.every((kind) => kind === 'request')).toBe(true)
  })

  it('выключение до отложенного старта: запросов нет, inFlight пуст', () => {
    const { store, service, controlled, flush } = setupDeferred(100)
    const first = store.get('ids')[0]
    if (first === undefined) throw new Error('Нет слоёв')

    service.enableAll()
    service.disable(first)
    flush()

    expect(controlled.calls).toHaveLength(99)
    expect(controlled.calls.some((call) => call.id === first)).toBe(false)

    service.disableAll()
    flush()

    expect(service.inFlightCount()).toBe(0)
  })

  it('повторный enableAll до старта: уходит только последнее поколение запросов', () => {
    const { service, controlled, flush } = setupDeferred(100)

    service.enableAll()
    service.disableAll()
    service.enableAll()
    flush()

    expect(controlled.calls).toHaveLength(100)
    expect(service.inFlightCount()).toBe(100)
  })

  it('одиночная команда не откладывается', () => {
    const { store, service, controlled } = setupDeferred(100)
    const first = store.get('ids')[0]
    if (first === undefined) throw new Error('Нет слоёв')

    service.enable(first)

    expect(controlled.calls).toHaveLength(1)
  })
})

describe('ответы массовой загрузки применяются пачкой', () => {
  const setupCollected = (count: number) => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(count))
    const store = createLayerStore(registry)
    const controlled = createControlledFetch({ honorAbort: false })
    const flushes: (() => void)[] = []
    const service = createLayerService({
      store,
      cache: createLayerCache({ now: Date.now }),
      now: Date.now,
      fetchLayerData: controlled.fetchLayerData,
      scheduleResponseFlush: (flush) => {
        flushes.push(flush)
      },
    })
    let dispatches = 0
    store.on('byId', () => {
      dispatches += 1
    })
    const flush = () => {
      for (const task of flushes.splice(0)) task()
    }
    const resetDispatches = () => {
      dispatches = 0
    }

    return {
      store,
      service,
      controlled,
      flush,
      flushes,
      dispatches: () => dispatches,
      resetDispatches,
    }
  }

  it('100 ответов — один dispatch', async () => {
    const { store, service, controlled, flush, flushes, dispatches, resetDispatches } =
      setupCollected(100)
    service.enableAll()
    resetDispatches()

    controlled.calls.forEach((call, index) => {
      call.resolve(dataOf(index))
    })
    await vi.runAllTimersAsync()

    expect(dispatches()).toBe(0)
    expect(flushes).toHaveLength(1)
    flush()

    expect(dispatches()).toBe(1)
    expect(store.get('ids').every((id) => layerOf(store, id).load.kind === 'success')).toBe(true)
    expect(service.inFlightCount()).toBe(0)
  })

  it('слой выключен между ответом и применением — ответ отброшен', async () => {
    const { store, service, controlled, flush } = setupCollected(100)
    const first = store.get('ids')[0]
    if (first === undefined) throw new Error('Нет слоёв')
    service.enableAll()

    controlled.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()
    service.disable(first)
    flush()

    expect(layerOf(store, first).load.kind).toBe('idle')
  })

  it('меньше 50 запросов в полёте — ответ применяется сразу', async () => {
    const { store, service, controlled, flushes } = setupCollected(100)
    const first = store.get('ids')[0]
    if (first === undefined) throw new Error('Нет слоёв')

    service.enable(first)
    controlled.call(0).resolve(dataOf(1))
    await vi.runAllTimersAsync()

    expect(flushes).toHaveLength(0)
    expect(layerOf(store, first).load.kind).toBe('success')
  })
})
