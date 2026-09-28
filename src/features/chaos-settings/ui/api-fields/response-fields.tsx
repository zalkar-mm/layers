import { formatPercentValueText, fromPercent, PERCENT_MAX, toPercent } from '@/shared/lib/format'
import { Field, FieldLabel, FieldRow, Slider, Switch } from '@/shared/ui'

import { setErrorRate, toggleIgnoreAbort, useChaosSetting } from '../../model/chaos-settings'

const IGNORE_ABORT_LABEL = 'Сервер отвечает, несмотря на отмену'

const handleErrorPercentChange = (percent: number) => {
  setErrorRate(fromPercent(percent))
}

export function ErrorRateField() {
  const errorPercent = toPercent(useChaosSetting('errorRate'))
  const valueText = formatPercentValueText(errorPercent)

  return (
    <Field>
      <FieldLabel>Доля ошибок: {errorPercent} %</FieldLabel>
      <Slider
        value={errorPercent}
        min={0}
        max={PERCENT_MAX}
        label="Доля ошибок"
        valueText={valueText}
        onChange={handleErrorPercentChange}
      />
    </Field>
  )
}

export function IgnoreAbortField() {
  const ignoreAbort = useChaosSetting('ignoreAbort')

  return (
    <Field>
      <FieldRow>
        <Switch checked={ignoreAbort} label={IGNORE_ABORT_LABEL} onToggle={toggleIgnoreAbort} />
        <span>{IGNORE_ABORT_LABEL}</span>
      </FieldRow>
      <FieldLabel>
        Отменённый запрос всё равно приходит. Ответ отбрасывается по номеру запроса — в логе
        «отброшен (устаревший)».
      </FieldLabel>
    </Field>
  )
}
