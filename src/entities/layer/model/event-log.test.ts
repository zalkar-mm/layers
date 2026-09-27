import { describe, expect, it } from 'vitest'

import { layerId } from '../config/base-layers'

import { createEventLog } from './event-log'

const event = (requestId: number) =>
  ({ kind: 'request', layerId: layerId('wind'), requestId, at: 0 }) as const

describe('лог событий (ТЗ §10.1)', () => {
  it('новые сверху, не больше лимита, пачка — один dispatch', () => {
    const log = createEventLog(3)
    let dispatches = 0
    log.store.on('@state', () => {
      dispatches += 1
    })
    dispatches = 0

    log.push([event(1), event(2)])
    log.push([event(3), event(4)])

    expect(dispatches).toBe(2)
    expect(log.store.get('events').map((entry) => entry.requestId)).toEqual([4, 3, 2])
  })
})
