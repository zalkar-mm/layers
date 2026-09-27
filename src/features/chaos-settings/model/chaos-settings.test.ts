import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  baseLayerRegistry,
  layerApi,
  layerCache,
  layerCommands,
  layerEventLog,
  switchLayerSet,
} from '@/entities/layer'

import { spamClick, updateChaosSettings } from './chaos-settings'

beforeEach(() => {
  vi.useFakeTimers()
  switchLayerSet(baseLayerRegistry)
})

afterEach(() => {
  layerCommands.cancelAll()
  vi.useRealTimers()
})

describe('настройки Chaos-панели (ТЗ §10.1)', () => {
  it('применяются к mock API и кэшу', () => {
    updateChaosSettings({ minDelayMs: 100, maxDelayMs: 400, errorRate: 0.5, seed: 9 })
    updateChaosSettings({ cacheEnabled: false, cacheTtlMs: 30_000 })

    expect(layerApi.getSettings()).toMatchObject({
      minDelayMs: 100,
      maxDelayMs: 400,
      errorRate: 0.5,
      seed: 9,
    })
    expect(layerCache.getSettings()).toMatchObject({ enabled: false, ttlMs: 30_000 })
    updateChaosSettings({ cacheEnabled: true })
  })

  it('держит min ≤ max: сдвиг min выше max подтягивает max', () => {
    updateChaosSettings({ minDelayMs: 300, maxDelayMs: 2000 })

    updateChaosSettings({ minDelayMs: 3000 })

    expect(layerApi.getSettings()).toMatchObject({ minDelayMs: 3000, maxDelayMs: 3000 })
  })

  it('держит min ≤ max: сдвиг max ниже min подтягивает min', () => {
    updateChaosSettings({ minDelayMs: 1000, maxDelayMs: 2000 })

    updateChaosSettings({ maxDelayMs: 500 })

    expect(layerApi.getSettings()).toMatchObject({ minDelayMs: 500, maxDelayMs: 500 })
  })

  it('спам-клик: 20 переключений одного слоя за 500 мс', () => {
    const toggle = vi.spyOn(layerCommands, 'toggle')

    spamClick()
    vi.advanceTimersByTime(500)

    expect(toggle).toHaveBeenCalledTimes(20)
    expect(new Set(toggle.mock.calls.map(([id]) => id)).size).toBe(1)
  })

  it('спам-клик останавливается функцией остановки', () => {
    const toggle = vi.spyOn(layerCommands, 'toggle')

    const stop = spamClick()
    vi.advanceTimersByTime(100)
    stop()
    vi.advanceTimersByTime(1000)

    expect(toggle).toHaveBeenCalledTimes(4)
  })

  it('«Сервер отвечает, несмотря на отмену»: спам-клик даёт в логе «отброшен» (БАГ-4)', async () => {
    updateChaosSettings({ ignoreAbort: true, errorRate: 0, minDelayMs: 300, maxDelayMs: 300 })
    expect(layerApi.getSettings().ignoreAbort).toBe(true)
    layerEventLog.clear()

    spamClick()
    await vi.advanceTimersByTimeAsync(2000)

    const kinds = layerEventLog.store.get('events').map((event) => event.kind)
    expect(kinds).toContain('abort')
    expect(kinds).toContain('stale-dropped')
    updateChaosSettings({ ignoreAbort: false })
  })

  it('по умолчанию сервер честно отменяет запрос: «отброшен» не появляется', async () => {
    updateChaosSettings({ ignoreAbort: false, errorRate: 0, minDelayMs: 300, maxDelayMs: 300 })
    layerEventLog.clear()

    spamClick()
    await vi.advanceTimersByTimeAsync(2000)

    const kinds = layerEventLog.store.get('events').map((event) => event.kind)
    expect(kinds).toContain('abort')
    expect(kinds).not.toContain('stale-dropped')
  })
})
