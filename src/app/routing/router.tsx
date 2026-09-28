import { createBrowserRouter } from 'react-router'

import { MapPage } from '@/pages/map-page'

import { applyUrlState } from '@/features/url-sync'

import { ROUTES } from './routes'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    {
      path: ROUTES.map,
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
