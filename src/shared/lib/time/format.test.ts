import { describe, expect, it } from 'vitest'

import { formatAge, formatDuration } from './format'

describe('форматирование времени', () => {
  it.each([
    [0, 'меньше минуты назад'],
    [59_000, 'меньше минуты назад'],
    [120_000, '2 мин назад'],
    [3 * 3_600_000, '3 ч назад'],
  ])('formatAge(%i) = %s', (ms, text) => {
    expect(formatAge(ms)).toBe(text)
  })

  it.each([
    [45_000, '45 с'],
    [80_000, '1 мин 20 с'],
    [120_000, '2 мин'],
  ])('formatDuration(%i) = %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})
