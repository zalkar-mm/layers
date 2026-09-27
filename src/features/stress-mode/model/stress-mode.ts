import { useSyncExternalStore } from 'react'

import {
  baseLayerRegistry,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  type LayerRegistry,
  switchLayerSet,
} from '@/entities/layer'

import { createStoreSubscribe, createVedroStore } from '@/shared/lib/vedro'

export const STRESS_MODES = [3, 100, 1000] as const

export type StressMode = (typeof STRESS_MODES)[number]

const initial: { readonly mode: StressMode } = { mode: 3 }
const modeStore = createVedroStore('stress-mode', initial)

const registries = new Map<StressMode, LayerRegistry>([[3, baseLayerRegistry]])

const registryFor = (mode: StressMode): LayerRegistry => {
  const cached = registries.get(mode)
  if (cached !== undefined) return cached
  const registry = createLayerRegistry(createSyntheticLayerConfigs(mode))
  registries.set(mode, registry)

  return registry
}

export const setStressMode = (mode: StressMode): void => {
  if (modeStore.get('mode') === mode) return
  switchLayerSet(registryFor(mode), { restore: true })
  modeStore.dispatch({ mode })
}

const subscribe = createStoreSubscribe(modeStore)
const getMode = () => modeStore.get('mode')

export const useStressMode = (): StressMode => useSyncExternalStore(subscribe, getMode)
