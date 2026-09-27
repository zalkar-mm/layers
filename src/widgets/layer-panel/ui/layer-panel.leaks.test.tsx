import { StrictMode } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  baseLayerRegistry,
  layerApi,
  layerCache,
  layerCommands,
  switchLayerSet,
} from '@/entities/layer'

import { theme } from '@/shared/ui'

import { LayerPanel } from './layer-panel'

// Утечки таймеров (ТЗ §7.2: тик «N мин назад» живёт только в строках с кэшем).
// fireEvent вместо userEvent — фейковые таймеры Vitest (см. layer-panel.test.tsx).

const DELAY = 500

const renderPanel = () =>
  render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <LayerPanel />
      </ThemeProvider>
    </StrictMode>,
  )

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
    // success без кэша в бейдже — тика нет, запросов нет.
    expect(vi.getTimerCount()).toBe(0)

    fireEvent.click(toggleOf('Температура'))
    fireEvent.click(toggleOf('Температура'))
    // loading со stale: один запрос (задержка mock) + один тик бейджа.
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
