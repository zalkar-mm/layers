import Vedro from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V1: dispatch с async-колбэком', () => {
  it('значение, которое вернул async-колбэк, в стор не попадает', async () => {
    const store = new Vedro({ count: 0 })

    store.dispatch(async (state) => {
      await Promise.resolve()

      return { count: state.count + 1 }
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(store.get('count')).toBe(0)
  })

  it('подписчики @state всё равно получают уведомление, хотя состояние не изменилось', () => {
    const store = new Vedro({ count: 0 })
    const notifications: number[] = []
    store.on('@state', (state) => {
      notifications.push(state.count)
    })
    notifications.length = 0

    store.dispatch(async () => {
      await Promise.resolve()

      return { count: 1 }
    })

    expect(notifications).toEqual([0])
  })
})
