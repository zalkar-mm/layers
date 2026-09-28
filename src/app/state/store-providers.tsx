import type { ReactNode } from 'react'

import { ChaosSettingsProvider } from '@/features/chaos-settings'
import { StressModeProvider } from '@/features/stress-mode'

import { LayerStoresProvider } from '@/entities/layer'

type StoreProvidersProps = {
  readonly children: ReactNode
}

export function StoreProviders({ children }: StoreProvidersProps) {
  return (
    <LayerStoresProvider>
      <ChaosSettingsProvider>
        <StressModeProvider>{children}</StressModeProvider>
      </ChaosSettingsProvider>
    </LayerStoresProvider>
  )
}
