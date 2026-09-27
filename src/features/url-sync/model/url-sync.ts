import { getActiveRegistry, layerCommands, subscribeToLayers } from '@/entities/layer'

import { LAYERS_PARAM, parseLayersParam, serializeLayers, withLayersParam } from './layers-param'

export const URL_WRITE_DELAY_MS = 300

export const applyUrlState = (search: string): void => {
  const layers = parseLayersParam(
    new URLSearchParams(search).get(LAYERS_PARAM),
    getActiveRegistry(),
  )
  for (const { id, opacity } of layers) {
    if (opacity !== null) layerCommands.setOpacity(id, opacity)
  }
  for (const { id } of layers) layerCommands.enable(id)
}

type UrlSyncOptions = {
  readonly shouldWrite: () => boolean
  readonly getSearch: () => string
  readonly replaceSearch: (search: string) => void
}

export const startUrlSync = ({
  shouldWrite,
  getSearch,
  replaceSearch,
}: UrlSyncOptions): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: Parameters<typeof serializeLayers>[1] = {}

  const write = () => {
    timer = null
    if (!shouldWrite()) return
    const next = withLayersParam(getSearch(), serializeLayers(getActiveRegistry().ids, latest))
    if (next !== getSearch()) replaceSearch(next)
  }

  const unsubscribe = subscribeToLayers((byId, prev) => {
    latest = byId
    if (prev === undefined) return
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(write, URL_WRITE_DELAY_MS)
  })

  return () => {
    unsubscribe()
    if (timer !== null) clearTimeout(timer)
  }
}
