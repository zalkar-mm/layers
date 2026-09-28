import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LayerPanel } from '@/widgets/layer-panel/ui/layer-panel'

import {
  baseLayerRegistry,
  layerApi,
  layerCache,
  layerCommands,
  switchLayerSet,
} from '@/entities/layer'

import { renderWithStores } from '@tests/render-with-stores'

const DELAY = 500

const renderPanel = () => renderWithStores(<LayerPanel />)

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const toggleOf = (title: string) => screen.getByRole('switch', { name: `Слой «${title}»` })

beforeEach(() => {
  vi.useFakeTimers()
  switchLayerSet(baseLayerRegistry)
  layerCache.clear()
  layerCache.configure({ enabled: true, ttlMs: 5 * 60_000 })
  layerApi.configure({ seed: 1, errorRate: 0, minDelayMs: DELAY, maxDelayMs: DELAY })
})

afterEach(() => {
  layerCommands.cancelAll()
  vi.useRealTimers()
})

describe('утечки таймеров панели (ТЗ §7.2, §5)', () => {
  it('в покое таймеров нет: тик «N мин назад» только у строки с кэшем', async () => {
    renderPanel()
    expect(vi.getTimerCount()).toBe(0)

    fireEvent.click(toggleOf('Температура'))
    await advance(DELAY)
    expect(vi.getTimerCount()).toBe(0)

    fireEvent.click(toggleOf('Температура'))
    fireEvent.click(toggleOf('Температура'))
    expect(screen.getByText(/^Обновление/)).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(2)

    await advance(DELAY)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('выключение слоя во время загрузки снимает таймер запроса', () => {
    renderPanel()
    fireEvent.click(toggleOf('Ветер'))
    expect(vi.getTimerCount()).toBe(1)

    fireEvent.click(toggleOf('Ветер'))

    expect(vi.getTimerCount()).toBe(0)
    expect(layerCommands.inFlightCount()).toBe(0)
  })

  it('размонтирование строки с тиком снимает таймер', async () => {
    const view = renderPanel()
    fireEvent.click(toggleOf('Температура'))
    await advance(DELAY)
    fireEvent.click(toggleOf('Температура'))
    fireEvent.click(toggleOf('Температура'))
    act(() => {
      layerCommands.cancelAll()
    })
    expect(vi.getTimerCount()).toBe(1)

    view.unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
