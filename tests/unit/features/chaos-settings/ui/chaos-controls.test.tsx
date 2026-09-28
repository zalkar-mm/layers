import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { stopSpam, updateChaosSettings } from '@/features/chaos-settings/model/chaos-settings'
import { ChaosControls } from '@/features/chaos-settings/ui/chaos-controls'

import { layerApi, layerCache, layerCommands } from '@/entities/layer'

import { renderWithStores } from '@tests/render-with-stores'

afterEach(() => {
  stopSpam()
  layerCommands.cancelAll()
  updateChaosSettings({ errorRate: 0.2, ignoreAbort: false, cacheEnabled: true })
})

describe('Chaos-панель: контролы', () => {
  it('слайдер доли ошибок пишет долю в mock API и показывает проценты', () => {
    renderWithStores(<ChaosControls />)

    fireEvent.change(screen.getByRole('slider', { name: 'Доля ошибок' }), {
      target: { value: '35' },
    })

    expect(layerApi.getSettings().errorRate).toBe(0.35)
    expect(screen.getByText('Доля ошибок: 35 %')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Доля ошибок' })).toHaveAttribute(
      'aria-valuetext',
      '35 процентов',
    )
  })

  it('слайдер TTL переводит секунды в миллисекунды', () => {
    renderWithStores(<ChaosControls />)

    fireEvent.change(screen.getByRole('slider', { name: 'Время жизни кэша' }), {
      target: { value: '120' },
    })

    expect(layerCache.getSettings().ttlMs).toBe(120_000)
    expect(screen.getByText('TTL: 2 мин')).toBeInTheDocument()
  })

  it('тумблеры кэша и игнорирования отмены переключают настройки', async () => {
    const user = userEvent.setup()
    renderWithStores(<ChaosControls />)

    await user.click(screen.getByRole('switch', { name: 'Кэш' }))
    await user.click(screen.getByRole('switch', { name: 'Сервер отвечает, несмотря на отмену' }))

    expect(layerCache.getSettings().enabled).toBe(false)
    expect(screen.getByText(/^Кэш выкл/)).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Время жизни кэша' })).toBeDisabled()
    expect(layerApi.getSettings().ignoreAbort).toBe(true)
  })

  it('seed применяется по Enter', async () => {
    const user = userEvent.setup()
    renderWithStores(<ChaosControls />)
    const input = screen.getByLabelText('Seed')

    await user.clear(input)
    await user.type(input, '4242{Enter}')

    expect(layerApi.getSettings().seed).toBe(4242)
  })

  it('спам-клик блокирует кнопку до конца серии', async () => {
    const user = userEvent.setup()
    renderWithStores(<ChaosControls />)

    await user.click(screen.getByRole('button', { name: 'Спам-клик' }))

    expect(screen.getByRole('button', { name: 'Спам-клик…' })).toBeDisabled()
  })

  it('размонтирование останавливает спам-клик', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithStores(<ChaosControls />)
    await user.click(screen.getByRole('button', { name: 'Спам-клик' }))

    unmount()
    renderWithStores(<ChaosControls />)

    expect(screen.getByRole('button', { name: 'Спам-клик' })).toBeEnabled()
  })
})
