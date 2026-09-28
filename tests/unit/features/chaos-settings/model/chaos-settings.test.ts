import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  setErrorRate,
  setSeed,
  spamClick,
  stopSpam,
  toggleCache,
  toggleIgnoreAbort,
  updateChaosSettings,
} from '@/features/chaos-settings/model/chaos-settings'

import {
  baseLayerRegistry,
  layerApi,
  layerCache,
  layerCommands,
  switchLayerSet,
} from '@/entities/layer'
import { layerEventLog } from '@/entities/layer/model/runtime'

beforeEach(() => {
  vi.useFakeTimers()
  switchLayerSet(baseLayerRegistry)
})

afterEach(() => {
  stopSpam()
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

  it('спам-клик останавливается командой stopSpam', () => {
    const toggle = vi.spyOn(layerCommands, 'toggle')

    spamClick()
    vi.advanceTimersByTime(100)
    stopSpam()
    vi.advanceTimersByTime(1000)

    expect(toggle).toHaveBeenCalledTimes(4)
  })

  it('повторный спам-клик останавливает предыдущий запуск', () => {
    const toggle = vi.spyOn(layerCommands, 'toggle')

    spamClick()
    vi.advanceTimersByTime(100)
    spamClick()
    vi.advanceTimersByTime(1000)

    expect(toggle).toHaveBeenCalledTimes(24)
  })

  it('переключатели и сеттеры — команды с одним значением', () => {
    const initial = layerApi.getSettings().ignoreAbort

    toggleIgnoreAbort()
    toggleCache()
    setErrorRate(0.3)
    setSeed(77)

    expect(layerApi.getSettings()).toMatchObject({
      ignoreAbort: !initial,
      errorRate: 0.3,
      seed: 77,
    })
    expect(layerCache.getSettings().enabled).toBe(false)
    toggleIgnoreAbort()
    toggleCache()
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
