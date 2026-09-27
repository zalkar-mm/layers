import { act, render } from '@testing-library/react'
import { createVedro } from 'vedro'
import { describe, expect, it, vi } from 'vitest'

describe('V3: стоимость штатного useSelector', () => {
  it('dispatch чужого ключа вызывает все селекторы и JSON.stringify: 2 × N', () => {
    const N = 50
    const ids = Array.from({ length: N }, (_, index) => String(index))
    const byId = Object.fromEntries(ids.map((id) => [id, { value: 0 }]))
    const { Provider, useSelector, useStore } = createVedro({ byId, unrelated: 0 })

    const selectorCalls = { count: 0 }
    let dispatchUnrelated = (): void => undefined

    function Row({ id }: { id: string }) {
      const value = useSelector((state) => {
        selectorCalls.count += 1

        return state.byId[id]?.value
      })

      return <span>{value}</span>
    }

    function Controls() {
      const store = useStore()
      dispatchUnrelated = () => {
        store.dispatch({ unrelated: 1 })
      }

      return null
    }

    render(
      <Provider>
        <Controls />
        {ids.map((id) => (
          <Row key={id} id={id} />
        ))}
      </Provider>,
    )

    selectorCalls.count = 0
    const stringify = vi.spyOn(JSON, 'stringify')

    act(() => {
      dispatchUnrelated()
    })

    expect(selectorCalls.count).toBe(2 * N)
    expect(stringify).toHaveBeenCalledTimes(2 * N + 2)
  })
})
