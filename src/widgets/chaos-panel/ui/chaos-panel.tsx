import styled from 'styled-components'

import { ChaosControls } from '@/features/chaos-settings'

import { EventLog } from './event-log'

export function ChaosPanel() {
  return (
    <Details open>
      <Summary>Chaos-панель</Summary>
      <Body>
        <ChaosControls />
        <LogTitle>Лог событий</LogTitle>
        <EventLog />
      </Body>
    </Details>
  )
}

const Details = styled.details`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

const Summary = styled.summary`
  padding: ${({ theme }) => theme.space.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
`

const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
  padding: 0 ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md};
`

const LogTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
`
