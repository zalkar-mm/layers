import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStressMode } from '@/features/stress-mode/model/stress-mode'

import {
  getActiveRegistry,
  layerApi,
  layerCache,
  layerCommands,
  type LayersById,
  subscribeToLayers,
} from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'

const DELAY = 500
const temperature = layerId('temperature')
const wind = layerId('wind')

const currentLayers = (): LayersById => {
  let current: LayersById = {}
  subscribeToLayers((byId) => {
    current = byId
  })()

  return current
}

const layer = (id: ReturnType<typeof layerId>) => {
  const found = currentLayers()[id]
  if (found === undefined) throw new Error(`Нет слоя ${id}`)

  return found
}

beforeEach(() => {
  vi.useFakeTimers()
  layerCache.clear()
  layerCache.configure({ enabled: true, ttlMs: 5 * 60_000 })
  layerApi.configure({ seed: 1, errorRate: 0, minDelayMs: DELAY, maxDelayMs: DELAY })
})

afterEach(async () => {
  setStressMode(3)
  layerCommands.disableAll()
  await vi.runOnlyPendingTimersAsync()
  vi.useRealTimers()
})

describe('возврат из стресс-режима (БАГ-1, ТЗ §10.2)', () => {
  it('слой грузился в момент ухода: после возврата — ровно один новый запрос и success', async () => {
    layerCommands.enable(temperature)
    expect(layerCommands.inFlightCount()).toBe(1)

    setStressMode(100)
    expect(layerCommands.inFlightCount()).toBe(0)
    setStressMode(3)

    expect(layer(temperature)).toMatchObject({ enabled: true, load: { kind: 'loading' } })
    expect(layerCommands.inFlightCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(layer(temperature).load.kind).toBe('success')
  })

  it('данные в кэше: после возврата сразу loading со stale, затем success (как R10)', async () => {
    layerCommands.enable(temperature)
    await vi.advanceTimersByTimeAsync(DELAY)

    setStressMode(1000)
    setStressMode(3)

    const { load } = layer(temperature)
    expect(load.kind).toBe('loading')
    expect(load.kind === 'loading' ? load.stale : null).not.toBeNull()
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(layer(temperature).load.kind).toBe('success')
  })

  it('серия быстрых переключений 3 → 100 → 1000 → 100 → 3 — состояние на месте, лишних запросов нет', () => {
    layerCommands.setOpacity(wind, 0.25)
    layerCommands.enable(wind)

    setStressMode(100)
    setStressMode(1000)
    setStressMode(100)
    setStressMode(3)

    expect(getActiveRegistry().ids).toHaveLength(3)
    expect(layer(wind)).toMatchObject({ enabled: true, opacity: 0.25 })
    expect(layer(temperature).enabled).toBe(false)
    expect(layerCommands.inFlightCount()).toBe(1)
  })

  it('выключенный перед уходом слой не включается при возврате', () => {
    layerCommands.enable(temperature)
    layerCommands.disable(temperature)

    setStressMode(100)
    setStressMode(3)

    expect(layer(temperature)).toMatchObject({ enabled: false, load: { kind: 'idle' } })
    expect(layerCommands.inFlightCount()).toBe(0)
  })
})
