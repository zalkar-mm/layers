import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { baseLayerRegistry, layerId } from '@/entities/layer/config/layers/base-layers'
import {
  useLayerIds,
  useLayerMapStatus,
  useLayerRow,
  useLayersSummary,
  useMapOverlay,
} from '@/entities/layer/model/selectors/hooks'
import {
  layerStore,
  setActiveRegistry,
  subscribeToLayers,
} from '@/entities/layer/model/store/layer-store'
import { updateLayer } from '@/entities/layer/model/store/store'

import { withStores } from '@tests/render-with-stores'

const temperature = layerId('temperature')

let active = 0

const trackSubscriptions = () => {
  const original = layerStore.on.bind(layerStore)
  vi.spyOn(layerStore, 'on').mockImplementation((key, callback) => {
    const unsubscribe = original(key, callback)
    active += 1
    let done = false

    return () => {
      if (!done) {
        done = true
        active -= 1
      }
      unsubscribe()
    }
  })
}

function Consumer() {
  const ids = useLayerIds()
  const summary = useLayersSummary()
  const overlay = useMapOverlay(10)
  const view = useLayerRow(temperature)
  const status = useLayerMapStatus(temperature)

  return (
    <p>
      {ids.length} {summary.enabled} {overlay.enabledCount} {view.opacity} {status}
    </p>
  )
}

const mount = () =>
  render(
    <>
      <Consumer />
      <Consumer />
    </>,
    withStores,
  )

beforeEach(() => {
  active = 0
  setActiveRegistry(baseLayerRegistry)
  trackSubscriptions()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('утечки подписок хуков (ТЗ §4.3, §9)', () => {
  it('размонтирование в StrictMode возвращает число подписок к исходному', () => {
    const view = mount()
    const mounted = active
    expect(mounted).toBeGreaterThan(0)

    view.unmount()

    expect(active).toBe(0)
  })

  it('смонтировать → размонтировать → смонтировать: подписок столько же, сколько после первого раза', () => {
    mount().unmount()
    const afterFirstCycle = active
    const view = mount()
    const afterFirst = active
    view.unmount()

    const { unmount } = mount()

    expect(active).toBe(afterFirst)
    unmount()
    expect(afterFirstCycle).toBe(0)
    expect(active).toBe(0)
  })

  it('обновления стора после размонтирования не доходят до отписанных слушателей', () => {
    const view = mount()
    view.unmount()
    const listener = vi.fn()
    const unsubscribe = subscribeToLayers(listener)
    listener.mockClear()

    act(() => {
      updateLayer(layerStore, temperature, (layer) => ({ ...layer, opacity: 0.2 }))
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(active).toBe(1)
    unsubscribe()
    unsubscribe()
    expect(active).toBe(0)
  })

  it('V6: монтирование и размонтирование в StrictMode не отписывает чужого подписчика @state', () => {
    const view = mount()
    const foreign = vi.fn()
    const unsubscribeForeign = layerStore.on('@state', foreign)
    foreign.mockClear()

    view.unmount()
    mount().unmount()
    act(() => {
      updateLayer(layerStore, temperature, (layer) => ({ ...layer, opacity: 0.4 }))
    })

    expect(foreign).toHaveBeenCalledTimes(1)
    unsubscribeForeign()
  })
})
