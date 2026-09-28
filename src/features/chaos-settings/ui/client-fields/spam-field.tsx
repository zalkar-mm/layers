import { useEffect } from 'react'

import { Button, Field } from '@/shared/ui'

import { spamClick, stopSpam, useSpamming } from '../../model/chaos-settings'

export function SpamField() {
  const spamming = useSpamming()
  const spamText = spamming ? 'Спам-клик…' : 'Спам-клик'

  useEffect(() => stopSpam, [])

  return (
    <Field>
      <Button onClick={spamClick} disabled={spamming}>
        {spamText}
      </Button>
    </Field>
  )
}
