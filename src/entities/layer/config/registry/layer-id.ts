import type { LayerId } from '../../model/state/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const unsafeToLayerId = (value: string): LayerId => value as LayerId
