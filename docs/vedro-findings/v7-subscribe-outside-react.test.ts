import Vedro from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V7: подписка на ключ вне React', () => {
  it('вызывает колбэк сразу с текущим значением и затем на каждое изменение ключа', () => {
    const store = new Vedro({ byId: { a: 1 }, other: 0 })
    const calls: [unknown, unknown, string][] = []

    store.on('byId', (value, prevValue, eventType) => {
      calls.push([value, prevValue, eventType])
    })
    store.dispatch({ byId: { a: 2 } })
    store.dispatch({ other: 1 })

    expect(calls).toEqual([
      [{ a: 1 }, { a: 1 }, '@init'],
      [{ a: 2 }, { a: 1 }, '@update'],
    ])
  })

  it('уточнение: уведомляет по ключу, даже если значение не изменилось', () => {
    const store = new Vedro({ byId: { a: 1 }, other: 0 })
    let updates = 0
    store.on('byId', () => {
      updates += 1
    })
    updates = 0

    store.dispatch((state) => ({ byId: state.byId }))

    expect(updates).toBe(1)
  })
})
