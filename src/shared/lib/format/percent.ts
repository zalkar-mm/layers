export const PERCENT_MAX = 100

export const toPercent = (fraction: number): number => Math.round(fraction * PERCENT_MAX)

export const fromPercent = (percent: number): number => percent / PERCENT_MAX

export const formatPercentValueText = (percent: number): string => `${String(percent)} процентов`
