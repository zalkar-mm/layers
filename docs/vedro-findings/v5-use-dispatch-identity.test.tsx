import { type ReactNode } from 'react'

import { renderHook } from '@testing-library/react'
import { createVedro } from 'vedro'
import { describe, expect, it } from 'vitest'

describe('V5: useDispatch', () => {
  it('возвращает новую функцию на каждый рендер', () => {
    const { Provider, useDispatch } = createVedro({ count: 0 })
    const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>

    const { result, rerender } = renderHook(() => useDispatch(), { wrapper })
    const first = result.current
    rerender()

    expect(result.current).not.toBe(first)
  })
})
