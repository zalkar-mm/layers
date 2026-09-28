import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'

import { StoreProviders } from '@/app/state/store-providers'

import { theme } from '@/shared/ui'

type StoresWrapperProps = {
  readonly children: ReactNode
}

function StoresWrapper({ children }: StoresWrapperProps) {
  return (
    <ThemeProvider theme={theme}>
      <StoreProviders>{children}</StoreProviders>
    </ThemeProvider>
  )
}

export const withStores = { wrapper: StoresWrapper, reactStrictMode: true } as const

export const renderWithStores = (ui: ReactNode) => render(ui, withStores)
