import { expect, type Page, test } from '@playwright/test'

test.skip(process.env.PERF !== '1', 'Замеры запускаются отдельно: PERF=1')

type Measure = {
  ms: number
  taskMs: number
  renders: Record<string, number>
  mounted: string[]
}

const readCounts = (page: Page) =>
  page.evaluate(() => {
    const result: Record<string, number> = {}
    for (const element of document.querySelectorAll('[data-render-count]')) {
      const name = element.getAttribute('data-render-count') ?? ''
      result[name] = Number(element.textContent)
    }

    return result
  })

const diff = (before: Record<string, number>, after: Record<string, number>) => {
  const renders: Record<string, number> = {}
  const mounted: string[] = []
  for (const [name, value] of Object.entries(after)) {
    const previous = before[name]
    if (previous === undefined) {
      mounted.push(name)
      continue
    }
    if (value !== previous) renders[name] = value - previous
  }

  return { renders, mounted }
}

type Action = 'toggle' | 'slider' | 'enableAll' | 'disableAll'

const measure = async (page: Page, action: Action): Promise<Measure> => {
  const before = await readCounts(page)
  const { ms, taskMs } = await page.evaluate(async (kind) => {
    const clickButton = (text: string) => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === text)
      button?.click()
    }
    const run = () => {
      switch (kind) {
        case 'toggle': {
          const toggle = document.querySelector<HTMLElement>('[role="switch"][aria-label^="Слой"]')
          toggle?.click()
          break
        }
        case 'slider': {
          const slider = document.querySelector<HTMLInputElement>(
            'input[type="range"][aria-label^="Прозрачность слоя"]',
          )
          if (slider === null) return
          Reflect.set(
            HTMLInputElement.prototype,
            'value',
            String((Number(slider.value) + 7) % 100),
            slider,
          )
          slider.dispatchEvent(new Event('input', { bubbles: true }))
          break
        }
        case 'enableAll':
          clickButton('Включить все')
          break
        case 'disableAll':
          clickButton('Выключить все')
          break
      }
    }
    const start = performance.now()
    run()
    const syncMs = performance.now() - start
    const taskEnd = await new Promise<number>((resolve) => {
      queueMicrotask(() => {
        resolve(performance.now())
      })
    })

    return { ms: syncMs, taskMs: taskEnd - start }
  }, action)
  const after = await readCounts(page)

  return { ms, taskMs, ...diff(before, after) }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

for (const mode of [3, 100, 1000] as const) {
  test(`замеры: ${String(mode)} слоёв`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Замеры — только на десктопном проекте')
    await page.goto('/')
    await page
      .getByRole('radiogroup', { name: 'Число слоёв' })
      .getByText(String(mode), { exact: true })
      .click()
    await expect(page.getByText(`Слои · активно 0 из ${String(mode)}`)).toBeVisible()

    const toggles: Measure[] = []
    for (let run = 0; run < 10; run += 1) toggles.push(await measure(page, 'toggle'))
    const sliders: Measure[] = []
    for (let run = 0; run < 20; run += 1) sliders.push(await measure(page, 'slider'))
    const enableAll = [await measure(page, 'enableAll')]
    const disableAll = [await measure(page, 'disableAll')]
    for (let run = 0; run < 5; run += 1) {
      enableAll.push(await measure(page, 'enableAll'))
      disableAll.push(await measure(page, 'disableAll'))
    }
    const warm = (runs: Measure[], key: 'ms' | 'taskMs') =>
      Number(median(runs.slice(1).map((m) => m[key])).toFixed(2))
    const cold = (runs: Measure[], key: 'ms' | 'taskMs') => Number((runs[0]?.[key] ?? 0).toFixed(2))

    const result = {
      mode,
      toggleMedianMs: Number(median(toggles.map((m) => m.ms)).toFixed(2)),
      toggleTaskMedianMs: Number(median(toggles.map((m) => m.taskMs)).toFixed(2)),
      toggleRenders: toggles.at(-1)?.renders,
      toggleMountedMax: Math.max(...toggles.map((m) => m.mounted.length)),
      sliderMedianMs: Number(median(sliders.map((m) => m.ms)).toFixed(2)),
      sliderTaskMedianMs: Number(median(sliders.map((m) => m.taskMs)).toFixed(2)),
      sliderRenders: sliders.at(-1)?.renders,
      enableAllColdMs: cold(enableAll, 'ms'),
      enableAllMs: warm(enableAll, 'ms'),
      enableAllTaskMs: warm(enableAll, 'taskMs'),
      enableAllColdTaskMs: cold(enableAll, 'taskMs'),
      enableAllRendered: Object.keys(enableAll[0]?.renders ?? {}).length,
      disableAllColdMs: cold(disableAll, 'ms'),
      disableAllMs: warm(disableAll, 'ms'),
      disableAllTaskMs: warm(disableAll, 'taskMs'),
      disableAllColdTaskMs: cold(disableAll, 'taskMs'),
    }
    console.warn(`PERF ${JSON.stringify(result)}`)
    expect(result.sliderMedianMs).toBeGreaterThan(0)
  })
}
