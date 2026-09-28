import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LayerPanel } from '@/widgets/layer-panel/ui/layer-panel'

import { baseLayerRegistry, layerApi, layerCommands, switchLayerSet } from '@/entities/layer'

import { renderWithStores } from '@tests/render-with-stores'

const renderPanel = () => renderWithStores(<LayerPanel />)

beforeEach(() => {
  switchLayerSet(baseLayerRegistry)
  layerApi.configure({ seed: 1, errorRate: 0, minDelayMs: 5000, maxDelayMs: 5000 })
})

afterEach(() => {
  layerCommands.cancelAll()
})

describe('доступность панели (ТЗ §11.2)', () => {
  it('тумблер: role="switch", aria-checked, переключается пробелом', async () => {
    const user = userEvent.setup()
    renderPanel()
    const toggle = screen.getByRole('switch', { name: 'Слой «Ветер»' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    toggle.focus()
    await user.keyboard(' ')

    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('слайдер: aria-valuetext в процентах, активен только у включённого слоя', async () => {
    const user = userEvent.setup()
    renderPanel()
    const slider = screen.getByRole('slider', { name: 'Прозрачность слоя «Ветер»' })
    expect(slider).toBeDisabled()

    await user.click(screen.getByRole('switch', { name: 'Слой «Ветер»' }))

    expect(slider).toBeEnabled()
    expect(slider).toHaveAttribute('aria-valuetext', '90 процентов')
  })

  it('смена статуса озвучивается: статус в aria-live', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('switch', { name: 'Слой «Ветер»' }))

    const loading = screen
      .getAllByRole('status')
      .filter((region) => region.textContent === 'Загрузка…')
    expect(loading).toHaveLength(1)
    expect(loading[0]).toHaveAttribute('aria-live', 'polite')
  })

  it('контролы достижимы с клавиатуры по Tab, неактивные пропускаются', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Включить все' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('switch', { name: 'Слой «Температура»' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('switch', { name: 'Слой «Ветер»' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('switch', { name: 'Слой «Инсоляция»' })).toHaveFocus()
  })
})
