import type { LayerData, LayerId } from '../../state/types'

export type LayerResponse = {
  readonly id: LayerId
  readonly requestId: number
  readonly outcome:
    | { readonly ok: true; readonly data: LayerData }
    | { readonly ok: false; readonly error: unknown }
}

type ResponseBatchOptions = {
  readonly apply: (responses: readonly LayerResponse[]) => void
  readonly isBulkLoad: () => boolean
  readonly scheduleFlush: ((flush: () => void) => void) | undefined
}

export const createResponseBatch = ({ apply, isBulkLoad, scheduleFlush }: ResponseBatchOptions) => {
  let pending: LayerResponse[] = []

  const flush = () => {
    const responses = pending
    pending = []
    apply(responses)
  }

  return (response: LayerResponse): void => {
    const collecting = pending.length > 0
    if (scheduleFlush === undefined || (!collecting && !isBulkLoad())) {
      apply([response])

      return
    }
    pending.push(response)
    if (!collecting) scheduleFlush(flush)
  }
}
