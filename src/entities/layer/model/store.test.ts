import { describe, expect, it, vi } from 'vitest'

import { baseLayerRegistry, layerId } from '../config/base-layers'

import { createLayerStore, replaceLayers, updateLayer, updateLayers } from './store'

const temperature = layerId('temperature')
const wind = layerId('wind')
const insolation = layerId('insolation')

describe('стор слоёв (ТЗ §4.2)', () => {
  it('создаётся из реестра: ids в порядке реестра, все слои выключены', () => {
    const store = createLayerStore(baseLayerRegistry)

    expect(store.get('ids')).toEqual(['temperature', 'wind', 'insolation'])
    expect(store.get('byId')[wind]).toEqual({
      enabled: false,
      opacity: 0.9,
      load: { kind: 'idle' },
    })
  })

  it('R9: изменение слоя A не меняет ссылки byId[B], byId[C] и ids', () => {
    const store = createLayerStore(baseLayerRegistry)
    const before = { ids: store.get('ids'), byId: store.get('byId') }

    updateLayer(store, temperature, (layer) => ({ ...layer, opacity: 0.5 }))
    const after = { ids: store.get('ids'), byId: store.get('byId') }

    expect(after.byId).not.toBe(before.byId)
    expect(after.byId[temperature]).not.toBe(before.byId[temperature])
    expect(after.byId[wind]).toBe(before.byId[wind])
    expect(after.byId[insolation]).toBe(before.byId[insolation])
    expect(after.ids).toBe(before.ids)
  })

  it('если апдейтер вернул тот же объект, dispatch не происходит', () => {
    const store = createLayerStore(baseLayerRegistry)
    const listener = vi.fn()
    store.on('@state', listener)
    listener.mockClear()

    updateLayer(store, temperature, (layer) => layer)

    expect(listener).not.toHaveBeenCalled()
  })

  it('массовое обновление — один dispatch', () => {
    const store = createLayerStore(baseLayerRegistry)
    const listener = vi.fn()
    store.on('@state', listener)
    listener.mockClear()

    updateLayers(store, store.get('ids'), (layer) => ({ ...layer, enabled: true }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(Object.values(store.get('byId')).every((layer) => layer.enabled)).toBe(true)
  })

  it('неизвестный id игнорируется', () => {
    const store = createLayerStore(baseLayerRegistry)
    const before = store.get('byId')

    updateLayers(store, [], () => {
      throw new Error('не должен вызываться')
    })

    expect(store.get('byId')).toBe(before)
  })

  it('replaceLayers заменяет набор слоёв', () => {
    const store = createLayerStore(baseLayerRegistry)
    updateLayer(store, wind, (layer) => ({ ...layer, enabled: true }))

    replaceLayers(store, baseLayerRegistry)

    expect(store.get('byId')[wind]?.enabled).toBe(false)
  })
})
