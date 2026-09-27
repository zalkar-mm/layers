import type { CachedData, LayerData, LayerId } from './types'

export type LayerCacheSettings = {
  readonly enabled: boolean
  readonly ttlMs: number
  readonly limit: number
}

export type LayerCacheStats = {
  readonly size: number
  readonly limit: number
}

export type CacheLookup =
  | { readonly kind: 'hit'; readonly entry: CachedData }
  | { readonly kind: 'expired' }
  | { readonly kind: 'miss' }

export type LayerCache = {
  readonly lookup: (id: LayerId) => CacheLookup
  readonly get: (id: LayerId) => CachedData | null
  readonly isFresh: (loadedAt: number) => boolean
  readonly set: (id: LayerId, data: LayerData, loadedAt: number) => boolean
  readonly clear: () => void
  readonly configure: (patch: Partial<LayerCacheSettings>) => void
  readonly getSettings: () => LayerCacheSettings
  readonly subscribe: (listener: () => void) => () => void
  readonly getStats: () => LayerCacheStats
}

export const DEFAULT_CACHE_SETTINGS: LayerCacheSettings = {
  enabled: true,
  ttlMs: 5 * 60_000,
  limit: 50,
}

export const createLayerCache = (options: {
  readonly now: () => number
  readonly settings?: Partial<LayerCacheSettings>
}): LayerCache => {
  const { now } = options
  let settings: LayerCacheSettings = { ...DEFAULT_CACHE_SETTINGS, ...options.settings }
  const entries = new Map<LayerId, CachedData>()
  const listeners = new Set<() => void>()
  let stats: LayerCacheStats = { size: 0, limit: settings.limit }

  const notify = () => {
    if (stats.size === entries.size && stats.limit === settings.limit) return
    stats = { size: entries.size, limit: settings.limit }
    for (const listener of listeners) listener()
  }

  const isFresh = (loadedAt: number) => now() - loadedAt <= settings.ttlMs

  const pruneExpired = () => {
    for (const [id, entry] of entries) {
      if (!isFresh(entry.loadedAt)) entries.delete(id)
    }
  }

  const evictOverLimit = () => {
    for (const oldest of entries.keys()) {
      if (entries.size <= settings.limit) break
      entries.delete(oldest)
    }
  }

  const api: LayerCache = {
    lookup: (id) => {
      if (!settings.enabled) return { kind: 'miss' }
      const entry = entries.get(id)
      if (entry === undefined) return { kind: 'miss' }
      entries.delete(id)
      if (!isFresh(entry.loadedAt)) {
        notify()

        return { kind: 'expired' }
      }
      entries.set(id, entry)

      return { kind: 'hit', entry }
    },
    get: (id) => {
      const result = api.lookup(id)

      return result.kind === 'hit' ? result.entry : null
    },
    isFresh,
    set: (id, data, loadedAt) => {
      if (!settings.enabled) return false
      entries.delete(id)
      pruneExpired()
      entries.set(id, { data, loadedAt })
      evictOverLimit()
      notify()

      return true
    },
    clear: () => {
      entries.clear()
      notify()
    },
    configure: (patch) => {
      settings = { ...settings, ...patch }
      if (!settings.enabled) entries.clear()
      evictOverLimit()
      notify()
    },
    getSettings: () => settings,
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    getStats: () => stats,
  }

  return api
}
