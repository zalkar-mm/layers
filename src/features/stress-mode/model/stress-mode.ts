import {
  baseLayerRegistry,
  createLayerRegistry,
  createSyntheticLayerConfigs,
  type LayerRegistry,
  switchLayerSet,
} from '@/entities/layer'

import { bindVedroStore, createVedroStore } from '@/shared/lib/vedro'

export const STRESS_MODES = [3, 100, 1000] as const

export type StressMode = (typeof STRESS_MODES)[number]

const BASE_STRESS_MODE = STRESS_MODES[0]

const initial: { readonly mode: StressMode } = { mode: BASE_STRESS_MODE }
const modeStore = createVedroStore('stress-mode', initial)

const registries = new Map<StressMode, LayerRegistry>([[BASE_STRESS_MODE, baseLayerRegistry]])

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

const modeBinding = bindVedroStore(modeStore)

export const StressModeProvider = modeBinding.Provider

export const useStressMode = (): StressMode => modeBinding.useSelector((state) => state.mode)
