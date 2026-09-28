import { afterEach, describe, expect, it } from 'vitest'

import { isRenderCountsVisible, setRenderCountsVisible } from '@/shared/lib/dev/render-counts'

afterEach(() => {
  setRenderCountsVisible(false)
})

describe('видимость счётчиков рендеров', () => {
  it('по умолчанию скрыты', () => {
    expect(isRenderCountsVisible()).toBe(false)
  })

  it('setter меняет флаг и атрибут data-render-counts у <html>', () => {
    setRenderCountsVisible(true)

    expect(isRenderCountsVisible()).toBe(true)
    expect(document.documentElement).toHaveAttribute('data-render-counts', 'on')

    setRenderCountsVisible(false)

    expect(document.documentElement).toHaveAttribute('data-render-counts', 'off')
  })
})
