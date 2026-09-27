import { createBrowserRouter } from 'react-router'

import { MapPage } from '@/pages/map-page'

import { applyUrlState, startUrlSync } from '@/features/url-sync'

import { baseLayerRegistry, getActiveRegistry } from '@/entities/layer'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <MapPage />,
      loader: ({ request }) => {
        applyUrlState(new URL(request.url).search)

        return null
      },
      shouldRevalidate: () => false,
    },
  ],
  { basename },
)

startUrlSync({
  shouldWrite: () => getActiveRegistry() === baseLayerRegistry,
  getSearch: () => window.location.search,
  replaceSearch: (search) => {
    const { pathname, hash } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
  },
})
