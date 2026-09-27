import { useState } from 'react'

import styled, { css } from 'styled-components'

import { ChaosPanel } from '@/widgets/chaos-panel'
import { LayerPanel } from '@/widgets/layer-panel'
import { MapView } from '@/widgets/map-view'

import { StressModeSwitch } from '@/features/stress-mode'

import { RenderCountsToggle } from '@/shared/lib/dev'

type SheetTab = 'layers' | 'chaos'

export function MapPage() {
  const [tab, setTab] = useState<SheetTab>('layers')

  return (
    <Layout>
      <TopBar>
        <Title>Управление GIS-слоями</Title>
      </TopBar>
      <MapArea aria-label="Карта">
        <MapView />
      </MapArea>
      <Sheet>
        <Tabs role="tablist" aria-label="Разделы панели">
          <Tab
            role="tab"
            id="sheet-tab-layers"
            aria-controls="sheet-panel-layers"
            aria-selected={tab === 'layers'}
            onClick={() => {
              setTab('layers')
            }}
          >
            Слои
          </Tab>
          <Tab
            role="tab"
            id="sheet-tab-chaos"
            aria-controls="sheet-panel-chaos"
            aria-selected={tab === 'chaos'}
            onClick={() => {
              setTab('chaos')
            }}
          >
            Chaos
          </Tab>
        </Tabs>
        <Section
          role="tabpanel"
          id="sheet-panel-layers"
          aria-labelledby="sheet-tab-layers"
          $hiddenOnMobile={tab !== 'layers'}
        >
          <LayerPanel
            headerExtra={
              <HeaderExtra>
                <StressModeSwitch />
                <RenderCountsToggle />
              </HeaderExtra>
            }
          />
        </Section>
        <Section
          role="tabpanel"
          id="sheet-panel-chaos"
          aria-labelledby="sheet-tab-chaos"
          $hiddenOnMobile={tab !== 'chaos'}
        >
          <ChaosPanel />
        </Section>
      </Sheet>
    </Layout>
  )
}

const desktop = (styles: ReturnType<typeof css>) => css`
  @media (min-width: ${({ theme }) => theme.breakpoints.desktop}) {
    ${styles}
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-rows: auto 55vh minmax(0, 1fr);
  grid-template-areas: 'top' 'map' 'sheet';
  height: 100%;

  ${desktop(css`
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: ${({ theme }) => theme.sizes.sidebar} minmax(0, 1fr);
    grid-template-areas: 'top top' 'sheet map';
  `)}
`

const TopBar = styled.header`
  grid-area: top;
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
`

const MapArea = styled.main`
  grid-area: map;
  position: relative;
  min-height: 0;
  background: ${({ theme }) => theme.colors.surfaceMuted};
`

const Sheet = styled.aside`
  grid-area: sheet;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  ${desktop(css`
    display: none;
  `)}
`

const Tab = styled.button.attrs({ type: 'button' })`
  flex: 1;
  min-height: ${({ theme }) => theme.sizes.touchTarget};
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font: inherit;
  cursor: pointer;

  &[aria-selected='true'] {
    border-bottom-color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: -2px;
  }
`

const Section = styled.div<{ $hiddenOnMobile: boolean }>`
  display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
  flex-direction: column;
  min-height: 0;

  ${desktop(css`
    display: flex;
  `)}
`

const HeaderExtra = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`
