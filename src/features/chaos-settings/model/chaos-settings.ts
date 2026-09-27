import { useSyncExternalStore } from 'react'

import { getActiveRegistry, layerApi, layerCache, layerCommands } from '@/entities/layer'

import { createRandomSeed } from '@/shared/api'
import { createStoreSubscribe, createVedroStore } from '@/shared/lib/vedro'

export type ChaosSettings = {
  readonly minDelayMs: number
  readonly maxDelayMs: number
  readonly errorRate: number
  readonly seed: number
  readonly ignoreAbort: boolean
  readonly cacheEnabled: boolean
  readonly cacheTtlMs: number
}

export const DELAY_LIMIT_MS = 5000
export const TTL_MIN_MS = 10_000
export const TTL_MAX_MS = 10 * 60_000

const readSettings = (): ChaosSettings => {
  const api = layerApi.getSettings()
  const cache = layerCache.getSettings()

  return {
    minDelayMs: api.minDelayMs,
    maxDelayMs: api.maxDelayMs,
    errorRate: api.errorRate,
    seed: api.seed,
    ignoreAbort: api.ignoreAbort,
    cacheEnabled: cache.enabled,
    cacheTtlMs: cache.ttlMs,
  }
}

const settingsStore = createVedroStore('chaos-settings', {
  settings: readSettings(),
  spamming: false,
})

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const updateChaosSettings = (patch: Partial<ChaosSettings>): void => {
  const current = settingsStore.get('settings')
  const next = { ...current, ...patch }
  const minDelayMs = clamp(Math.round(next.minDelayMs), 0, DELAY_LIMIT_MS)
  const maxDelayMs = clamp(Math.round(next.maxDelayMs), 0, DELAY_LIMIT_MS)
  const settings: ChaosSettings = {
    ...next,
    minDelayMs: patch.maxDelayMs === undefined ? minDelayMs : Math.min(minDelayMs, maxDelayMs),
    maxDelayMs: patch.maxDelayMs === undefined ? Math.max(minDelayMs, maxDelayMs) : maxDelayMs,
    errorRate: clamp(next.errorRate, 0, 1),
    cacheTtlMs: clamp(next.cacheTtlMs, TTL_MIN_MS, TTL_MAX_MS),
  }

  layerApi.configure({
    minDelayMs: settings.minDelayMs,
    maxDelayMs: settings.maxDelayMs,
    errorRate: settings.errorRate,
    ignoreAbort: settings.ignoreAbort,
    ...(patch.seed === undefined ? {} : { seed: settings.seed }),
  })
  layerCache.configure({ enabled: settings.cacheEnabled, ttlMs: settings.cacheTtlMs })
  settingsStore.dispatch({ settings })
}

export const randomizeSeed = (): void => {
  updateChaosSettings({ seed: createRandomSeed() })
}

const SPAM_CLICKS = 20
const SPAM_DURATION_MS = 500

export const spamClick = (): (() => void) => {
  const { ids } = getActiveRegistry()
  const target = ids[Math.floor(Math.random() * ids.length)]
  if (target === undefined) return () => undefined

  let clicks = 0
  const stop = () => {
    clearInterval(timer)
    settingsStore.dispatch({ spamming: false })
  }
  const timer = setInterval(() => {
    layerCommands.toggle(target)
    clicks += 1
    if (clicks >= SPAM_CLICKS) stop()
  }, SPAM_DURATION_MS / SPAM_CLICKS)
  settingsStore.dispatch({ spamming: true })

  return stop
}

const subscribe = createStoreSubscribe(settingsStore)
const getSettings = () => settingsStore.get('settings')
const getSpamming = () => settingsStore.get('spamming')

export const useChaosSettings = (): ChaosSettings => useSyncExternalStore(subscribe, getSettings)

export const useSpamming = (): boolean => useSyncExternalStore(subscribe, getSpamming)
