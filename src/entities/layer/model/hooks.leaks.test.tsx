import { StrictMode } from 'react'

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import {
  useEnabledLayerIds,
  useLayer,
  useLayerIds,
  useLayerMapStatus,
  useLayersSummary,
} from './hooks'
import { layerStore, setActiveRegistry, subscribeToLayers } from './layer-store'
import { updateLayer } from './store'

// Утечки подписок (ТЗ §9: «без утечек — проверяется повторным монтированием в StrictMode»).
// Считаем живые подписки на стор слоёв: каждый вызов layerStore.on оборачивается,
// отписка уменьшает счётчик один раз (повторная отписка — V6 — не должна влиять).

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
  const enabled = useEnabledLayerIds()
  const layer = useLayer(temperature)
  const status = useLayerMapStatus(temperature)

  return (
    <p>
      {ids.length} {summary.enabled} {enabled.length} {layer.opacity} {status}
    </p>
  )
}

const mount = () =>
  render(
    <StrictMode>
      <Consumer />
      <Consumer />
    </StrictMode>,
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

    // Жив только новый слушатель; ошибок «setState на размонтированном» нет — React бы предупредил.
    expect(listener).toHaveBeenCalledTimes(1)
    expect(active).toBe(1)
    unsubscribe()
    unsubscribe()
    expect(active).toBe(0)
  })
})
