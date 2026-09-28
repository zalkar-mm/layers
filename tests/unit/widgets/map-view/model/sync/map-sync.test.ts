import { describe, expect, it } from 'vitest'

import type { MapPort, MapSourceData } from '@/widgets/map-view/model/map/map-port'
import { createMapSync } from '@/widgets/map-view/model/sync/map-sync'

import {
  baseLayerRegistry,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  type LayerConfig,
  type LayerData,
  type LayerId,
  type LayerRegistry,
  type LayerRenderKind,
  type LayersById,
  type LayerState,
} from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'
import { createInitialLayerState } from '@/entities/layer/model/state/initial-state'

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
  const sources = new Map<string, MapSourceData>()
  const port: MapPort = {
    addSource: (id, data) => {
      sources.set(id, data)
      calls.push(`addSource ${id}`)
    },
    setSourceData: (id, data) => {
      sources.set(id, data)
      calls.push(`setData ${id} ${String(data.features[0]?.id)}`)
    },
    removeSource: (id) => calls.push(`removeSource ${id}`),
    addLayer: (id, kind) => calls.push(`addLayer ${id} ${kind}`),
    removeLayer: (id) => calls.push(`removeLayer ${id}`),
    setPaintProperty: (id, name, value) =>
      calls.push(`paint ${id} ${name}${typeof value === 'number' ? ` ${String(value)}` : ''}`),
    setLayoutProperty: (id, name) => calls.push(`layout ${id} ${name}`),
    moveLayer: (id) => calls.push(`move ${id}`),
  }

  return { port, calls, sources }
}

const setup = (registry: LayerRegistry = baseLayerRegistry) => {
  const { port, calls, sources } = createFakePort()
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

  return { sync, calls, sources, set, success, isSubscribed: () => listener !== null }
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

const withRender = (id: LayerId, render: LayerRenderKind): LayerConfig => ({
  ...baseLayerRegistry.get(id),
  render,
})

const renderKindsRegistry = createLayerRegistry([
  withRender(temperature, 'heatmap'),
  withRender(wind, 'arrows'),
  withRender(insolation, 'fill'),
])

const RENDER_KIND_CASES = [
  { id: insolation, render: 'fill', mapKind: 'fill', opacity: 'fill-opacity' },
  { id: wind, render: 'arrows', mapKind: 'symbol', opacity: 'icon-opacity' },
  { id: temperature, render: 'heatmap', mapKind: 'heatmap', opacity: 'heatmap-opacity' },
] as const

describe('MapSync: виды отрисовки', () => {
  it.each(RENDER_KIND_CASES)('$render → слой MapLibre типа $mapKind', ({ id, mapKind }) => {
    const env = setup(renderKindsRegistry)

    env.set(id, { enabled: true, load: env.success(1) })

    expect(env.calls).toContain(`addLayer layer:${id} ${mapKind}`)
  })

  it.each(RENDER_KIND_CASES)(
    '$render: слайдер прозрачности — один setPaintProperty $opacity',
    ({ id, opacity }) => {
      const env = setup(renderKindsRegistry)
      env.set(id, { enabled: true, load: env.success(1) })
      env.calls.length = 0

      env.set(id, { opacity: 0.3 })

      expect(env.calls).toEqual([`paint layer:${id} ${opacity} 0.3`])
    },
  )

  it('heatmap получает источник из центроидов ячеек с исходными properties', () => {
    const env = setup(renderKindsRegistry)
    const data = dataOf(12, null)

    env.set(temperature, { enabled: true, load: { ...env.success(12), data } })

    expect(env.sources.get('source:temperature')).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 12,
          geometry: { type: 'Point', coordinates: [74.5, 42.5] },
          properties: { value: 12, direction: null },
        },
      ],
    })
    expect(env.sources.get('source:temperature')?.features[0]?.properties).toBe(
      data.features[0]?.properties,
    )
  })

  it('heatmap: свежие данные тоже уходят в источник центроидами', () => {
    const env = setup(renderKindsRegistry)
    env.set(temperature, { enabled: true, load: env.success(1) })

    env.set(temperature, { load: env.success(2) })

    expect(env.sources.get('source:temperature')?.features[0]?.geometry).toEqual({
      type: 'Point',
      coordinates: [74.5, 42.5],
    })
  })

  it('заливка и стрелки получают данные слоя как есть', () => {
    const env = setup(renderKindsRegistry)

    env.set(insolation, { enabled: true, load: env.success(1) })
    env.set(wind, { enabled: true, load: env.success(2) })

    expect(env.sources.get('source:insolation')?.features[0]?.geometry.type).toBe('Polygon')
    expect(env.sources.get('source:wind')?.features[0]?.geometry.type).toBe('Polygon')
  })

  it('подсказка по клику для heatmap ищет ячейку по исходным полигонам', () => {
    const env = setup(renderKindsRegistry)
    env.set(temperature, { enabled: true, load: env.success(18) })

    expect(env.sync.valuesAt(74.9, 42.9).map((entry) => entry.value)).toEqual([18])
    expect(env.sync.valuesAt(75.5, 42.5)).toEqual([])
  })

  it.each([
    [[wind, temperature, insolation]],
    [[temperature, wind, insolation]],
    [[insolation, temperature, wind]],
    [[wind, insolation, temperature]],
  ])('порядок слоёв: заливки → heatmap → стрелки при включении %j', (order) => {
    const env = setup(renderKindsRegistry)
    const moves: string[] = []

    for (const id of order) {
      env.calls.length = 0
      env.set(id, { enabled: true, load: env.success(1) })
      moves.splice(0, moves.length, ...env.calls.filter((call) => call.startsWith('move')))
    }

    expect(moves).toEqual(['move layer:insolation', 'move layer:temperature', 'move layer:wind'])
  })
})
