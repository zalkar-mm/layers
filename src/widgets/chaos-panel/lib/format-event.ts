import type { LayerEvent, LayerEventKind } from '@/entities/layer'

import { formatDuration } from '@/shared/lib/time'

const OUTCOME: Readonly<Record<LayerEventKind, (event: LayerEvent) => string>> = {
  request: () => 'запрос',
  error: () => 'ошибка',
  abort: () => 'abort',
  'stale-dropped': () => 'отброшен (устаревший)',
  'cache-hit': (event) => `из кэша (${formatDuration(event.ageMs ?? 0)})`,
  'cache-expired': () => 'кэш просрочен',
  'cache-updated': () => 'кэш обновлён',
}

export const formatEvent = (event: LayerEvent): string => {
  const request = event.requestId === null ? '' : `r${String(event.requestId)} `

  return `${request}${event.layerId} → ${OUTCOME[event.kind](event)}`
}
