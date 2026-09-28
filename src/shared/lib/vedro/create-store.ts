import { type FC, type ReactNode, useEffect, useReducer } from 'react'

import type Vedro from 'vedro'
import type { createVedro } from 'vedro'
import * as vedroModule from 'vedro'

type VedroConstructor = typeof Vedro

type CreateVedro = typeof createVedro

const isConstructor = (value: unknown): value is VedroConstructor => typeof value === 'function'

const isCreateVedro = (value: unknown): value is CreateVedro => typeof value === 'function'

const moduleLevels = (): readonly object[] => {
  const top: unknown = vedroModule
  if (typeof top !== 'object' || top === null) return []
  if (!('default' in top)) return [top]
  const nested: unknown = top.default

  return typeof nested === 'object' && nested !== null ? [top, nested] : [top]
}

const resolveExport = <T>(
  name: 'default' | 'createVedro',
  guard: (value: unknown) => value is T,
): T => {
  for (const level of moduleLevels()) {
    const value: unknown = name in level ? Reflect.get(level, name) : undefined
    if (guard(value)) return value
  }
  throw new Error(`Не удалось загрузить vedro: в модуле нет ${name}`)
}

const VedroStore = resolveExport('default', isConstructor)

const createVedroBinding = resolveExport('createVedro', isCreateVedro)

export const createVedroStore = <S extends object>(name: string, state: S): Vedro<S> =>
  new VedroStore(name, state)

type VedroBinding<S extends object> = {
  readonly Provider: FC<{ readonly children: ReactNode }>
  readonly useSelector: <T>(selector: (state: S) => T) => T
}

const isSameResult = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return Object.is(left, right)
  }
}

export const bindVedroStore = <S extends object>(store: Vedro<S>): VedroBinding<S> => {
  const standard = createVedroBinding(store)

  const useSelectorWithCatchUp = <T>(selector: (state: S) => T): T => {
    const subscribed = standard.useSelector((state) => ({ value: selector(state) }))
    const current = standard.useStore()
    const fresh = selector(current.get())
    const rendered = isSameResult(subscribed.value, fresh) ? subscribed.value : fresh
    const [, catchUp] = useReducer((tick: number) => tick + 1, 0)
    useEffect(() => {
      if (!isSameResult(selector(current.get()), rendered)) catchUp()
    })

    return rendered
  }

  return { Provider: standard.Provider, useSelector: useSelectorWithCatchUp }
}

export type { Vedro }
