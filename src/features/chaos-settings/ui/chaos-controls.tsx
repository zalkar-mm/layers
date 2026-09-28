import styled from 'styled-components'

import { DelayFields } from './api-fields/delay-fields'
import { ErrorRateField, IgnoreAbortField } from './api-fields/response-fields'
import { SeedField } from './api-fields/seed-field'
import { CacheFields } from './client-fields/cache-fields'
import { SpamField } from './client-fields/spam-field'

export function ChaosControls() {
  return (
    <Controls>
      <DelayFields />
      <ErrorRateField />
      <SeedField />
      <SpamField />
      <IgnoreAbortField />
      <CacheFields />
    </Controls>
  )
}

const Controls = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
`
