import { RouterProvider } from 'react-router/dom'
import { ThemeProvider } from 'styled-components'

import { theme } from '@/shared/ui'

import { router } from './routing/router'
import { StoreProviders } from './state/store-providers'
import { GlobalStyles } from './styles/global-styles'

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <StoreProviders>
        <RouterProvider router={router} />
      </StoreProviders>
    </ThemeProvider>
  )
}
