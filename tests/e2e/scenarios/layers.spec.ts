import { expect, test } from '@playwright/test'

import { configureApi, layerRow, layerToggle, showChaos, showLayers } from '../helpers'

test('E1: включить слой → загрузка → готово', async ({ page }) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 0, delayMs: 800 })

  await layerToggle(page, 'Температура').click()

  const row = layerRow(page, 'Температура')
  await expect(row.getByText('Загрузка…')).toBeVisible()
  await expect(row.getByText(/^Готово · \d+ мс$/)).toBeVisible()
  await expect(page.getByText('Слои · активно 1 из 3')).toBeVisible()
})

test('E2: при 100 % ошибок — ошибка, при 0 % — повтор успешен', async ({ page }) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 100, delayMs: 300 })

  await layerToggle(page, 'Ветер').click()
  const row = layerRow(page, 'Ветер')
  await expect(row.getByText('Ошибка', { exact: true })).toBeVisible()
  await expect(row.getByText(/попытка 1/)).toBeVisible()

  await configureApi(page, { errorPercent: 0, delayMs: 300 })
  await row.getByRole('button', { name: 'Повторить загрузку слоя «Ветер»' }).click()

  await expect(row.getByText(/^Готово/)).toBeVisible()
  await expect(row.getByText(/попытка/)).toBeHidden()
})

test('E3: спам-клик — финальное состояние консистентно', async ({ page }) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 0, delayMs: 300 })
  await showChaos(page)

  await page.getByRole('button', { name: 'Спам-клик', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Спам-клик…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Спам-клик', exact: true })).toBeEnabled()
  await expect(page.getByRole('list', { name: 'Лог событий' })).toContainText('abort')
  await showLayers(page)

  for (const title of ['Температура', 'Ветер', 'Инсоляция']) {
    await expect(layerToggle(page, title)).toHaveAttribute('aria-checked', 'false')
    await expect(layerRow(page, title).getByText(/Загрузка|Обновление/)).toBeHidden()
  }
  await expect(page.getByText('Слои · активно 0 из 3')).toBeVisible()
})

test('E3b: сервер отвечает, несмотря на отмену — ответ отброшен по номеру запроса', async ({
  page,
}) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 0, delayMs: 300 })
  await showChaos(page)
  await page.getByRole('switch', { name: 'Сервер отвечает, несмотря на отмену' }).click()

  await page.getByRole('button', { name: 'Спам-клик', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Спам-клик', exact: true })).toBeEnabled()

  const log = page.getByRole('list', { name: 'Лог событий' })
  await expect(log).toContainText('отброшен (устаревший)')
  await showLayers(page)
  await expect(page.getByText('Слои · активно 0 из 3')).toBeVisible()
})

test('E4: ссылка со слоями восстанавливает состояние, изменения пишутся в URL', async ({
  page,
}) => {
  await page.goto('/?l=temperature:70,wind:40,unknown:10')
  await showLayers(page)

  await expect(layerToggle(page, 'Температура')).toHaveAttribute('aria-checked', 'true')
  await expect(layerToggle(page, 'Ветер')).toHaveAttribute('aria-checked', 'true')
  await expect(layerToggle(page, 'Инсоляция')).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('slider', { name: 'Прозрачность слоя «Ветер»' })).toHaveValue('40')
  await expect(page.getByRole('slider', { name: 'Прозрачность слоя «Температура»' })).toHaveValue(
    '70',
  )

  const historyLength = await page.evaluate(() => window.history.length)
  await page.getByRole('slider', { name: 'Прозрачность слоя «Ветер»' }).fill('55')
  await expect(page).toHaveURL(/\?l=temperature:70,wind:55$/)
  expect(await page.evaluate(() => window.history.length)).toBe(historyLength)

  await layerToggle(page, 'Температура').click()
  await expect(page).toHaveURL(/\?l=wind:55$/)
})

test('E5: загрузить → выкл → вкл — данные видны сразу, «Обновление», затем «Готово»', async ({
  page,
}) => {
  await page.goto('/')
  await configureApi(page, { errorPercent: 0, delayMs: 1500 })
  const toggle = layerToggle(page, 'Инсоляция')
  const row = layerRow(page, 'Инсоляция')

  await toggle.click()
  await expect(row.getByText(/^Готово/)).toBeVisible()
  await toggle.click()
  await toggle.click()

  await expect(row.getByText(/^Обновление · данные/)).toBeVisible()
  await expect(row.getByText(/^Готово/)).toBeVisible()
})

test('E6: возврат из стресс-режима — слои и ссылка на месте', async ({ page }) => {
  await page.goto('/?l=temperature:30')
  await showLayers(page)
  const modes = page.getByRole('radiogroup', { name: 'Число слоёв' })
  await expect(layerToggle(page, 'Температура')).toHaveAttribute('aria-checked', 'true')

  await modes.getByText('1000', { exact: true }).click()
  await expect(page.getByText('Слои · активно 0 из 1000')).toBeVisible()
  await modes.getByText('3', { exact: true }).click()

  await expect(layerToggle(page, 'Температура')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('slider', { name: 'Прозрачность слоя «Температура»' })).toHaveValue(
    '30',
  )
  await expect(page).toHaveURL(/\?l=temperature:30$/)

  await page.getByRole('slider', { name: 'Прозрачность слоя «Температура»' }).fill('35')
  await expect(page).toHaveURL(/\?l=temperature:35$/)
})
