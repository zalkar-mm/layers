import { describe, expect, it } from 'vitest'

import { syntheticLayerId } from '@/entities/layer/config/layers/synthetic-layers'
import { createLayerCache, type LayerCacheStats } from '@/entities/layer/model/loading/cache'

import type { LayerData } from '@/shared/api'

const data: LayerData = { type: 'FeatureCollection', features: [] }
const a = syntheticLayerId(1)
const b = syntheticLayerId(2)
const c = syntheticLayerId(3)

const createClock = () => {
  let time = 0

  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms
    },
  }
}

describe('кэш данных слоя (ТЗ §5.3)', () => {
  it('LRU: чтение обновляет позицию — вытесняется самая давно использованная запись', () => {
    const clock = createClock()
    const cache = createLayerCache({ now: clock.now, settings: { limit: 2 } })

    cache.set(a, data, 0)
    cache.set(b, data, 0)
    cache.get(a)
    cache.set(c, data, 0)

    expect(cache.get(a)).not.toBeNull()
    expect(cache.get(b)).toBeNull()
    expect(cache.get(c)).not.toBeNull()
  })

  it('TTL: на границе запись свежая, после — просрочена и удаляется при чтении', () => {
    const clock = createClock()
    const cache = createLayerCache({ now: clock.now, settings: { ttlMs: 1000 } })
    cache.set(a, data, 0)

    clock.advance(1000)
    expect(cache.lookup(a).kind).toBe('hit')
    clock.advance(1)
    expect(cache.lookup(a).kind).toBe('expired')
    expect(cache.lookup(a).kind).toBe('miss')
    expect(cache.getStats().size).toBe(0)
  })

  it('просроченные записи не занимают места LRU: чистятся при записи', () => {
    const clock = createClock()
    const cache = createLayerCache({ now: clock.now, settings: { ttlMs: 1000, limit: 2 } })
    cache.set(a, data, 0)
    clock.advance(2000)

    cache.set(b, data, clock.now())

    expect(cache.getStats().size).toBe(1)
  })

  it('выключенный кэш пуст и ничего не пишет (R15)', () => {
    const cache = createLayerCache({ now: () => 0 })
    cache.set(a, data, 0)

    cache.configure({ enabled: false })

    expect(cache.getStats().size).toBe(0)
    expect(cache.set(b, data, 0)).toBe(false)
    expect(cache.get(b)).toBeNull()
  })

  it('onStatsChange вызывается только при изменении чисел', () => {
    const changes: LayerCacheStats[] = []
    const cache = createLayerCache({
      now: () => 0,
      onStatsChange: (stats) => {
        changes.push(stats)
      },
    })

    cache.set(a, data, 0)
    cache.set(a, data, 0)
    cache.configure({ limit: 10 })
    const stats = cache.getStats()

    expect(changes).toEqual([
      { size: 1, limit: 50 },
      { size: 1, limit: 10 },
    ])
    expect(cache.getStats()).toBe(stats)
  })

  it('isFresh отвечает по текущему TTL', () => {
    const cache = createLayerCache({ now: () => 5000, settings: { ttlMs: 1000 } })

    expect(cache.isFresh(4000)).toBe(true)
    expect(cache.isFresh(3999)).toBe(false)
  })
})
