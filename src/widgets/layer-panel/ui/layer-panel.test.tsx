import { StrictMode } from 'react'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  baseLayerRegistry,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  layerApi,
  layerCache,
  layerCommands,
  layerId,
  switchLayerSet,
} from '@/entities/layer'

import { getRenderCount, resetRenderCounts } from '@/shared/lib/dev'
import { theme } from '@/shared/ui'

import { LayerPanel } from './layer-panel'

type CounterName = 'panel' | 'header' | 'row:temperature' | 'row:wind' | 'row:insolation'

const snapshot = (): Record<CounterName, number> => ({
  panel: getRenderCount('panel'),
  header: getRenderCount('header'),
  'row:temperature': getRenderCount('row:temperature'),
  'row:wind': getRenderCount('row:wind'),
  'row:insolation': getRenderCount('row:insolation'),
})

const expectRenders = (expected: Partial<Record<CounterName, number>>) => {
  expect(snapshot()).toEqual({
    panel: 0,
    header: 0,
    'row:temperature': 0,
    'row:wind': 0,
    'row:insolation': 0,
    ...expected,
  })
}

const DELAY = 500

const renderPanel = () => {
  render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <LayerPanel />
      </ThemeProvider>
    </StrictMode>,
  )
  resetRenderCounts()
}

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const click = (element: HTMLElement) => {
  fireEvent.click(element)
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

describe('бюджет рендеров (ТЗ §8)', () => {
  it('движение слайдера A — перерисовывается только строка A', async () => {
    renderPanel()
    act(() => {
      layerCommands.enable(layerId('temperature'))
    })
    await advance(DELAY)
    resetRenderCounts()

    fireEvent.change(screen.getByRole('slider', { name: 'Прозрачность слоя «Температура»' }), {
      target: { value: '40' },
    })

    expectRenders({ 'row:temperature': 1 })
    expect(screen.getByText('40 %')).toBeInTheDocument()
  })

  it('включение A — строка A и шапка', () => {
    renderPanel()

    click(toggleOf('Температура'))

    expectRenders({ 'row:temperature': 1, header: 1 })
    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
  })

  it('ответ API для A — строка A и шапка (меняется число загружающихся)', async () => {
    renderPanel()
    click(toggleOf('Температура'))
    resetRenderCounts()

    await advance(DELAY)

    expectRenders({ 'row:temperature': 1, header: 1 })
    expect(screen.getByText(`Готово · ${String(DELAY)} мс`)).toBeInTheDocument()
  })

  it('ошибка A → retry — строка A и шапка', async () => {
    layerApi.configure({ errorRate: 1 })
    renderPanel()
    click(toggleOf('Температура'))
    await advance(DELAY)
    expect(screen.getByText(/попытка 1/)).toBeInTheDocument()
    resetRenderCounts()

    click(screen.getByRole('button', { name: 'Повторить загрузку слоя «Температура»' }))

    expectRenders({ 'row:temperature': 1, header: 1 })
  })

  it('включение A с попаданием в кэш — по одному рендеру на loading(stale) и success, без «пусто → кэш»', async () => {
    renderPanel()
    click(toggleOf('Температура'))
    await advance(DELAY)
    click(toggleOf('Температура'))
    resetRenderCounts()

    click(toggleOf('Температура'))
    expect(getRenderCount('row:temperature')).toBe(1)
    expect(screen.getByText(/^Обновление · данные/)).toBeInTheDocument()

    await advance(DELAY)
    expectRenders({ 'row:temperature': 2, header: 2 })
  })

  it('тик «N мин назад» в строке A — перерисовывается только бейдж статуса A', async () => {
    layerApi.configure({ minDelayMs: 120_000, maxDelayMs: 120_000 })
    renderPanel()
    click(toggleOf('Температура'))
    await advance(120_000)
    click(toggleOf('Температура'))
    click(toggleOf('Температура'))
    expect(screen.getByText('Обновление · данные меньше минуты назад')).toBeInTheDocument()
    resetRenderCounts()

    await advance(60_000)

    expectRenders({})
    expect(screen.getByText('Обновление · данные 1 мин назад')).toBeInTheDocument()
  })

  it('enableAll — каждая строка ровно один раз на изменение', async () => {
    renderPanel()

    click(screen.getByRole('button', { name: 'Включить все' }))

    expectRenders({ header: 1, 'row:temperature': 1, 'row:wind': 1, 'row:insolation': 1 })

    await advance(DELAY)
    expectRenders({ header: 4, 'row:temperature': 2, 'row:wind': 2, 'row:insolation': 2 })
  })

  it('режим 1000 слоёв — то же, что при 3: слайдер перерисовывает одну строку, список виртуализирован', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360)
    const registry = createLayerRegistry(createSyntheticLayerConfigs(1000))
    switchLayerSet(registry)
    renderPanel()
    const first = registry.ids[0]
    if (first === undefined) throw new Error('нет слоёв')
    act(() => {
      layerCommands.enable(first)
    })
    await advance(DELAY)
    resetRenderCounts()

    fireEvent.change(screen.getAllByRole('slider')[0] ?? document.body, { target: { value: '25' } })

    expect(getRenderCount(`row:${first}`)).toBe(1)
    expect(getRenderCount('header')).toBe(0)
    expect(getRenderCount('panel')).toBe(0)
    const otherRows = registry.ids.slice(1).map((id) => getRenderCount(`row:${id}`))
    expect(otherRows.every((count) => count === 0)).toBe(true)
    expect(screen.getAllByRole('group').length).toBeLessThan(50)
  })

  describe('режим 1000 слоёв — те же правила, что при 3', () => {
    const setup1000 = () => {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800)
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360)
      const registry = createLayerRegistry(createSyntheticLayerConfigs(1000))
      switchLayerSet(registry)
      renderPanel()
      const [first, second] = registry.ids
      if (first === undefined || second === undefined) throw new Error('нет слоёв')
      const mountedRows = () => registry.ids.filter((id) => getRenderCount(`row:${id}`) > 0)

      return { registry, first, second, mountedRows }
    }

    const expectOtherRowsUntouched = (ids: readonly string[], except: string) => {
      const touched = ids.filter((id) => id !== except && getRenderCount(`row:${id}`) > 0)
      expect(touched).toEqual([])
    }

    it('включение A — строка A и шапка', () => {
      const { registry, first } = setup1000()

      click(screen.getAllByRole('switch')[0] ?? document.body)

      expect(getRenderCount(`row:${first}`)).toBe(1)
      expect(getRenderCount('header')).toBe(1)
      expect(getRenderCount('panel')).toBe(0)
      expectOtherRowsUntouched(registry.ids, first)
    })

    it('ответ API для A — строка A и шапка', async () => {
      const { registry, first } = setup1000()
      act(() => {
        layerCommands.enable(first)
      })
      resetRenderCounts()

      await advance(DELAY)

      expect(getRenderCount(`row:${first}`)).toBe(1)
      expect(getRenderCount('header')).toBe(1)
      expectOtherRowsUntouched(registry.ids, first)
    })

    it('ошибка A меняет высоту строки — соседние строки не перерисовываются', async () => {
      layerApi.configure({ errorRate: 1 })
      const { registry, first } = setup1000()
      act(() => {
        layerCommands.enable(first)
      })
      resetRenderCounts()

      await advance(DELAY)

      expect(screen.getByText(/попытка 1/)).toBeInTheDocument()
      expect(getRenderCount(`row:${first}`)).toBe(1)
      expect(getRenderCount('panel')).toBe(0)
      expectOtherRowsUntouched(registry.ids, first)
    })

    it('enableAll — каждая смонтированная строка ровно один раз, панель — ни разу', () => {
      const { mountedRows } = setup1000()

      click(screen.getByRole('button', { name: 'Включить все' }))

      const rows = mountedRows()
      expect(rows).toHaveLength(screen.getAllByRole('group').length)
      expect(rows.length).toBeLessThan(50)
      expect(rows.every((id) => getRenderCount(`row:${id}`) === 1)).toBe(true)
      expect(getRenderCount('header')).toBe(1)
      expect(getRenderCount('panel')).toBe(0)
    })
  })
})
