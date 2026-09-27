import { useEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import { RenderCount } from '@/shared/lib/dev'

import { loadMap } from '../model/load-map'

import { MapOverlay } from './map-overlay'

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return undefined
    const controller = new AbortController()
    let destroy = () => undefined

    loadMap(container, controller.signal).then(
      (loaded) => {
        if (controller.signal.aborted) {
          loaded.destroy()

          return
        }
        destroy = () => {
          loaded.destroy()
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.error('Карта не создана', error)
        setFailed(true)
      },
    )

    return () => {
      controller.abort()
      destroy()
    }
  }, [])

  return (
    <Wrapper>
      <RenderCount name="map" />
      <MapContainer ref={containerRef} />
      {failed ? (
        <Fallback role="status">Карта недоступна: браузер не поддерживает WebGL</Fallback>
      ) : null}
      <MapOverlay />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  position: absolute;
  inset: 0;
`

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
`

const Fallback = styled.p`
  position: absolute;
  inset: auto 0 0;
  margin: 0;
  padding: ${({ theme }) => theme.space.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`
