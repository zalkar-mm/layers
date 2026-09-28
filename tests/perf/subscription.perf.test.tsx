import { type ComponentType, useSyncExternalStore } from 'react'

import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  createLayerRegistry,
  createSyntheticLayerConfigs,
  getActiveRegistry,
  layerApi,
  layerCommands,
  type LayerId,
  LayerStoresProvider,
  switchLayerSet,
  useLayerRow,
  useLayersSummary,
} from '@/entities/layer'
import { layerStore } from '@/entities/layer/model/store/layer-store'

import { bindVedroStore } from '@/shared/lib/vedro'

const RUNS = 30
const SLOW_RUNS = 10

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const time = (action: () => void): number => {
  const start = performance.now()
  act(action)

  return performance.now() - start
}

const loadAll = async (count: number) => {
  layerApi.configure({ minDelayMs: 0, maxDelayMs: 0, errorRate: 0, seed: 1 })
  act(() => {
    layerCommands.enableAll()
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  const probe = { loaded: 0 }
  function Summary() {
    const summary = useLayersSummary()
    probe.loaded = summary.enabled - summary.loading - summary.failed

    return null
  }
  render(
    <LayerStoresProvider>
      <Summary />
    </LayerStoresProvider>,
  ).unmount()
  expect(probe.loaded).toBe(count)
}

const antiPattern = bindVedroStore(layerStore)

const subscribeToStore = (onChange: () => void) => {
  let ready = false
  const unsubscribe = layerStore.on('@state', () => {
    if (ready) onChange()
  })
  ready = true

  return unsubscribe
}

let renders = 0

function ViewRow({ id }: { id: LayerId }) {
  renders += 1

  return <span>{useLayerRow(id).opacity}</span>
}

function WholeStateRow({ id }: { id: LayerId }) {
  renders += 1

  return <span>{antiPattern.useSelector((state) => state.byId[id])?.opacity}</span>
}

function ExternalStoreRow({ id }: { id: LayerId }) {
  renders += 1
  const layer = useSyncExternalStore(subscribeToStore, () => layerStore.get('byId')[id])

  return <span>{layer?.opacity}</span>
}

const VARIANTS = {
  'useSelector + LayerRowView': ViewRow,
  'useSelector + LayerState': WholeStateRow,
  'useSyncExternalStore (эталон)': ExternalStoreRow,
} satisfies Record<string, ComponentType<{ id: LayerId }>>

const measure = (Row: ComponentType<{ id: LayerId }>, runs: number) => {
  const { ids } = getActiveRegistry()
  const [first] = ids
  if (first === undefined) throw new Error('нет слоёв')
  const { unmount } = render(
    <LayerStoresProvider>
      <antiPattern.Provider>
        {ids.map((id) => (
          <Row key={id} id={id} />
        ))}
      </antiPattern.Provider>
    </LayerStoresProvider>,
  )
  renders = 0
  const times = Array.from({ length: runs }, (_, run) =>
    time(() => {
      layerCommands.setOpacity(first, run % 2)
    }),
  )
  const rendersPerAction = renders / runs
  unmount()

  return { medianMs: Number(median(times).toFixed(3)), rendersPerAction }
}

describe.skipIf(import.meta.env.VITE_PERF !== '1')('сравнение подписок', () => {
  it.each([
    [100, false],
    [1000, false],
    [100, true],
    [1000, true],
  ])(
    'изменение одного слоя из %i (слои загружены: %s)',
    { timeout: 300_000 },
    async (count, loaded) => {
      switchLayerSet(createLayerRegistry(createSyntheticLayerConfigs(count)))
      if (loaded) await loadAll(count)

      const results = Object.entries(VARIANTS).map(([name, Row]) => {
        const slow = loaded && count === 1000 && Row === WholeStateRow

        return { name, ...measure(Row, slow ? SLOW_RUNS : RUNS) }
      })
      layerCommands.disableAll()

      console.warn(`PERF ${JSON.stringify({ count, loaded, results })}`)
      for (const result of results) expect(result.rendersPerAction).toBe(1)
    },
  )
})
