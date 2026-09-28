import type Vedro from 'vedro'

export type Unsubscribe = () => void

export const once = (fn: () => void): (() => void) => {
  let called = false

  return () => {
    if (called) return
    called = true
    fn()
  }
}

export const subscribeToKey = <S extends object, K extends keyof S>(
  store: Vedro<S>,
  key: K,
  listener: (value: S[K], prev: S[K] | undefined) => void,
): Unsubscribe => {
  let last: { value: S[K] } | null = null
  const unsubscribe = store.on(key, (value) => {
    if (last !== null && Object.is(last.value, value)) return
    const prev = last?.value
    last = { value }
    listener(value, prev)
  })

  return once(unsubscribe)
}
