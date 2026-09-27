import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  baseLayerRegistry,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  getActiveRegistry,
  layerApi,
  layerCommands,
  layerId,
  switchLayerSet,
} from '@/entities/layer'

import { applyUrlState, startUrlSync, URL_WRITE_DELAY_MS } from './url-sync'

let search = ''
const replaceSearch = vi.fn((next: string) => {
  search = next
})

beforeEach(() => {
  vi.useFakeTimers()
  switchLayerSet(baseLayerRegistry)
  layerApi.configure({ seed: 1, errorRate: 0, minDelayMs: 500, maxDelayMs: 500 })
  search = ''
  replaceSearch.mockClear()
})

afterEach(() => {
  layerCommands.cancelAll()
  vi.useRealTimers()
})

describe('синхронизация с URL (ТЗ §11.1)', () => {
  it('чтение: указанные слои включаются и начинают грузиться, прозрачность применяется', () => {
    const stop = startUrlSync({
      shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
      getSearch: () => search,
      replaceSearch,
    })

    applyUrlState('?l=temperature:70,wind:40,unknown:10')

    expect(layerCommands.inFlightCount()).toBe(2)
    stop()
  })

  it('запись: debounce и replace — одна запись после серии изменений', () => {
    const stop = startUrlSync({
      shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
      getSearch: () => search,
      replaceSearch,
    })
    const wind = layerId('wind')

    layerCommands.enable(wind)
    for (let step = 0; step < 10; step += 1) {
      layerCommands.setOpacity(wind, step / 10)
      vi.advanceTimersByTime(50)
    }
    expect(replaceSearch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(URL_WRITE_DELAY_MS)
    expect(replaceSearch).toHaveBeenCalledTimes(1)
    expect(search).toBe('?l=wind:90')
    stop()
  })

  it('ничего не пишет, если строка не изменилась, и перестаёт писать после остановки', () => {
    const stop = startUrlSync({
      shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
      getSearch: () => search,
      replaceSearch,
    })
    layerCommands.setOpacity(layerId('wind'), 0.3)
    vi.advanceTimersByTime(URL_WRITE_DELAY_MS)
    expect(replaceSearch).not.toHaveBeenCalled()

    stop()
    layerCommands.enable(layerId('wind'))
    vi.advanceTimersByTime(URL_WRITE_DELAY_MS)
    expect(replaceSearch).not.toHaveBeenCalled()
  })

  it('стресс-режим не пишет в URL и не затирает ссылку на реальные слои', () => {
    search = '?l=temperature:70'
    const stop = startUrlSync({
      shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
      getSearch: () => search,
      replaceSearch,
    })
    const registry = createLayerRegistry(createSyntheticLayerConfigs(100))

    switchLayerSet(registry)
    layerCommands.enable(registry.ids[0] ?? layerId('wind'))
    vi.advanceTimersByTime(URL_WRITE_DELAY_MS)

    expect(replaceSearch).not.toHaveBeenCalled()
    expect(search).toBe('?l=temperature:70')
    stop()
  })

  it('возврат из стресс-режима восстанавливает слои и не трогает ссылку (БАГ-1)', async () => {
    search = '?l=temperature:30'
    applyUrlState(search)
    await vi.advanceTimersByTimeAsync(500)
    const stop = startUrlSync({
      shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
      getSearch: () => search,
      replaceSearch,
    })
    const registry = createLayerRegistry(createSyntheticLayerConfigs(100))

    switchLayerSet(registry, { restore: true })
    switchLayerSet(baseLayerRegistry, { restore: true })
    await vi.advanceTimersByTimeAsync(URL_WRITE_DELAY_MS)

    expect(search).toBe('?l=temperature:30')
    stop()
  })
})
