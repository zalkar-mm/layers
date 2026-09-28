import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MapPage } from '@/pages/map-page/ui/map-page'

import { renderWithStores } from '@tests/render-with-stores'

describe('MapPage', () => {
  it('показывает заголовок страницы', () => {
    renderWithStores(<MapPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Управление GIS-слоями' }),
    ).toBeInTheDocument()
  })
})
