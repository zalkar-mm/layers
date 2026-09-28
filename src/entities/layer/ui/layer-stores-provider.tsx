import type { ReactNode } from 'react'

import {
  LayerCacheStatsProvider,
  LayerEventsProvider,
  LayerStoreProvider,
} from '../model/selectors/hooks'

type LayerStoresProviderProps = {
  readonly children: ReactNode
}

export function LayerStoresProvider({ children }: LayerStoresProviderProps) {
  return (
    <LayerStoreProvider>
      <LayerEventsProvider>
        <LayerCacheStatsProvider>{children}</LayerCacheStatsProvider>
      </LayerEventsProvider>
    </LayerStoreProvider>
  )
}
