import { getActiveRegistry, layerApi, layerCache, layerCommands } from '@/entities/layer'

import { createRandomSeed } from '@/shared/api'
import { bindVedroStore, createVedroStore } from '@/shared/lib/vedro'

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

export const setMinDelayMs = (minDelayMs: number): void => {
  updateChaosSettings({ minDelayMs })
}

export const setMaxDelayMs = (maxDelayMs: number): void => {
  updateChaosSettings({ maxDelayMs })
}

export const setErrorRate = (errorRate: number): void => {
  updateChaosSettings({ errorRate })
}

export const setSeed = (seed: number): void => {
  updateChaosSettings({ seed })
}

export const setCacheTtlMs = (cacheTtlMs: number): void => {
  updateChaosSettings({ cacheTtlMs })
}

export const toggleIgnoreAbort = (): void => {
  updateChaosSettings({ ignoreAbort: !settingsStore.get('settings').ignoreAbort })
}

export const toggleCache = (): void => {
  updateChaosSettings({ cacheEnabled: !settingsStore.get('settings').cacheEnabled })
}

const SPAM_CLICKS = 20
const SPAM_DURATION_MS = 500

let stopRunningSpam: (() => void) | null = null

export const stopSpam = (): void => {
  stopRunningSpam?.()
}

export const spamClick = (): void => {
  stopSpam()
  const { ids } = getActiveRegistry()
  const target = ids[Math.floor(Math.random() * ids.length)]
  if (target === undefined) return

  let clicks = 0
  const stop = () => {
    clearInterval(timer)
    if (stopRunningSpam === stop) stopRunningSpam = null
    settingsStore.dispatch({ spamming: false })
  }
  const timer = setInterval(() => {
    layerCommands.toggle(target)
    clicks += 1
    if (clicks >= SPAM_CLICKS) stop()
  }, SPAM_DURATION_MS / SPAM_CLICKS)
  stopRunningSpam = stop
  settingsStore.dispatch({ spamming: true })
}

const settingsBinding = bindVedroStore(settingsStore)

export const ChaosSettingsProvider = settingsBinding.Provider

export const useChaosSetting = <K extends keyof ChaosSettings>(key: K): ChaosSettings[K] =>
  settingsBinding.useSelector((state) => state.settings[key])

export const useSpamming = (): boolean => settingsBinding.useSelector((state) => state.spamming)
