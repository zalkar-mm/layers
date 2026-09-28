import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { startBrowserUrlSync } from './routing/url-sync'
import { App } from './app'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Не найден корневой элемент #root')
}

startBrowserUrlSync()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
