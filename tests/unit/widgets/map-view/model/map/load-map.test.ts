import { describe, expect, it, vi } from 'vitest'

import { loadMap } from '@/widgets/map-view/model/map/load-map'

const { MapMock } = vi.hoisted(() => ({
  MapMock: vi.fn(function FakeMap(this: Record<string, unknown>) {
    this['on'] = vi.fn()
    this['off'] = vi.fn()
    this['remove'] = vi.fn()
  }),
}))

vi.mock('maplibre-gl', () => ({ Map: MapMock, Popup: vi.fn(), setWorkerUrl: vi.fn() }))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: 'worker.js' }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

describe('loadMap', () => {
  it('отменённый до загрузки MapLibre — карту не создаёт', async () => {
    const controller = new AbortController()
    const loading = loadMap(document.createElement('div'), controller.signal)
    controller.abort()

    await expect(loading).rejects.toThrow('Карта больше не нужна')
    expect(MapMock).not.toHaveBeenCalled()
  })

  it('без отмены — создаёт карту один раз', async () => {
    const loaded = await loadMap(document.createElement('div'), new AbortController().signal)

    expect(MapMock).toHaveBeenCalledTimes(1)
    loaded.destroy()
  })
})
