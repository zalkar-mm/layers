import { describe, expect, it } from 'vitest'

import { formatPercentValueText, fromPercent, toPercent } from '@/shared/lib/format/percent'

describe('проценты ↔ доли', () => {
  it.each([
    [0, 0],
    [0.4, 40],
    [0.555, 56],
    [1, 100],
  ])('toPercent(%d) = %i', (fraction, percent) => {
    expect(toPercent(fraction)).toBe(percent)
  })

  it('fromPercent — обратное преобразование', () => {
    expect(fromPercent(55)).toBe(0.55)
    expect(fromPercent(toPercent(0.3))).toBe(0.3)
  })

  it('текст значения для слайдера', () => {
    expect(formatPercentValueText(88)).toBe('88 процентов')
  })
})
