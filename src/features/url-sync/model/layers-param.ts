import type { LayerId, LayerRegistry, LayersById } from '@/entities/layer'

export const LAYERS_PARAM = 'l'

export type UrlLayer = {
  readonly id: LayerId
  readonly opacity: number | null
}

const parseOpacity = (raw: string | undefined): number | null => {
  if (raw === undefined || !/^\d{1,3}$/.test(raw)) return null
  const percent = Number(raw)

  return percent <= 100 ? percent / 100 : null
}

export const parseLayersParam = (value: string | null, registry: LayerRegistry): UrlLayer[] => {
  if (value === null || value === '') return []
  const seen = new Set<LayerId>()
  const result: UrlLayer[] = []
  for (const part of value.split(',')) {
    const [rawId, rawOpacity, ...rest] = part.split(':')
    const config = rawId === undefined ? undefined : registry.find(rawId)
    if (config === undefined || seen.has(config.id)) continue
    seen.add(config.id)
    result.push({ id: config.id, opacity: rest.length === 0 ? parseOpacity(rawOpacity) : null })
  }

  return result
}

export const serializeLayers = (ids: readonly LayerId[], byId: LayersById): string =>
  ids
    .flatMap((id) => {
      const layer = byId[id]

      return layer?.enabled === true ? [`${id}:${String(Math.round(layer.opacity * 100))}`] : []
    })
    .join(',')

export const withLayersParam = (search: string, value: string): string => {
  const params = new URLSearchParams(search)
  if (value === '') params.delete(LAYERS_PARAM)
  else params.set(LAYERS_PARAM, value)
  const query = params.toString().replaceAll('%2C', ',').replaceAll('%3A', ':')

  return query === '' ? '' : `?${query}`
}
