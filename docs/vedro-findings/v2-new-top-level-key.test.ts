import Vedro from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V2: новый ключ верхнего уровня', () => {
  it('dispatch с колбэком, вернувшим новый ключ, бросает ошибку', () => {
    const store = new Vedro({ count: 0 })
    const withExtraKey = { count: 1, extra: true }

    expect(() => {
      store.dispatch(() => withExtraKey)
    }).toThrow('Dispatch callback have returned wrong object')
  })

  it('dispatch объектом с новым ключом бросает ту же ошибку', () => {
    const store = new Vedro({ count: 0 })
    const withExtraKey = { count: 1, extra: true }

    expect(() => {
      store.dispatch(withExtraKey)
    }).toThrow('Dispatch callback have returned wrong object')
  })

  it('уточнение: dispatch(key, value) ключи не проверяет и добавляет новый ключ', () => {
    const store = new Vedro<Record<string, number>>({ count: 0 })

    store.dispatch('extra', 1)

    expect(store.get()).toEqual({ count: 0, extra: 1 })
  })
})
