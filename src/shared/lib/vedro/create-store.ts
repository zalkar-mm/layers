import Vedro from 'vedro'

type VedroConstructor = typeof Vedro

const isConstructor = (value: unknown): value is VedroConstructor => typeof value === 'function'

const resolveVedro = (): VedroConstructor => {
  const imported: unknown = Vedro
  if (isConstructor(imported)) return imported
  if (
    typeof imported === 'object' &&
    imported !== null &&
    'default' in imported &&
    isConstructor(imported.default)
  ) {
    return imported.default
  }
  throw new Error('Не удалось загрузить vedro: неожиданная форма модуля')
}

const VedroStore = resolveVedro()

export const createVedroStore = <S extends object>(name: string, state: S): Vedro<S> =>
  new VedroStore(name, state)

export type { Vedro }
