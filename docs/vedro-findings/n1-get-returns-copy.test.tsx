import { useSyncExternalStore } from 'react'

import { renderHook } from '@testing-library/react'
import Vedro from 'vedro'
import { describe, expect, it, vi } from 'vitest'

describe('N1: get() возвращает копию', () => {
  it('get() — новая ссылка на каждый вызов, get(key) — стабильная', () => {
    const store = new Vedro({ byId: { a: 1 } })

    expect(store.get()).not.toBe(store.get())
    expect(store.get('byId')).toBe(store.get('byId'))
  })

  it('get() нельзя использовать как getSnapshot в useSyncExternalStore', () => {
    const store = new Vedro({ byId: { a: 1 } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const subscribe = (onChange: () => void) => store.on('@state', onChange)

    expect(() => renderHook(() => useSyncExternalStore(subscribe, () => store.get()))).toThrow(
      /Maximum update depth exceeded/,
    )
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('The result of getSnapshot should be cached'),
    )
  })
})
