import { useLayoutEffect } from 'react'

import { act, render, screen } from '@testing-library/react'
import { createVedro } from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V4: подписка штатного useSelector', () => {
  it('селектор «замерзает» на пропсах первого рендера', () => {
    const { Provider, useSelector, useStore } = createVedro({
      byId: { a: 'A1', b: 'B1' },
    })
    let setB = (_value: string): void => undefined

    function Value({ id }: { id: 'a' | 'b' }) {
      const store = useStore()
      setB = (value) => {
        store.dispatch((state) => ({ byId: { ...state.byId, b: value } }))
      }
      const value = useSelector((state) => state.byId[id])

      return <output>{value}</output>
    }

    const { rerender } = render(
      <Provider>
        <Value id="a" />
      </Provider>,
    )
    rerender(
      <Provider>
        <Value id="b" />
      </Provider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('A1')

    act(() => {
      setB('B2')
    })
    expect(screen.getByRole('status')).toHaveTextContent('A1')
  })

  it('обновление между рендером и подпиской теряется', () => {
    const { Provider, useSelector, useStore } = createVedro({ count: 0 })

    function Reader() {
      const count = useSelector((state) => state.count)

      return <output>{count}</output>
    }

    function Writer() {
      const store = useStore()
      useLayoutEffect(() => {
        store.dispatch({ count: 1 })
      }, [store])

      return null
    }

    const probe: { readCount?: () => number } = {}
    function Probe() {
      const store = useStore()
      probe.readCount = () => store.get('count')

      return null
    }

    render(
      <Provider>
        <Reader />
        <Writer />
        <Probe />
      </Provider>,
    )

    expect(probe.readCount?.()).toBe(1)
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })
})
