import Vedro from 'vedro'
import { describe, expect, it, vi } from 'vitest'

import { createStoreSubscribe, subscribeToKey } from './subscribe'

describe('createStoreSubscribe', () => {
  it('не вызывает onChange в момент подписки, вызывает на каждый dispatch', () => {
    const store = new Vedro({ count: 0 })
    const onChange = vi.fn()

    createStoreSubscribe(store)(onChange)
    expect(onChange).not.toHaveBeenCalled()

    store.dispatch({ count: 1 })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('V6: повторная отписка не удаляет чужого подписчика', () => {
    const store = new Vedro({ count: 0 })
    const subscribe = createStoreSubscribe(store)
    const other = vi.fn()

    const unsubscribe = subscribe(() => undefined)
    subscribe(other)
    unsubscribe()
    unsubscribe()
    store.dispatch({ count: 1 })

    expect(other).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeToKey', () => {
  it('сообщает начальное значение и только изменения по ссылке', () => {
    const initial = { a: 1 }
    const store = new Vedro({ byId: initial, other: 0 })
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
    const store = new Vedro({ byId: { a: 1 } })
    const listener = vi.fn()
    const unsubscribe = subscribeToKey(store, 'byId', listener)

    unsubscribe()
    unsubscribe()
    store.dispatch({ byId: { a: 2 } })

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
