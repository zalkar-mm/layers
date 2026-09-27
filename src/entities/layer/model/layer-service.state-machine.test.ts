import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type FetchLayerData, LayerApiError, type LayerData } from '@/shared/api'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import { createLayerCache } from './cache'
import type { LayerEventInput } from './event-log'
import { createLayerService } from './layer-service'
import { createLayerStore } from './store'
import type { LayerState } from './types'

// Таблица машины состояний ТЗ §5.2 — один тест на строку, номер строки в имени (§5.2/N).
// Сценарии гонок R1–R15 — в layer-service.test.ts, случайные последовательности — в *.invariants.test.ts.

const temperature = layerId('temperature')
const TTL_MS = 5 * 60_000

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

type Pending = {
  readonly signal: AbortSignal
  readonly resolve: (data: LayerData) => void
  readonly reject: (error: unknown) => void
}

const setup = ({ honorAbort = true } = {}) => {
  const store = createLayerStore(baseLayerRegistry)
  const cache = createLayerCache({ now: () => Date.now(), settings: { ttlMs: TTL_MS } })
  const calls: Pending[] = []
  const events: LayerEventInput[] = []
  const fetchLayerData: FetchLayerData = (_id, { signal }) =>
    new Promise<LayerData>((resolve, reject) => {
      calls.push({ signal, resolve, reject })
      if (honorAbort) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Запрос отменён', 'AbortError'))
        })
      }
    })
  const service = createLayerService({
    store,
    cache,
    now: () => Date.now(),
    fetchLayerData,
    onEvents: (batch) => {
      events.push(...batch)
    },
  })
  const layer = (): LayerState => {
    const found = store.get('byId')[temperature]
    if (found === undefined) throw new Error('Нет слоя')

    return found
  }
  const call = (index: number): Pending => {
    const found = calls[index]
    if (found === undefined) throw new Error(`Запроса №${String(index)} не было`)

    return found
  }
  const answer = async (index: number, data: LayerData) => {
    call(index).resolve(data)
    await vi.advanceTimersByTimeAsync(0)
  }
  const fail = async (index: number) => {
    call(index).reject(new LayerApiError('server', 'Сервер вернул ошибку'))
    await vi.advanceTimersByTimeAsync(0)
  }
  const kinds = () => events.map((event) => event.kind)

  return { store, cache, service, calls, layer, call, answer, fail, kinds }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-26T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('машина состояний слоя (ТЗ §5.2)', () => {
  it('§5.2/1: выкл/idle без кэша + enable → вкл/loading(stale=null), запрос r1', () => {
    const { service, layer, calls } = setup()

    service.enable(temperature)

    expect(layer()).toMatchObject({ enabled: true, load: { kind: 'loading', stale: null } })
    expect(calls).toHaveLength(1)
  })

  it('§5.2/2: выкл/idle со свежим кэшем + enable → loading(stale=кэш), событие cache-hit', async () => {
    const { service, layer, calls, answer, kinds } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))
    service.disable(temperature)

    service.enable(temperature)

    expect(layer().load).toMatchObject({ kind: 'loading', stale: { data: dataOf(1) } })
    expect(calls).toHaveLength(2)
    expect(kinds()).toContain('cache-hit')
  })

  it('§5.2/3: выкл/idle с просроченным кэшем + enable → loading(stale=null), запись удалена', async () => {
    const { service, layer, cache, answer, kinds } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))
    service.disable(temperature)
    vi.advanceTimersByTime(TTL_MS + 1)

    service.enable(temperature)

    expect(layer().load).toMatchObject({ kind: 'loading', stale: null })
    expect(cache.getStats().size).toBe(0)
    expect(kinds()).toContain('cache-expired')
  })

  it('§5.2/4: вкл/loading(r1) + disable → выкл/idle, abort r1', () => {
    const { service, layer, call } = setup()
    service.enable(temperature)

    service.disable(temperature)

    expect(layer()).toMatchObject({ enabled: false, load: { kind: 'idle' } })
    expect(call(0).signal.aborted).toBe(true)
    expect(service.inFlightCount()).toBe(0)
  })

  it('§5.2/5: вкл/loading(r1) + ответ r1 → success, запись в кэш', async () => {
    const { service, layer, cache, answer } = setup()
    service.enable(temperature)

    await answer(0, dataOf(1))

    expect(layer().load).toMatchObject({ kind: 'success', data: dataOf(1), source: 'network' })
    expect(cache.get(temperature)?.data).toEqual(dataOf(1))
  })

  it('§5.2/6: вкл/loading(r1) + ошибка r1 → error(attempt+1), stale сохранён', async () => {
    const { service, layer, answer, fail } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))
    service.refresh(temperature)
    const { load } = layer()
    const stale = load.kind === 'loading' ? load.stale : null

    await fail(1)

    expect(layer().load).toMatchObject({ kind: 'error', attempt: 1 })
    expect(layer().load.kind === 'error' ? layer().load : null).toHaveProperty('stale', stale)
    expect(stale).not.toBeNull()
  })

  it('§5.2/7: вкл/loading(r2) + устаревший ответ r1 → без изменений, в кэш не пишется', async () => {
    // Abort не отклоняет промис: запрос «успел ответить» (как R8).
    const { service, layer, cache, calls } = setup({ honorAbort: false })
    service.enable(temperature)
    service.disable(temperature)
    service.enable(temperature)
    const before = layer()

    calls[0]?.resolve(dataOf(1))
    await vi.advanceTimersByTimeAsync(0)

    expect(layer()).toBe(before)
    expect(cache.getStats().size).toBe(0)
  })

  it('§5.2/8: вкл/error + retry → loading(r2), stale сохранён', async () => {
    const { service, layer, answer, fail, calls } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))
    service.refresh(temperature)
    await fail(1)
    const { load } = layer()
    const stale = load.kind === 'error' ? load.stale : null

    service.retry(temperature)

    expect(layer().load).toMatchObject({ kind: 'loading' })
    expect(layer().load.kind === 'loading' ? layer().load : null).toHaveProperty('stale', stale)
    expect(calls).toHaveLength(3)
  })

  it('§5.2/9: вкл/error + disable → выкл/idle, attempt сброшен', async () => {
    const { service, layer, fail } = setup()
    service.enable(temperature)
    await fail(0)
    service.retry(temperature)
    await fail(1)
    expect(layer().load).toMatchObject({ kind: 'error', attempt: 2 })

    service.disable(temperature)
    service.enable(temperature)
    await fail(2)

    expect(layer().load).toMatchObject({ kind: 'error', attempt: 1 })
  })

  it('§5.2/10: вкл/success + refresh → loading(r2, stale=текущие данные)', async () => {
    const { service, layer, answer, calls } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))

    service.refresh(temperature)

    expect(layer().load).toMatchObject({ kind: 'loading', stale: { data: dataOf(1) } })
    expect(calls).toHaveLength(2)
  })

  it('§5.2/11: вкл/success + disable → выкл/idle, данные остаются в кэше', async () => {
    const { service, layer, cache, answer } = setup()
    service.enable(temperature)
    await answer(0, dataOf(1))

    service.disable(temperature)

    expect(layer()).toMatchObject({ enabled: false, load: { kind: 'idle' } })
    expect(cache.get(temperature)?.data).toEqual(dataOf(1))
  })

  it('§5.2/12: вкл/loading + retry / refresh → без изменений, команда игнорируется', () => {
    const { service, layer, calls, store } = setup()
    service.enable(temperature)
    const byId = store.get('byId')
    const before = layer()

    service.retry(temperature)
    service.refresh(temperature)

    expect(layer()).toBe(before)
    expect(store.get('byId')).toBe(byId)
    expect(calls).toHaveLength(1)
  })

  it('§5.2/13: любое состояние + setOpacity → то же состояние загрузки, новая opacity', async () => {
    const { service, layer, answer } = setup()
    service.setOpacity(temperature, 0.3)
    expect(layer()).toMatchObject({ enabled: false, opacity: 0.3, load: { kind: 'idle' } })

    service.enable(temperature)
    const loading = layer().load
    service.setOpacity(temperature, 1.5)
    expect(layer().opacity).toBe(1)
    expect(layer().load).toBe(loading)

    await answer(0, dataOf(1))
    const success = layer().load
    service.setOpacity(temperature, -1)
    expect(layer().opacity).toBe(0)
    expect(layer().load).toBe(success)
  })
})

describe('отмена — не ошибка (ТЗ §5.1)', () => {
  it('I5: отменённый запрос не пишет в лог ни ошибку, ни «отброшен»', async () => {
    const { service, answer, kinds } = setup()
    service.enable(temperature)
    service.disable(temperature)
    service.enable(temperature)
    await answer(1, dataOf(2))
    service.refresh(temperature)
    service.disable(temperature)
    await vi.advanceTimersByTimeAsync(0)

    expect(kinds().filter((kind) => kind === 'abort')).toHaveLength(2)
    expect(kinds()).not.toContain('stale-dropped')
    expect(kinds()).not.toContain('error')
  })
})
