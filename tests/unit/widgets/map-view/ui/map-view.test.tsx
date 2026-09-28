import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MapView } from '@/widgets/map-view/ui/map-view'

import {
  baseLayerRegistry,
  layerApi,
  layerCache,
  layerCommands,
  switchLayerSet,
} from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'

import { getRenderCount, resetRenderCounts } from '@/shared/lib/dev'

import { renderWithStores } from '@tests/render-with-stores'

const { destroy, loadMapMock } = vi.hoisted(() => {
  const destroyMock = vi.fn()

  return {
    destroy: destroyMock,
    loadMapMock: vi.fn((_container: HTMLElement, _signal: AbortSignal) =>
      Promise.resolve({ destroy: destroyMock }),
    ),
  }
})
vi.mock('@/widgets/map-view/model/map/load-map', () => ({ loadMap: loadMapMock }))

const temperature = layerId('temperature')
const DELAY = 500

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const renderMap = () => renderWithStores(<MapView />)

beforeEach(() => {
  vi.useFakeTimers()
  switchLayerSet(baseLayerRegistry)
  layerCache.clear()
  layerApi.configure({ seed: 1, errorRate: 0, minDelayMs: DELAY, maxDelayMs: DELAY })
})

afterEach(() => {
  layerCommands.cancelAll()
  vi.useRealTimers()
})

describe('карта: бюджет рендеров (ТЗ §8, §9.1)', () => {
  it('движение слайдера — 0 React-рендеров карты и легенды', async () => {
    renderMap()
    act(() => {
      layerCommands.enable(temperature)
    })
    await advance(DELAY)
    expect(screen.getByText('Температура')).toBeInTheDocument()
    resetRenderCounts()

    act(() => {
      for (let step = 0; step <= 100; step += 10) layerCommands.setOpacity(temperature, step / 100)
    })

    expect(getRenderCount('map')).toBe(0)
    expect(getRenderCount('map-legend:temperature')).toBe(0)
  })

  it('загрузка без кэша — индикатор «Загружается: …», данные пришли — легенда', async () => {
    renderMap()

    act(() => {
      layerCommands.enable(temperature)
    })
    expect(screen.getByText('Загружается: Температура')).toBeInTheDocument()

    await advance(DELAY)
    expect(screen.queryByText('Загружается: Температура')).not.toBeInTheDocument()
    expect(getRenderCount('map')).toBe(2)
  })

  it('размонтирование освобождает карту', async () => {
    const view = renderMap()
    await advance(0)

    view.unmount()

    expect(loadMapMock.mock.calls.map(([, signal]) => signal.aborted)).toEqual([true, true])
    expect(destroy).toHaveBeenCalled()
  })
})
