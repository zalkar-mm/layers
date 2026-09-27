export type ApiErrorKind = 'network' | 'server' | 'timeout'

export class LayerApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'LayerApiError'
    this.kind = kind
  }
}

export const API_ERROR_MESSAGES: Readonly<Record<ApiErrorKind, string>> = {
  network: 'Нет соединения с сервером',
  server: 'Сервер вернул ошибку',
  timeout: 'Сервер не ответил вовремя',
}

export const createAbortError = (): DOMException => new DOMException('Запрос отменён', 'AbortError')

export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
