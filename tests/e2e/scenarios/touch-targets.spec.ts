import { expect, type Locator, type Page, test } from '@playwright/test'

import { configureApi, layerRow, layerToggle, showChaos, showLayers } from '../helpers'

const CONTROLS = [
  'button',
  'summary',
  'input:not([type="radio"])',
  '[role="switch"]',
  'label:has(> input[type="radio"])',
].join(', ')

type Miss = {
  readonly control: string
  readonly x: number
  readonly y: number
  readonly hit: string
}

const probeControls = (scope: Locator): Promise<Miss[]> =>
  scope.evaluate((root, selector) => {
    const EDGE_INSET = 1
    const CORNER_SIZE = 4
    const STEP = 6
    const steps = (from: number, to: number) => {
      const count = Math.max(1, Math.ceil((to - from) / STEP))

      return Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count)
    }
    const inCorner = (rect: DOMRect, x: number, y: number) =>
      Math.min(x - rect.left, rect.right - x) < CORNER_SIZE &&
      Math.min(y - rect.top, rect.bottom - y) < CORNER_SIZE
    const nameOf = (element: Element | null) =>
      element === null
        ? 'null'
        : `${element.tagName.toLowerCase()} «${(element.getAttribute('aria-label') ?? element.textContent).trim().slice(0, 40)}»`
    const misses: Miss[] = []

    for (const control of root.querySelectorAll(selector)) {
      control.scrollIntoView({ block: 'center', inline: 'nearest' })
      const rect = control.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const xs = steps(rect.left + EDGE_INSET, rect.right - EDGE_INSET)
      const ys = steps(rect.top + EDGE_INSET, rect.bottom - EDGE_INSET)
      const points = xs
        .flatMap((x) => ys.map((y) => [x, y] as const))
        .filter(([x, y]) => !inCorner(rect, x, y))
      for (const [x, y] of points) {
        const hit = document.elementFromPoint(x, y)
        if (hit !== null && (hit === control || control.contains(hit))) continue
        misses.push({
          control: nameOf(control),
          x: Math.round(x),
          y: Math.round(y),
          hit: nameOf(hit),
        })
      }
    }

    return misses
  }, CONTROLS)

const sheet = (page: Page) => page.getByRole('complementary')

const probeBothTabs = async (page: Page): Promise<Miss[]> => {
  await showLayers(page)
  const layerMisses = await probeControls(sheet(page))
  await showChaos(page)
  const chaosMisses = await probeControls(sheet(page))

  return [...layerMisses, ...chaosMisses]
}

test('тач-зоны контролов не перекрывают соседей: исходное состояние', async ({ page }) => {
  await page.goto('/')

  expect(await probeBothTabs(page)).toEqual([])
})

test('тач-зоны контролов не перекрывают соседей: ошибка, успех и спам-клик', async ({ page }) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 100, delayMs: 0 })
  await layerToggle(page, 'Ветер').click()
  await expect(
    layerRow(page, 'Ветер').getByRole('button', { name: /^Повторить загрузку/ }),
  ).toBeVisible()
  await configureApi(page, { errorPercent: 0, delayMs: 0 })
  await layerToggle(page, 'Температура').click()
  await expect(
    layerRow(page, 'Температура').getByRole('button', { name: /^Обновить слой/ }),
  ).toBeVisible()

  expect(await probeBothTabs(page)).toEqual([])

  await page.getByRole('button', { name: 'Спам-клик', exact: true }).click()
  expect(await probeControls(sheet(page))).toEqual([])
})
