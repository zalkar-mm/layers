import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it } from 'vitest'

import { theme } from '@/shared/ui'

import { MapPage } from './map-page'

describe('MapPage', () => {
  it('показывает заголовок страницы', () => {
    render(
      <ThemeProvider theme={theme}>
        <MapPage />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Управление GIS-слоями' }),
    ).toBeInTheDocument()
  })
})
