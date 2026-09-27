import { describe, expect, it } from 'vitest'

import { baseLayerRegistry } from '../config/base-layers'

import type { LayerData, LayerError, LoadState } from './types'

// Проверки типов: каждая строка с @ts-expect-error обязана не компилироваться,
const data: LayerData = { type: 'FeatureCollection', features: [] }
const error: LayerError = { kind: 'network', message: 'Нет соединения' }

describe('типы модели слоя (ТЗ §4.1, §4.2)', () => {
  it('невозможные состояния загрузки не компилируются', () => {
    const errorWithData: LoadState = {
      kind: 'error',
      error,
      attempt: 1,
      stale: null,
      // @ts-expect-error
      data,
    }

    // @ts-expect-error
    const loadingWithoutStale: LoadState = { kind: 'loading', requestId: 1, startedAt: 0 }

    expect([errorWithData, loadingWithoutStale]).toHaveLength(2)
  })

  it('голая строка не принимается там, где нужен LayerId', () => {
    // @ts-expect-error
    expect(() => baseLayerRegistry.get('wind')).not.toThrow()
  })
})
