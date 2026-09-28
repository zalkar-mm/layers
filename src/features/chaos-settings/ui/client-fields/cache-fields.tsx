import { layerCommands, useCacheStats } from '@/entities/layer'

import { formatDuration } from '@/shared/lib/format'
import { MS_PER_SECOND } from '@/shared/lib/time'
import { Button, Field, FieldLabel, FieldRow, Slider, Switch } from '@/shared/ui'

import {
  setCacheTtlMs,
  toggleCache,
  TTL_MAX_MS,
  TTL_MIN_MS,
  useChaosSetting,
} from '../../model/chaos-settings'

const TTL_STEP_S = 10
const TTL_MIN_S = TTL_MIN_MS / MS_PER_SECOND
const TTL_MAX_S = TTL_MAX_MS / MS_PER_SECOND

const handleTtlChange = (seconds: number) => {
  setCacheTtlMs(seconds * MS_PER_SECOND)
}

const handleClearCache = () => {
  layerCommands.clearCache()
}

export function CacheFields() {
  const cacheEnabled = useChaosSetting('cacheEnabled')
  const cacheTtlMs = useChaosSetting('cacheTtlMs')
  const cacheStats = useCacheStats()
  const cacheState = cacheEnabled ? 'вкл' : 'выкл'
  const ttlSeconds = cacheTtlMs / MS_PER_SECOND
  const ttlText = formatDuration(cacheTtlMs)
  const isTtlDisabled = !cacheEnabled

  return (
    <Field>
      <FieldRow>
        <Switch checked={cacheEnabled} label="Кэш" onToggle={toggleCache} />
        <span>
          Кэш {cacheState} · в кэше: {cacheStats.size} из {cacheStats.limit}
        </span>
      </FieldRow>
      <FieldLabel>TTL: {ttlText}</FieldLabel>
      <Slider
        value={ttlSeconds}
        min={TTL_MIN_S}
        max={TTL_MAX_S}
        step={TTL_STEP_S}
        disabled={isTtlDisabled}
        label="Время жизни кэша"
        valueText={ttlText}
        onChange={handleTtlChange}
      />
      <Button onClick={handleClearCache}>Очистить кэш</Button>
    </Field>
  )
}
