import type { LayerConfig } from '@/entities/layer'

const COMPASS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'] as const

export const compassPoint = (degrees: number): string => {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % COMPASS.length

  return COMPASS[index] ?? 'С'
}

export type PointValue = {
  readonly config: LayerConfig
  readonly value: number
  readonly direction: number | null
}

const formatValue = (config: LayerConfig, value: number): string => {
  const [min] = config.valueRange
  const format = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    signDisplay: min < 0 ? 'exceptZero' : 'auto',
  })

  return `${format.format(value)} ${config.unit}`
}

export const formatPointValues = (values: readonly PointValue[]): string =>
  values
    .map(({ config, value, direction }) => {
      const text = `${config.title} ${formatValue(config, value)}`

      return direction === null ? text : `${text}, ${compassPoint(direction)}`
    })
    .join(' · ')
