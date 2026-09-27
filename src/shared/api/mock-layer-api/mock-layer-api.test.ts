import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GRID_BBOX, GRID_STEP } from './grid'
import {
  createMockLayerApi,
  isAbortError,
  LayerApiError,
  type MockLayerApi,
} from './mock-layer-api'

const TEMPERATURE = { valueRange: [-20, 40], withDirection: false } as const
const WIND = { valueRange: [0, 25], withDirection: true } as const

const describeLayer = (id: string) => (id === 'wind' ? WIND : TEMPERATURE)

const createApi = (settings: Parameters<typeof createMockLayerApi>[0]['settings'] = {}) =>
  createMockLayerApi({
    describeLayer,
    settings: { minDelayMs: 300, maxDelayMs: 2000, errorRate: 0, seed: 42, ...settings },
  })

const run = async (api: MockLayerApi, id: string) => {
  const startedAt = Date.now()
  const promise = api.fetchLayerData(id, { signal: new AbortController().signal })
  const settled = promise.then(
    (data) => ({ ok: true as const, data, at: Date.now() - startedAt }),
    (error: unknown) => ({ ok: false as const, error, at: Date.now() - startedAt }),
  )
  await vi.runAllTimersAsync()

  return settled
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('mock API: данные (ТЗ §4.4)', () => {
  it('отдаёт GeoJSON-сетку по территории Кыргызстана с шагом 0.25°', async () => {
    const result = await run(createApi(), 'temperature')
    if (!result.ok) throw new Error('ожидался успех')

    const { data } = result
    const cols = Math.ceil((GRID_BBOX.east - GRID_BBOX.west) / GRID_STEP)
    const rows = Math.ceil((GRID_BBOX.north - GRID_BBOX.south) / GRID_STEP)

    expect(data.type).toBe('FeatureCollection')
    expect(data.features).toHaveLength(cols * rows)
    for (const feature of data.features) {
      const ring = feature.geometry.coordinates[0] ?? []
      expect(ring).toHaveLength(5)
      for (const [lng, lat] of ring) {
        expect(lng).toBeGreaterThanOrEqual(GRID_BBOX.west)
        expect(lng).toBeLessThanOrEqual(GRID_BBOX.east + GRID_STEP)
        expect(lat).toBeGreaterThanOrEqual(GRID_BBOX.south)
        expect(lat).toBeLessThanOrEqual(GRID_BBOX.north + GRID_STEP)
      }
    }
  })

  it('значения лежат в valueRange слоя, у слоёв без направления direction = null', async () => {
    const result = await run(createApi(), 'temperature')
    if (!result.ok) throw new Error('ожидался успех')

    for (const { properties } of result.data.features) {
      expect(properties.value).toBeGreaterThanOrEqual(-20)
      expect(properties.value).toBeLessThanOrEqual(40)
      expect(properties.direction).toBeNull()
    }
  })

  it('у ветра в каждой ячейке есть direction 0–360°', async () => {
    const result = await run(createApi(), 'wind')
    if (!result.ok) throw new Error('ожидался успех')

    for (const { properties } of result.data.features) {
      expect(properties.value).toBeGreaterThanOrEqual(0)
      expect(properties.value).toBeLessThanOrEqual(25)
      expect(properties.direction).not.toBeNull()
      expect(properties.direction).toBeGreaterThanOrEqual(0)
      expect(properties.direction).toBeLessThan(360)
    }
  })

  it('поле плавное: соседние ячейки отличаются в среднем меньше чем на 5 % диапазона', async () => {
    const result = await run(createApi(), 'temperature')
    if (!result.ok) throw new Error('ожидался успех')

    const values = result.data.features.map((feature) => feature.properties.value)
    const diffs = values.slice(1).map((value, index) => Math.abs(value - (values[index] ?? value)))
    const meanDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length

    expect(meanDiff).toBeLessThan(0.05 * 60)
  })
})

describe('mock API: задержка и ошибки', () => {
  it('задержка лежит в [min, max]', async () => {
    const api = createApi({ minDelayMs: 500, maxDelayMs: 900 })

    for (let index = 0; index < 20; index += 1) {
      const { at } = await run(api, 'temperature')
      expect(at).toBeGreaterThanOrEqual(500)
      expect(at).toBeLessThanOrEqual(900)
    }
  })

  it('при доле ошибок 100 % отклоняется типизированной ошибкой с текстом на русском', async () => {
    const result = await run(createApi({ errorRate: 1 }), 'temperature')
    if (result.ok) throw new Error('ожидалась ошибка')

    expect(result.error).toBeInstanceOf(LayerApiError)
    if (!(result.error instanceof LayerApiError)) return
    expect(['network', 'server', 'timeout']).toContain(result.error.kind)
    expect(result.error.message).toMatch(/[а-я]/i)
  })

  it('при доле ошибок 0 % не падает', async () => {
    const api = createApi({ errorRate: 0 })

    for (let index = 0; index < 20; index += 1) {
      const result = await run(api, 'temperature')
      expect(result.ok).toBe(true)
    }
  })

  it('доля ошибок примерно соответствует настройке', async () => {
    const api = createApi({ errorRate: 0.2, minDelayMs: 0, maxDelayMs: 0 })
    let failed = 0
    for (let index = 0; index < 500; index += 1) {
      const result = await run(api, 'temperature')
      if (!result.ok) failed += 1
    }

    expect(failed / 500).toBeGreaterThan(0.12)
    expect(failed / 500).toBeLessThan(0.28)
  })
})

describe('mock API: детерминизм', () => {
  it('при одном seed одинаковые запросы дают одинаковые задержки, ошибки и данные', async () => {
    const sequence = ['temperature', 'wind', 'temperature', 'wind', 'temperature']
    const first = createApi({ errorRate: 0.4 })
    const second = createApi({ errorRate: 0.4 })

    for (const id of sequence) {
      const a = await run(first, id)
      const b = await run(second, id)
      expect(b).toEqual(a)
    }
  })

  it('другой seed даёт другие данные', async () => {
    const a = await run(createApi({ seed: 1 }), 'temperature')
    const b = await run(createApi({ seed: 2 }), 'temperature')
    if (!a.ok || !b.ok) throw new Error('ожидался успех')

    expect(b.data).not.toEqual(a.data)
  })

  it('смена seed через configure перезапускает последовательность', async () => {
    const api = createApi({ errorRate: 0.4 })
    const firstRun = await run(api, 'temperature')
    await run(api, 'wind')

    api.configure({ seed: 42 })

    expect(await run(api, 'temperature')).toEqual(firstRun)
  })
})

describe('mock API: отмена', () => {
  it('abort отклоняет промис сразу с AbortError и очищает таймер', async () => {
    const api = createApi()
    const controller = new AbortController()
    const promise = api.fetchLayerData('temperature', { signal: controller.signal })
    const rejection = promise.catch((error: unknown) => error)

    controller.abort()

    expect(isAbortError(await rejection)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('уже отменённый signal отклоняет запрос без задержки', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await createApi()
      .fetchLayerData('temperature', { signal: controller.signal })
      .catch((reason: unknown) => reason)

    expect(isAbortError(error)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('как fetch: отклоняет с причиной из signal, не создавая новую ошибку', async () => {
    const reason = new DOMException('Отменено тестом', 'AbortError')
    const controller = new AbortController()
    const rejection = createApi()
      .fetchLayerData('temperature', { signal: controller.signal })
      .catch((error: unknown) => error)

    controller.abort(reason)

    expect(await rejection).toBe(reason)
  })

  it('ignoreAbort: сервер отвечает, несмотря на отмену', async () => {
    const api = createApi({ ignoreAbort: true })
    const controller = new AbortController()
    const promise = api.fetchLayerData('temperature', { signal: controller.signal })

    controller.abort()
    await vi.runAllTimersAsync()

    expect((await promise).features.length).toBeGreaterThan(0)
  })

  it('ignoreAbort: отвечает даже на запрос с уже отменённым signal', async () => {
    const controller = new AbortController()
    controller.abort()
    const promise = createApi({ ignoreAbort: true }).fetchLayerData('temperature', {
      signal: controller.signal,
    })

    await vi.runAllTimersAsync()

    expect((await promise).features.length).toBeGreaterThan(0)
  })

  it('ошибка сервера — не AbortError', async () => {
    const result = await run(createApi({ errorRate: 1 }), 'temperature')

    expect(result.ok ? null : isAbortError(result.error)).toBe(false)
  })
})
