import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { RenderCountsToggle } from '@/shared/lib/dev/overlay/render-counts-toggle'
import { setRenderCountsVisible } from '@/shared/lib/dev/render-counts'

import { renderWithStores } from '@tests/render-with-stores'

afterEach(() => {
  setRenderCountsVisible(false)
})

describe('переключатель счётчиков рендеров', () => {
  it('клик по подписи переключает тумблер и атрибут <html>', async () => {
    const user = userEvent.setup()
    renderWithStores(<RenderCountsToggle />)

    await user.click(screen.getByText('Показать рендеры'))

    expect(screen.getByRole('switch', { name: 'Показать рендеры' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(document.documentElement).toHaveAttribute('data-render-counts', 'on')
  })
})
