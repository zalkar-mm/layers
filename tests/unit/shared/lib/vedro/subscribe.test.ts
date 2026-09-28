import { describe, expect, it, vi } from 'vitest'

import { createVedroStore } from '@/shared/lib/vedro/create-store'
import { once, subscribeToKey } from '@/shared/lib/vedro/subscribe'

describe('once', () => {
  it('V6: повторный вызов не выполняет функцию второй раз', () => {
    const fn = vi.fn()
    const guarded = once(fn)

    guarded()
    guarded()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('V6: повторная отписка @state через once не удаляет чужого подписчика', () => {
    const store = createVedroStore('test', { count: 0 })
    const unsubscribe = once(store.on('@state', () => undefined))
    const other = vi.fn()
    store.on('@state', other)
    other.mockClear()

    unsubscribe()
    unsubscribe()
    store.dispatch({ count: 1 })

    expect(other).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeToKey', () => {
  it('сообщает начальное значение и только изменения по ссылке', () => {
    const initial = { a: 1 }
    const store = createVedroStore('test', { byId: initial, other: 0 })
    const listener = vi.fn()

    subscribeToKey(store, 'byId', listener)
    store.dispatch((state) => ({ byId: state.byId }))
    store.dispatch({ other: 1 })
    const next = { a: 2 }
    store.dispatch({ byId: next })

    expect(listener.mock.calls).toEqual([
      [initial, undefined],
      [next, initial],
    ])
  })

  it('отписка идемпотентна', () => {
    const store = createVedroStore('test', { byId: { a: 1 } })
    const listener = vi.fn()
    const unsubscribe = subscribeToKey(store, 'byId', listener)

    unsubscribe()
    unsubscribe()
    store.dispatch({ byId: { a: 2 } })

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
