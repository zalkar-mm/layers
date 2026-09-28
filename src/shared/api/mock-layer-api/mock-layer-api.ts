import { generateGrid } from './generation/grid'
import { createRandom, hashString, UINT32_RANGE } from './generation/random'
import { API_ERROR_MESSAGES, type ApiErrorKind, createAbortError, LayerApiError } from './errors'
import type { LayerData, LayerDataRequest } from './types'

export { isAbortError, LayerApiError } from './errors'

export type MockApiSettings = {
  readonly minDelayMs: number
  readonly maxDelayMs: number
  readonly errorRate: number
  readonly seed: number
  readonly ignoreAbort: boolean
}

export type FetchLayerData = (id: string, options: { signal: AbortSignal }) => Promise<LayerData>

export type MockLayerApi = {
  readonly fetchLayerData: FetchLayerData
  readonly configure: (patch: Partial<MockApiSettings>) => void
  readonly getSettings: () => MockApiSettings
}

export const DEFAULT_MOCK_API_SETTINGS: Omit<MockApiSettings, 'seed'> = {
  minDelayMs: 300,
  maxDelayMs: 2000,
  errorRate: 0.2,
  ignoreAbort: false,
}

const ERROR_KINDS: readonly ApiErrorKind[] = ['network', 'server', 'timeout']

export const createRandomSeed = (): number => Math.floor(Math.random() * 1_000_000)

const abortReason = (signal: AbortSignal): Error =>
  signal.reason instanceof DOMException || signal.reason instanceof Error
    ? signal.reason
    : createAbortError()

type Options = {
  readonly describeLayer: (id: string) => LayerDataRequest
  readonly settings?: Partial<MockApiSettings>
}

export const createMockLayerApi = ({
  describeLayer,
  settings: initial = {},
}: Options): MockLayerApi => {
  let settings: MockApiSettings = {
    ...DEFAULT_MOCK_API_SETTINGS,
    seed: createRandomSeed(),
    ...initial,
  }
  let random = createRandom(settings.seed)

  const fetchLayerData: FetchLayerData = (id, { signal }) => {
    const request = describeLayer(id)
    const delayRoll = random()
    const errorRoll = random()
    const kindRoll = random()
    const dataSeed = Math.floor(random() * UINT32_RANGE)

    const { minDelayMs, maxDelayMs, errorRate, ignoreAbort } = settings
    if (signal.aborted && !ignoreAbort) return Promise.reject(abortReason(signal))

    const delay = Math.round(minDelayMs + delayRoll * Math.max(0, maxDelayMs - minDelayMs))

    return new Promise<LayerData>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer)
        reject(abortReason(signal))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        if (errorRoll < errorRate) {
          const kind = ERROR_KINDS[Math.floor(kindRoll * ERROR_KINDS.length)] ?? 'server'
          reject(new LayerApiError(kind, API_ERROR_MESSAGES[kind]))

          return
        }
        resolve(generateGrid(request, createRandom(dataSeed ^ hashString(id))))
      }, delay)
      if (!ignoreAbort) signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  return {
    fetchLayerData,
    configure: (patch) => {
      settings = { ...settings, ...patch }
      if (patch.seed !== undefined) random = createRandom(patch.seed)
    },
    getSettings: () => settings,
  }
}
