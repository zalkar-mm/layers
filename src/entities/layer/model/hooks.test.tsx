import { useLayoutEffect } from 'react'

import { act, render, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import { useLayer, useLayerIds, useLayersSummary } from './hooks'
import { layerStore, setActiveRegistry } from './layer-store'
import { updateLayer } from './store'

const temperature = layerId('temperature')
const wind = layerId('wind')

beforeEach(() => {
  setActiveRegistry(baseLayerRegistry)
})

describe('useLayer', () => {
  it('перерисовывает только компонент изменённого слоя', () => {
    const renders: Record<string, number> = {}
    function Row({ id }: { id: ReturnType<typeof layerId> }) {
      const layer = useLayer(id)
      renders[id] = (renders[id] ?? 0) + 1

      return <span>{layer.opacity}</span>
    }
    render(
      <>
        <Row id={temperature} />
        <Row id={wind} />
      </>,
    )

    act(() => {
      updateLayer(layerStore, temperature, (layer) => ({ ...layer, opacity: 0.3 }))
    })

    expect(renders).toEqual({ temperature: 2, wind: 1 })
  })

  it('V4: подхватывает обновление, случившееся между рендером и подпиской', () => {
    function Writer() {
      useLayoutEffect(() => {
        updateLayer(layerStore, wind, (layer) => ({ ...layer, enabled: true }))
      }, [])

      return null
    }
    let seen: boolean | null = null
    function Reader() {
      seen = useLayer(wind).enabled

      return null
    }

    render(
      <>
        <Reader />
        <Writer />
      </>,
    )

    expect(seen).toBe(true)
  })

  it('на неизвестный слой бросает ошибку', () => {
    setActiveRegistry({ ...baseLayerRegistry, ids: [] })

    expect(() => renderHook(() => useLayer(wind))).toThrow('Слой wind отсутствует в сторе')
  })
})

describe('useLayerIds', () => {
  it('ссылка на ids не меняется при изменении слоёв', () => {
    const { result } = renderHook(() => useLayerIds())
    const first = result.current

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, opacity: 0.1 }))
    })

    expect(result.current).toBe(first)
  })
})

describe('useLayersSummary', () => {
  it('не создаёт новый объект, если числа не изменились', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1

      return useLayersSummary()
    })
    const first = result.current

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, opacity: 0.1 }))
    })
    expect(result.current).toBe(first)
    expect(renders).toBe(1)

    act(() => {
      updateLayer(layerStore, wind, (layer) => ({ ...layer, enabled: true }))
    })
    expect(result.current).toEqual({ total: 3, enabled: 1, loading: 0, failed: 0 })
  })
})
