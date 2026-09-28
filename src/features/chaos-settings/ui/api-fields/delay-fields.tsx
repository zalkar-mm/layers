import { Field, FieldLabel, Slider } from '@/shared/ui'

import {
  DELAY_LIMIT_MS,
  setMaxDelayMs,
  setMinDelayMs,
  useChaosSetting,
} from '../../model/chaos-settings'

const DELAY_STEP_MS = 50

const delayValueText = (ms: number): string => `${String(ms)} миллисекунд`

export function DelayFields() {
  const minDelayMs = useChaosSetting('minDelayMs')
  const maxDelayMs = useChaosSetting('maxDelayMs')
  const minDelayText = delayValueText(minDelayMs)
  const maxDelayText = delayValueText(maxDelayMs)

  return (
    <Field>
      <FieldLabel>
        Задержка, мс: {minDelayMs}–{maxDelayMs}
      </FieldLabel>
      <Slider
        value={minDelayMs}
        min={0}
        max={DELAY_LIMIT_MS}
        step={DELAY_STEP_MS}
        label="Минимальная задержка"
        valueText={minDelayText}
        onChange={setMinDelayMs}
      />
      <Slider
        value={maxDelayMs}
        min={0}
        max={DELAY_LIMIT_MS}
        step={DELAY_STEP_MS}
        label="Максимальная задержка"
        valueText={maxDelayText}
        onChange={setMaxDelayMs}
      />
    </Field>
  )
}
