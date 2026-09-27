import { expect, test } from '@playwright/test'

/* eslint-disable playwright/no-wait-for-timeout */
test.skip(process.env.SCREENSHOT !== '1', 'Только вручную: SCREENSHOT=1')

test('карта со слоями', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Снимок — только десктоп')
  await page.goto('/')
  await page.getByRole('slider', { name: 'Доля ошибок' }).fill('0')
  await page.getByRole('button', { name: 'Включить все' }).click()
  await expect(page.getByText('Слои · активно 3 из 3')).toBeVisible()
  await expect(page.getByText(/^Готово/)).toHaveCount(3, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: testInfo.outputPath('map.png') })
  await page.mouse.click(
    testInfo.project.name === 'desktop' ? 900 : 180,
    testInfo.project.name === 'desktop' ? 450 : 250,
  )
  await page.waitForTimeout(500)
  await page.screenshot({ path: testInfo.outputPath('map-popup.png') })
})
