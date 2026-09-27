import { describe, expect, it } from 'vitest'

import {
  baseLayerRegistry,
  createInitialLayerState,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  type LayerData,
  type LayerId,
  layerId,
  type LayerRegistry,
  type LayersById,
  type LayerState,
} from '@/entities/layer'

import type { MapPort } from './map-port'
import { createMapSync } from './map-sync'

const temperature = layerId('temperature')
const wind = layerId('wind')
const insolation = layerId('insolation')

const dataOf = (label: number, direction: number | null = null): LayerData => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: label,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [74, 42],
            [75, 42],
            [75, 43],
            [74, 43],
            [74, 42],
          ],
        ],
      },
      properties: { value: label, direction },
    },
  ],
})

const createFakePort = () => {
  const calls: string[] = []
  const port: MapPort = {
    addSource: (id) => calls.push(`addSource ${id}`),
    setSourceData: (id, data) => calls.push(`setData ${id} ${String(data.features[0]?.id)}`),
    removeSource: (id) => calls.push(`removeSource ${id}`),
    addLayer: (id, kind) => calls.push(`addLayer ${id} ${kind}`),
    removeLayer: (id) => calls.push(`removeLayer ${id}`),
    setPaintProperty: (id, name, value) =>
      calls.push(`paint ${id} ${name}${typeof value === 'number' ? ` ${String(value)}` : ''}`),
    setLayoutProperty: (id, name) => calls.push(`layout ${id} ${name}`),
    moveLayer: (id) => calls.push(`move ${id}`),
  }

  return { port, calls }
}

const setup = (registry: LayerRegistry = baseLayerRegistry) => {
  const { port, calls } = createFakePort()
  let byId: Record<LayerId, LayerState> = {}
  for (const id of registry.ids) byId[id] = createInitialLayerState(registry.get(id))
  let listener: ((state: LayersById) => void) | null = null
  const sync = createMapSync(port, {
    subscribe: (next) => {
      listener = next
      next(byId)

      return () => {
        listener = null
      }
    },
    getIds: () => registry.ids,
    getConfig: (id) => registry.get(id),
  })
  const set = (id: LayerId, patch: Partial<LayerState>) => {
    const current = byId[id]
    if (current === undefined) throw new Error(`нет слоя ${id}`)
    byId = { ...byId, [id]: { ...current, ...patch } }
    listener?.(byId)
  }
  const success = (label: number) =>
    ({
      kind: 'success',
      data: dataOf(label),
      loadedAt: 0,
      durationMs: 1,
      source: 'network',
    }) as const

  return { sync, calls, set, success, isSubscribed: () => listener !== null }
}

describe('MapSync (ТЗ §9.1)', () => {
  it('загрузка без кэша: слой скрыт до прихода данных', () => {
    const env = setup()

    env.set(temperature, {
      enabled: true,
      load: { kind: 'loading', requestId: 1, startedAt: 0, stale: null },
    })

    expect(env.calls).toEqual([])
  })

  it('данные пришли — источник и слой добавлены, стиль задан', () => {
    const env = setup()

    env.set(temperature, { enabled: true, load: env.success(1) })

    expect(env.calls).toContain('addSource source:temperature')
    expect(env.calls).toContain('addLayer layer:temperature fill')
    expect(env.calls).toContain('paint layer:temperature fill-opacity 0.7')
    expect(env.calls).toContain('layout layer:temperature visibility')
  })

  it('слайдер прозрачности — один setPaintProperty и ничего больше', () => {
    const env = setup()
    env.set(temperature, { enabled: true, load: env.success(1) })
    env.calls.length = 0

    env.set(temperature, { opacity: 0.3 })

    expect(env.calls).toEqual(['paint layer:temperature fill-opacity 0.3'])
  })

  it('изменение слоя B не трогает слой A на карте', () => {
    const env = setup()
    env.set(temperature, { enabled: true, load: env.success(1) })
    env.set(insolation, { enabled: true, load: env.success(2) })
    env.calls.length = 0

    env.set(insolation, { opacity: 0.1 })

    expect(env.calls.every((call) => !call.includes('temperature'))).toBe(true)
  })

  it('stale → свежие данные: setData без удаления слоя', () => {
    const env = setup()
    env.set(temperature, {
      enabled: true,
      load: {
        kind: 'loading',
        requestId: 2,
        startedAt: 0,
        stale: { data: dataOf(1), loadedAt: 0 },
      },
    })
    expect(env.calls).toContain('addSource source:temperature')
    env.calls.length = 0

    env.set(temperature, { load: env.success(2) })

    expect(env.calls).toEqual(['setData source:temperature 2'])
  })

  it('выключение — слой и источник удаляются', () => {
    const env = setup()
    env.set(temperature, { enabled: true, load: env.success(1) })
    env.calls.length = 0

    env.set(temperature, { enabled: false, load: { kind: 'idle' } })

    expect(env.calls).toEqual(['removeLayer layer:temperature', 'removeSource source:temperature'])
  })

  it('ветер всегда поверх заливок', () => {
    const env = setup()
    env.set(wind, { enabled: true, load: env.success(1) })
    env.calls.length = 0

    env.set(insolation, { enabled: true, load: env.success(2) })

    const moves = env.calls.filter((call) => call.startsWith('move'))
    expect(moves).toEqual(['move layer:insolation', 'move layer:wind'])
  })

  it('в стресс-режиме на карте только первые 10 включённых слоёв', () => {
    const registry = createLayerRegistry(createSyntheticLayerConfigs(15))
    const env = setup(registry)

    for (const id of registry.ids) env.set(id, { enabled: true, load: env.success(1) })

    expect(env.sync.renderedLayerIds()).toHaveLength(10)
    expect(env.sync.renderedLayerIds()[0]).toBe('layer:synthetic-001')
  })

  it('dispose отписывается и убирает всё с карты', () => {
    const env = setup()
    env.set(temperature, { enabled: true, load: env.success(1) })
    env.calls.length = 0

    env.sync.dispose()

    expect(env.isSubscribed()).toBe(false)
    expect(env.calls).toEqual(['removeLayer layer:temperature', 'removeSource source:temperature'])
  })

  it('значения в точке — по данным всех слоёв на карте, в порядке списка', () => {
    const env = setup()
    env.set(wind, { enabled: true, load: { ...env.success(6), data: dataOf(6, 315) } })
    env.set(temperature, { enabled: true, load: env.success(18) })

    const values = env.sync.valuesAt(74.5, 42.5)

    expect(values.map((entry) => [entry.config.id, entry.value, entry.direction])).toEqual([
      ['temperature', 18, null],
      ['wind', 6, 315],
    ])
    expect(env.sync.valuesAt(80, 50)).toEqual([])
  })
})
