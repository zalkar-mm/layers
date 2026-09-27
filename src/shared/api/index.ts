export { type ApiErrorKind, createAbortError } from './mock-layer-api/errors'
export { GRID_BBOX, GRID_STEP } from './mock-layer-api/grid'
export {
  createMockLayerApi,
  createRandomSeed,
  DEFAULT_MOCK_API_SETTINGS,
  type FetchLayerData,
  isAbortError,
  LayerApiError,
  type MockApiSettings,
  type MockLayerApi,
} from './mock-layer-api/mock-layer-api'
export type {
  CellFeature,
  CellProperties,
  LayerData,
  LayerDataRequest,
  LinearRing,
} from './mock-layer-api/types'
