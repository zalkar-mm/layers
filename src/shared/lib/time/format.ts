export const formatAge = (ageMs: number): string => {
  const minutes = Math.floor(Math.max(0, ageMs) / 60_000)
  if (minutes < 1) return 'меньше минуты назад'
  if (minutes < 60) return `${String(minutes)} мин назад`

  return `${String(Math.floor(minutes / 60))} ч назад`
}

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${String(seconds)} с`

  return seconds === 0 ? `${String(minutes)} мин` : `${String(minutes)} мин ${String(seconds)} с`
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export const formatNumber = (value: number): string => numberFormat.format(value)
