import { expect, test } from '@playwright/test'

import { layerToggle, showLayers } from './helpers'

test('клавиатура: пробел — тумблер, стрелки — слайдер', async ({ page }) => {
  await page.goto('/')
  await showLayers(page)
  const toggle = layerToggle(page, 'Ветер')

  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  const slider = page.getByRole('slider', { name: 'Прозрачность слоя «Ветер»' })
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')

  await expect(slider).toHaveValue('88')
  await expect(slider).toHaveAttribute('aria-valuetext', '88 процентов')
})

test('переключатель «3 · 100 · 1000» — группа радиокнопок с именем', async ({ page }) => {
  await page.goto('/')
  await showLayers(page)
  const group = page.getByRole('radiogroup', { name: 'Число слоёв' })

  await expect(group).toHaveCount(1)
  await expect(group.getByRole('radio')).toHaveCount(3)
  await expect(group.getByRole('radio', { name: '3' })).toBeChecked()
})
