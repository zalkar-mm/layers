import { expect, type Locator, type Page } from '@playwright/test'

const showSheetTab = async (page: Page, name: 'Слои' | 'Chaos') => {
  const tab = page.getByRole('tab', { name })
  if (await tab.isVisible()) await tab.click()
}

export const showLayers = (page: Page) => showSheetTab(page, 'Слои')

export const showChaos = (page: Page) => showSheetTab(page, 'Chaos')

export const configureApi = async (
  page: Page,
  { errorPercent, delayMs }: { errorPercent: number; delayMs: number },
) => {
  await showSheetTab(page, 'Chaos')
  await page.getByRole('slider', { name: 'Максимальная задержка' }).fill(String(delayMs))
  await page.getByRole('slider', { name: 'Минимальная задержка' }).fill(String(delayMs))
  await page.getByRole('slider', { name: 'Доля ошибок' }).fill(String(errorPercent))
  await expect(page.getByText(`Доля ошибок: ${String(errorPercent)} %`)).toBeVisible()
  await showLayers(page)
}

export const layerRow = (page: Page, title: string): Locator =>
  page.getByRole('group', { name: title })

export const layerToggle = (page: Page, title: string): Locator =>
  page.getByRole('switch', { name: `Слой «${title}»` })
