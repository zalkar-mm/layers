import { startUrlSync } from '@/features/url-sync'

import { baseLayerRegistry, getActiveRegistry } from '@/entities/layer'

export const startBrowserUrlSync = (): void => {
  startUrlSync({
    shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
    getSearch: () => window.location.search,
    replaceSearch: (search) => {
      const { pathname, hash } = window.location
      window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
    },
  })
}
