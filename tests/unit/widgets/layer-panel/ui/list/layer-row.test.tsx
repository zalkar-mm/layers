import { useState } from 'react'

import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LayerRow } from '@/widgets/layer-panel/ui/list/layer-row'

import { baseLayerRegistry, layerCommands, switchLayerSet } from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'
import { layerStore } from '@/entities/layer/model/store/layer-store'
import { updateLayer } from '@/entities/layer/model/store/store'

import { renderWithStores } from '@tests/render-with-stores'

const temperature = layerId('temperature')

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const waitForText = async (text: string) => {
  const deadline = performance.now() + 2000
  while (screen.queryByText(text) === null && performance.now() < deadline) await wait(10)
}

const setActEnvironment = (enabled: boolean) => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', enabled)
}

beforeEach(() => {
  switchLayerSet(baseLayerRegistry)
  updateLayer(layerStore, temperature, (layer) => ({
    ...layer,
    enabled: true,
    load: { kind: 'loading', requestId: 1, startedAt: 0, stale: null },
  }))
})

afterEach(() => {
  setActEnvironment(true)
  layerCommands.cancelAll()
})

describe('LayerRow: V4 без act', () => {
  it('строка, смонтированная по setState из таймера, подхватывает success из setTimeout(0)', async () => {
    let show = () => undefined
    function Host() {
      const [shown, setShown] = useState(false)
      show = () => {
        setShown(true)
      }

      return shown ? <LayerRow id={temperature} /> : null
    }
    renderWithStores(<Host />)
    setActEnvironment(false)

    setTimeout(() => {
      show()
      setTimeout(() => {
        updateLayer(layerStore, temperature, (layer) => ({
          ...layer,
          load: {
            kind: 'success',
            data: { type: 'FeatureCollection', features: [] },
            loadedAt: 840,
            durationMs: 840,
            source: 'network',
          },
        }))
      }, 0)
    }, 0)
    await waitForText('Готово · 840 мс')

    expect(screen.getByText('Готово · 840 мс')).toBeInTheDocument()
  })
})
