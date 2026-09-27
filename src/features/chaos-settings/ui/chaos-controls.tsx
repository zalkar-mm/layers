import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from 'react'

import styled from 'styled-components'

import { layerCommands, useCacheStats } from '@/entities/layer'

import { formatDuration } from '@/shared/lib/time'
import { Button, Slider, Switch } from '@/shared/ui'

import {
  DELAY_LIMIT_MS,
  randomizeSeed,
  spamClick,
  TTL_MAX_MS,
  TTL_MIN_MS,
  updateChaosSettings,
  useChaosSettings,
  useSpamming,
} from '../model/chaos-settings'

const handleClearCache = () => {
  layerCommands.clearCache()
}

export function ChaosControls() {
  const settings = useChaosSettings()
  const cacheStats = useCacheStats()
  const spamming = useSpamming()
  const stopSpamRef = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      stopSpamRef.current?.()
    },
    [],
  )

  const handleSpam = () => {
    stopSpamRef.current?.()
    stopSpamRef.current = spamClick()
  }
  const applySeed = (event: FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>) => {
    if ('key' in event && event.key !== 'Enter') return
    const seed = Number.parseInt(event.currentTarget.value, 10)
    if (Number.isFinite(seed)) updateChaosSettings({ seed })
  }
  const errorPercent = Math.round(settings.errorRate * 100)

  return (
    <Controls>
      <Field>
        <FieldLabel>
          Задержка, мс: {settings.minDelayMs}–{settings.maxDelayMs}
        </FieldLabel>
        <Slider
          value={settings.minDelayMs}
          min={0}
          max={DELAY_LIMIT_MS}
          step={50}
          label="Минимальная задержка"
          valueText={`${String(settings.minDelayMs)} миллисекунд`}
          onChange={(minDelayMs) => {
            updateChaosSettings({ minDelayMs })
          }}
        />
        <Slider
          value={settings.maxDelayMs}
          min={0}
          max={DELAY_LIMIT_MS}
          step={50}
          label="Максимальная задержка"
          valueText={`${String(settings.maxDelayMs)} миллисекунд`}
          onChange={(maxDelayMs) => {
            updateChaosSettings({ maxDelayMs })
          }}
        />
      </Field>

      <Field>
        <FieldLabel>Доля ошибок: {errorPercent} %</FieldLabel>
        <Slider
          value={errorPercent}
          min={0}
          max={100}
          label="Доля ошибок"
          valueText={`${String(errorPercent)} процентов`}
          onChange={(percent) => {
            updateChaosSettings({ errorRate: percent / 100 })
          }}
        />
      </Field>

      <Field>
        <FieldLabel as="label" htmlFor="chaos-seed">
          Seed
        </FieldLabel>
        <Inline>
          <SeedInput
            key={settings.seed}
            id="chaos-seed"
            type="number"
            defaultValue={settings.seed}
            onBlur={applySeed}
            onKeyDown={applySeed}
          />
          <Button onClick={randomizeSeed}>Случайный</Button>
        </Inline>
      </Field>

      <Field>
        <Button onClick={handleSpam} disabled={spamming}>
          {spamming ? 'Спам-клик…' : 'Спам-клик'}
        </Button>
        <Inline>
          <Switch
            checked={settings.ignoreAbort}
            label="Сервер отвечает, несмотря на отмену"
            onToggle={() => {
              updateChaosSettings({ ignoreAbort: !settings.ignoreAbort })
            }}
          />
          <span>Сервер отвечает, несмотря на отмену</span>
        </Inline>
        <FieldLabel>
          Отменённый запрос всё равно приходит. Ответ отбрасывается по номеру запроса — в логе
          «отброшен (устаревший)».
        </FieldLabel>
      </Field>

      <Field>
        <Inline>
          <Switch
            checked={settings.cacheEnabled}
            label="Кэш"
            onToggle={() => {
              updateChaosSettings({ cacheEnabled: !settings.cacheEnabled })
            }}
          />
          <span>
            Кэш {settings.cacheEnabled ? 'вкл' : 'выкл'} · в кэше: {cacheStats.size} из{' '}
            {cacheStats.limit}
          </span>
        </Inline>
        <FieldLabel>TTL: {formatDuration(settings.cacheTtlMs)}</FieldLabel>
        <Slider
          value={settings.cacheTtlMs / 1000}
          min={TTL_MIN_MS / 1000}
          max={TTL_MAX_MS / 1000}
          step={10}
          disabled={!settings.cacheEnabled}
          label="Время жизни кэша"
          valueText={formatDuration(settings.cacheTtlMs)}
          onChange={(seconds) => {
            updateChaosSettings({ cacheTtlMs: seconds * 1000 })
          }}
        />
        <Button onClick={handleClearCache}>Очистить кэш</Button>
      </Field>
    </Controls>
  )
}

const Controls = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
`

const Field = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.xs};
`

const FieldLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Inline = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`

const SeedInput = styled.input`
  width: 120px;
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font: inherit;
`
