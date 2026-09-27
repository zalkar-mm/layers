import { RouterProvider } from 'react-router/dom'
import { ThemeProvider } from 'styled-components'

import { theme } from '@/shared/ui'

import { GlobalStyles } from './styles/global-styles'
import { router } from './router'

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
