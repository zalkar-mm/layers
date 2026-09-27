import { act, render } from '@testing-library/react'
import { createVedro } from 'vedro'
import { describe, expect, it } from 'vitest'

import {
  createLayerRegistry,
  createSyntheticLayerConfigs,
  layerApi,
  layerCommands,
  type LayerData,
  type LayerId,
  switchLayerSet,
  useLayer,
  useLayersSummary,
} from '@/entities/layer'

const RUNS = 30

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const time = (action: () => void): number => {
  const start = performance.now()
  act(action)

  return performance.now() - start
}

type Row = { enabled: boolean; opacity: number; data: LayerData | null }

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
  render(<Summary />).unmount()
  expect(probe.loaded).toBe(count)
}

describe.skipIf(import.meta.env.VITE_PERF !== '1')('сравнение подписок', () => {
  it.each([
    [100, false],
    [1000, false],
    [100, true],
    [1000, true],
  ])(
    'изменение одного слоя из %i (слои загружены: %s)',
    { timeout: 180_000 },
    async (count, loaded) => {
      const registry = createLayerRegistry(createSyntheticLayerConfigs(count))
      const [maybeFirst] = registry.ids
      if (maybeFirst === undefined) throw new Error('нет слоёв')
      const first: LayerId = maybeFirst

      switchLayerSet(registry)
      if (loaded) await loadAll(count)
      const sample = loaded
        ? await layerApi.fetchLayerData(first, { signal: new AbortController().signal })
        : null
      let ownRenders = 0
      function OwnRow({ id }: { id: LayerId }) {
        ownRenders += 1

        return <span>{useLayer(id).opacity}</span>
      }
      const { unmount: unmountOwn } = render(
        <>
          {registry.ids.map((id) => (
            <OwnRow key={id} id={id} />
          ))}
        </>,
      )
      ownRenders = 0
      const ownTimes = Array.from({ length: RUNS }, (_, run) =>
        time(() => {
          layerCommands.setOpacity(first, run % 2)
        }),
      )
      const ownRendersPerAction = ownRenders / RUNS
      unmountOwn()

      const byId: Record<string, Row> = {}
      for (const id of registry.ids) byId[id] = { enabled: loaded, opacity: 0.5, data: sample }
      const vedro = createVedro({ byId })
      const probe: { dispatch?: (opacity: number) => void } = {}
      let vedroRenders = 0
      function VedroRow({ id }: { id: string }) {
        vedroRenders += 1

        return <span>{vedro.useSelector((state) => state.byId[id])?.opacity}</span>
      }
      function Probe() {
        const store = vedro.useStore()
        probe.dispatch = (opacity) => {
          store.dispatch((state) => ({
            byId: { ...state.byId, [first]: { enabled: loaded, opacity, data: sample } },
          }))
        }

        return null
      }
      const { unmount: unmountStandard } = render(
        <vedro.Provider>
          <Probe />
          {registry.ids.map((id) => (
            <VedroRow key={id} id={id} />
          ))}
        </vedro.Provider>,
      )
      vedroRenders = 0
      const vedroRuns = loaded && count === 1000 ? 10 : RUNS
      const vedroTimes = Array.from({ length: vedroRuns }, (_, run) =>
        time(() => {
          probe.dispatch?.(run % 2)
        }),
      )
      const vedroRendersPerAction = vedroRenders / vedroRuns
      unmountStandard()
      layerCommands.disableAll()

      const result = {
        count,
        loaded,
        cellsPerLayer: sample?.features.length ?? 0,
        ownMedianMs: Number(median(ownTimes).toFixed(3)),
        ownRendersPerAction,
        vedroMedianMs: Number(median(vedroTimes).toFixed(3)),
        vedroRendersPerAction,
      }
      console.warn(`PERF ${JSON.stringify(result)}`)
      expect(result.ownRendersPerAction).toBe(1)
    },
  )
})
