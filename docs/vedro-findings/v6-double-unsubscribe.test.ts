import Vedro from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V6: повторный unsubscribe у @state', () => {
  it('удаляет чужого подписчика', () => {
    const store = new Vedro({ count: 0 })
    const received: number[] = []

    const unsubscribeA = store.on('@state', () => undefined)
    store.on('@state', (state) => {
      received.push(state.count)
    })
    received.length = 0

    unsubscribeA()
    unsubscribeA()
    store.dispatch({ count: 1 })

    expect(received).toEqual([])
  })

  it('для подписки на ключ повторный вызов безопасен: там индекс проверяется', () => {
    const store = new Vedro({ count: 0 })
    const received: number[] = []

    const unsubscribeA = store.on('count', () => undefined)
    store.on('count', (value) => {
      received.push(value)
    })
    received.length = 0

    unsubscribeA()
    unsubscribeA()
    store.dispatch({ count: 1 })

    expect(received).toEqual([1])
  })
})
