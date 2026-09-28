import { useLayoutEffect } from 'react'

import { act, render, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import { createSyntheticLayerConfigs } from '@/entities/layer/config/layers/synthetic-layers'
import { createLayerRegistry } from '@/entities/layer/config/registry/layer-registry'
import { layerCache, layerCommands, layerEventLog } from '@/entities/layer/model/runtime'
import {
  useCacheStats,
  useLayerEvents,
  useLayerIds,
  useLayerMapStatus,
  useLayerRow,
  useLayersSummary,
  useMapOverlay,
} from '@/entities/layer/model/selectors/hooks'
import type { LayerId, LayerState } from '@/entities/layer/model/state/types'
import { layerStore, setActiveRegistry } from '@/entities/layer/model/store/layer-store'
import { updateLayer, updateLayers } from '@/entities/layer/model/store/store'

import type { LayerData } from '@/shared/api'

import { withStores } from '@tests/render-with-stores'

const temperature = layerId('temperature')
const wind = layerId('wind')
const insolation = layerId('insolation')

const data: LayerData = {
  type: 'FeatureCollection',
  features: Array.from({ length: 50 }, (_, index) => ({
    type: 'Feature',
    id: index,
    geometry: { type: 'Polygon', coordinates: [[[index, index]]] },
    properties: { value: index, direction: null },
  })),
}

const loaded = (layer: LayerState): LayerState => ({
  ...layer,
  enabled: true,
  load: { kind: 'success', data, loadedAt: 1000, durationMs: 840, source: 'network' },
})

const refreshing = (layer: LayerState): LayerState => ({
  ...layer,
  enabled: true,
  load: { kind: 'loading', requestId: 7, startedAt: 2000, stale: { data, loadedAt: 1000 } },
})

beforeEach(() => {
  setActiveRegistry(baseLayerRegistry)
  layerCache.clear()
  layerEventLog.clear()
})

describe('useLayerRow', () => {
  it('перерисовывает только компонент изменённого слоя (StrictMode: два рендера на монтирование и на обновление)', () => {
    const renders: Record<string, number> = {}
    function Row({ id }: { id: LayerId }) {
      const view = useLayerRow(id)
      renders[id] = (renders[id] ?? 0) + 1

      return <span>{view.opacity}</span>
    }
    render(
      <>
        <Row id={temperature} />
        <Row id={wind} />
      </>,
      withStores,
    )
    const before = { ...renders }

    act(() => {
      updateLayer(layerStore, temperature, (layer) => ({ ...layer, opacity: 0.3 }))
    })

    expect(before).toEqual({ temperature: 2, wind: 2 })
    expect(renders).toEqual({ temperature: 4, wind: 2 })
  })

  it('отдаёт плоский вид строки без данных слоя и без stale', () => {
    const { result } = renderHook(() => useLayerRow(temperature), withStores)

    act(() => {
      updateLayer(layerStore, temperature, refreshing)
    })
    expect(result.current).toEqual({
      enabled: true,
      opacity: 0.7,
      kind: 'loading',
      staleLoadedAt: 1000,
    })

    act(() => {
      updateLayer(layerStore, temperature, loaded)
    })
    expect(result.current).toEqual({
      enabled: true,
      opacity: 0.7,
      kind: 'success',
      durationMs: 840,
    })
    expect(result.current).not.toHaveProperty('data')
    expect(result.current).not.toHaveProperty('stale')
    expect(result.current).not.toHaveProperty('load')
  })

  it('смена requestId без смены вида не перерисовывает строку', () => {
    let hookCalls = 0
    renderHook(() => {
      hookCalls += 1

      return useLayerRow(temperature)
    }, withStores)
    act(() => {
      updateLayer(layerStore, temperature, refreshing)
    })
    const callsBefore = hookCalls

    act(() => {
      updateLayer(layerStore, temperature, (layer) =>
        layer.load.kind === 'loading'
          ? { ...layer, load: { ...layer.load, requestId: layer.load.requestId + 1 } }
          : layer,
      )
    })

    expect(hookCalls).toBe(callsBefore)
  })

  it('после switchLayerSet строка исчезнувшего слоя получает вид выключенного слоя, dispatch не падает', () => {
    const { result } = renderHook(() => useLayerRow(temperature), withStores)
    act(() => {
      updateLayer(layerStore, temperature, loaded)
    })

    expect(() => {
      act(() => {
        setActiveRegistry(createLayerRegistry(createSyntheticLayerConfigs(3)))
      })
    }).not.toThrow()

    expect(result.current).toEqual({ enabled: false, opacity: 0, kind: 'idle' })
  })
})

describe('Provider и команды', () => {
  it('Provider получил синглтон: команда из публичного API видна хуку', () => {
    const { result } = renderHook(() => useLayerRow(wind), withStores)

    act(() => {
      layerCommands.setOpacity(wind, 0.25)
    })

    expect(result.current.opacity).toBe(0.25)
  })
})

describe('V4: обновление между рендером и подпиской', () => {
  it('сосед делает dispatch в useLayoutEffect — строка подхватывает его', () => {
    function Writer() {
      useLayoutEffect(() => {
        updateLayer(layerStore, wind, (layer) => ({ ...layer, enabled: true }))
      }, [])

      return null
    }
    let seen: boolean | null = null
    function Reader() {
      seen = useLayerRow(wind).enabled

      return null
    }

    render(
      <>
        <Reader />
        <Writer />
      </>,
      withStores,
    )

    expect(seen).toBe(true)
  })
})

describe('useLayerIds', () => {
  it('ссылка на ids не меняется при изменении слоёв', () => {
    const { result } = renderHook(() => useLayerIds(), withStores)
    const first = result.current

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, opacity: 0.1 }))
    })

    expect(result.current).toBe(first)
  })
})

describe('useLayersSummary', () => {
  it('та же ссылка и без рендера, если числа не изменились', () => {
    let hookCalls = 0
    const { result } = renderHook(() => {
      hookCalls += 1

      return useLayersSummary()
    }, withStores)
    const first = result.current
    const callsAfterMount = hookCalls

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, opacity: 0.1 }))
    })
    expect(result.current).toBe(first)
    expect(hookCalls).toBe(callsAfterMount)

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, enabled: true }))
    })
    expect(result.current).toEqual({ total: 3, enabled: 1, loading: 0, failed: 0 })
  })
})

describe('useMapOverlay', () => {
  it('отдаёт не больше limit id и число включённых', () => {
    const { result } = renderHook(() => useMapOverlay(2), withStores)

    act(() => {
      updateLayers(layerStore, [temperature, wind, insolation], loaded)
    })

    expect(result.current).toEqual({ shownIds: [temperature, wind], enabledCount: 3 })
  })
})

describe('useLayerMapStatus', () => {
  it('отдаёт строку статуса и после switchLayerSet — off', () => {
    const { result } = renderHook(() => useLayerMapStatus(temperature), {
      ...withStores,
    })

    act(() => {
      updateLayer(layerStore, temperature, loaded)
    })
    expect(result.current).toBe('shown')

    act(() => {
      setActiveRegistry(createLayerRegistry(createSyntheticLayerConfigs(3)))
    })
    expect(result.current).toBe('off')
  })
})

describe('лог событий и счётчик кэша', () => {
  it('useLayerEvents получает новые события', () => {
    const { result } = renderHook(() => useLayerEvents(), withStores)

    act(() => {
      layerEventLog.push([{ at: 0, kind: 'request', layerId: wind }])
    })

    expect(result.current.map((event) => event.kind)).toEqual(['request'])
  })

  it('useCacheStats обновляется из кэша через vedro-стор', () => {
    const { result } = renderHook(() => useCacheStats(), withStores)
    expect(result.current.size).toBe(0)

    act(() => {
      layerCache.set(wind, data, Date.now())
    })

    expect(result.current).toEqual({ size: 1, limit: layerCache.getSettings().limit })
  })
})
