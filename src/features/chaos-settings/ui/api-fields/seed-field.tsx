import type { FocusEvent, KeyboardEvent } from 'react'
import styled from 'styled-components'

import { Button, Field, FieldLabel, FieldRow } from '@/shared/ui'

import { randomizeSeed, setSeed, useChaosSetting } from '../../model/chaos-settings'

const SEED_INPUT_ID = 'chaos-seed'
const SEED_INPUT_WIDTH = '120px'

const handleSeedCommit = (
  event: FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>,
) => {
  if ('key' in event && event.key !== 'Enter') return
  const seed = Number.parseInt(event.currentTarget.value, 10)
  if (Number.isFinite(seed)) setSeed(seed)
}

export function SeedField() {
  const seed = useChaosSetting('seed')

  return (
    <Field>
      <FieldLabel as="label" htmlFor={SEED_INPUT_ID}>
        Seed
      </FieldLabel>
      <FieldRow>
        <SeedInput
          key={seed}
          id={SEED_INPUT_ID}
          type="number"
          defaultValue={seed}
          onBlur={handleSeedCommit}
          onKeyDown={handleSeedCommit}
        />
        <SeedButton onClick={randomizeSeed}>Случайный</SeedButton>
      </FieldRow>
    </Field>
  )
}

const SeedButton = styled(Button)`
  min-height: ${({ theme }) => theme.sizes.touchTarget};
`

const SeedInput = styled.input`
  width: ${SEED_INPUT_WIDTH};
  min-height: ${({ theme }) => theme.sizes.touchTarget};
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font: inherit;
`
