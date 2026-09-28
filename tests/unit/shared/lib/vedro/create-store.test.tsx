import { useLayoutEffect } from 'react'

import { act, render, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { bindVedroStore, createVedroStore } from '@/shared/lib/vedro/create-store'

describe('bindVedroStore', () => {
  it('Provider работает с тем же экземпляром стора: dispatch в исходный стор виден хуку', () => {
    const store = createVedroStore('test', { count: 0, other: 0 })
    const { Provider, useSelector } = bindVedroStore(store)
    const { result } = renderHook(() => useSelector((state) => state.count), {
      wrapper: Provider,
      reactStrictMode: true,
    })

    act(() => {
      store.dispatch({ count: 2 })
    })

    expect(result.current).toBe(2)
  })

  it('без изменения выбранного значения отдаёт ту же ссылку', () => {
    const store = createVedroStore('test', { pair: { a: 1 }, other: 0 })
    const { Provider, useSelector } = bindVedroStore(store)
    const { result } = renderHook(() => useSelector((state) => ({ a: state.pair.a })), {
      wrapper: Provider,
    })
    const first = result.current

    act(() => {
      store.dispatch({ other: 1 })
    })

    expect(result.current).toBe(first)
  })

  it('V4: после догоняющего рендера возврат к прежнему значению тоже доходит до компонента', () => {
    const store = createVedroStore('test', { count: 0 })
    const { Provider, useSelector } = bindVedroStore(store)
    function Writer() {
      useLayoutEffect(() => {
        store.dispatch({ count: 1 })
      }, [])

      return null
    }
    const seen: number[] = []
    function Reader() {
      seen.push(useSelector((state) => state.count))

      return null
    }
    render(
      <Provider>
        <Reader />
        <Writer />
      </Provider>,
    )
    expect(seen.at(-1)).toBe(1)

    act(() => {
      store.dispatch({ count: 0 })
    })

    expect(seen.at(-1)).toBe(0)
  })
})
