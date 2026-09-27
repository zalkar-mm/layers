import { describe, expect, it } from 'vitest'

import { type FetchLayerData, LayerApiError, type LayerData } from '@/shared/api'

import { createLayerRegistry } from '../config/layer-registry'
import { createSyntheticLayerConfigs } from '../config/synthetic-layers'

import { createLayerCache, type LayerCache } from './cache'
import type { LayerEventInput } from './event-log'
import { createLayerService } from './layer-service'
import { createLayerStore, type LayersById } from './store'
import type { LayerId, LayerState } from './types'

// Инварианты гонок (ТЗ §5.1, §5.2, §5.3, §4.2). Случайные последовательности команд и ответов
// на 1–5 слоях, после каждого шага проверяются I1–I7. Генератор свой, seed фиксированный:
// fast-check не подключён без согласования (docs/rules/workflow.md §6). Падение печатает seed и шаги.

const SEQUENCES = 500
const MAX_STEPS = 40
const BASE_SEED = 20_260_926
const TTL_MS = 1_000

/** mulberry32 — детерминированный генератор, как в mock API. */
const createRandom = (seed: number) => {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Random = ReturnType<typeof createRandom>

const pick = <T>(random: Random, items: readonly T[]): T => {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) throw new Error('Пустой список для выбора')

  return item
}

type Call = {
  readonly index: number
  readonly id: LayerId
  readonly signal: AbortSignal
  /** false — эмуляция fetch, который ответил несмотря на abort (R8). */
  readonly honorAbort: boolean
  readonly data: LayerData
  readonly resolve: (data: LayerData) => void
  readonly reject: (error: unknown) => void
  settled: boolean
}

const dataOf = (label: number): LayerData => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: label,
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { value: label, direction: null },
    },
  ],
})

const abortError = () => new DOMException('Запрос отменён', 'AbortError')

const flush = async () => {
  for (let index = 0; index < 5; index += 1) await Promise.resolve()
}

const shallowSameLoad = (a: LayerState['load'], b: LayerState['load']): boolean => {
  if (a === b) return true
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  return (
    keysA.length === keysB.length &&
    keysA.every((key) => Object.is(Reflect.get(a, key), Reflect.get(b, key)))
  )
}

const createWorld = (random: Random, layerCount: number) => {
  const registry = createLayerRegistry(createSyntheticLayerConfigs(layerCount))
  const store = createLayerStore(registry)
  let clock = 1_000_000
  const now = () => clock
  const baseCache = createLayerCache({ now, settings: { ttlMs: TTL_MS } })
  const cacheWrites: { id: LayerId; data: LayerData }[] = []
  const cache: LayerCache = {
    ...baseCache,
    set: (id, data, loadedAt) => {
      cacheWrites.push({ id, data })

      return baseCache.set(id, data, loadedAt)
    },
  }
  const calls: Call[] = []
  const requestIds: number[] = []
  const lastIssued = new Map<LayerId, number>()
  let label = 0

  const fetchLayerData: FetchLayerData = (rawId, { signal }) =>
    new Promise<LayerData>((resolve, reject) => {
      const id = registry.find(rawId)?.id
      if (id === undefined) throw new Error(`Неизвестный слой ${rawId}`)
      label += 1
      const call: Call = {
        index: calls.length,
        id,
        signal,
        honorAbort: random() < 0.7,
        data: dataOf(label),
        resolve,
        reject,
        settled: false,
      }
      calls.push(call)
      if (call.honorAbort) {
        signal.addEventListener('abort', () => {
          call.settled = true
          reject(abortError())
        })
      }
    })

  const onEvents = (events: readonly LayerEventInput[]) => {
    for (const event of events) {
      if (event.kind !== 'request' || event.requestId === undefined || event.requestId === null) {
        continue
      }
      requestIds.push(event.requestId)
      lastIssued.set(event.layerId, event.requestId)
    }
  }

  const service = createLayerService({ store, fetchLayerData, cache, now, onEvents })

  // I6 проверяется на каждом dispatch, а не только после шага.
  const violations: string[] = []
  let previous: LayersById = store.get('byId')
  const ids = store.get('ids')
  store.on('byId', (byId) => {
    if (store.get('ids') !== ids) violations.push('I6: изменилась ссылка ids')
    for (const id of ids) {
      const before = previous[id]
      const after = byId[id]
      if (before === undefined || after === undefined || before === after) continue
      if (
        before.enabled === after.enabled &&
        before.opacity === after.opacity &&
        shallowSameLoad(before.load, after.load)
      ) {
        violations.push(`I6: новый объект слоя ${id} без изменений`)
      }
    }
    previous = byId
  })

  return {
    registry,
    store,
    service,
    cache: baseCache,
    calls,
    requestIds,
    lastIssued,
    cacheWrites,
    violations,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

type World = ReturnType<typeof createWorld>

const layerOf = (world: World, id: LayerId): LayerState => {
  const layer = world.store.get('byId')[id]
  if (layer === undefined) throw new Error(`Нет слоя ${id}`)

  return layer
}

const requestIdOf = (world: World, call: Call): number => {
  const requestId = world.requestIds[call.index]
  if (requestId === undefined) throw new Error(`Нет requestId у запроса №${String(call.index)}`)

  return requestId
}

const isPending = (call: Call) => !call.settled
const isLive = (call: Call) => !call.settled && !call.signal.aborted

/** Проверки I1–I5 и модель «включён ли слой» после шага. */
const checkInvariants = (world: World, expectedEnabled: ReadonlyMap<LayerId, boolean>) => {
  const problems = [...world.violations]
  world.violations.length = 0

  for (const id of world.registry.ids) {
    const layer = layerOf(world, id)
    // I1: выключенный слой всегда idle.
    if (!layer.enabled && layer.load.kind !== 'idle')
      problems.push(`I1: ${id} выключен, но ${layer.load.kind}`)
    // I2: в полёте не больше одного живого запроса на слой.
    const live = world.calls.filter((call) => call.id === id && isLive(call)).length
    if (live > 1) problems.push(`I2: ${id} — живых запросов ${String(live)}`)
    // I3: loading ждёт последний выданный запрос.
    if (layer.load.kind === 'loading' && layer.load.requestId !== world.lastIssued.get(id)) {
      problems.push(
        `I3: ${id} ждёт r${String(layer.load.requestId)}, последний — r${String(world.lastIssued.get(id))}`,
      )
    }
    // Модель R5: флаг включения соответствует последней команде.
    if (layer.enabled !== expectedEnabled.get(id))
      problems.push(`R5: ${id} enabled=${String(layer.enabled)}`)
    // Живой запрос есть ⇔ слой в loading.
    if (live === 1 && layer.load.kind !== 'loading')
      problems.push(`I2: ${id} — живой запрос у слоя в ${layer.load.kind}`)
  }

  return problems
}

type Step =
  | { readonly kind: 'enable' | 'disable' | 'toggle' | 'retry' | 'refresh'; readonly id: LayerId }
  | { readonly kind: 'setOpacity'; readonly id: LayerId; readonly value: number }
  | { readonly kind: 'enableAll' | 'disableAll' | 'retryFailed' | 'clearCache' }
  | { readonly kind: 'enableLayers'; readonly ids: readonly LayerId[] }
  | { readonly kind: 'advance'; readonly ms: number }
  | { readonly kind: 'resolve' | 'reject' | 'abortError'; readonly call: number }

const describeStep = (step: Step): string => JSON.stringify(step)

const nextStep = (random: Random, world: World): Step => {
  const id = pick(random, world.registry.ids)
  const pending = world.calls.filter(isPending)
  const roll = random()
  if (pending.length > 0 && roll < 0.4) {
    const call = pick(random, pending)
    const answer = random()
    if (call.signal.aborted && answer < 0.3) return { kind: 'abortError', call: call.index }

    return { kind: answer < 0.75 ? 'resolve' : 'reject', call: call.index }
  }

  return pick<Step>(random, [
    { kind: 'enable', id },
    { kind: 'disable', id },
    { kind: 'toggle', id },
    { kind: 'toggle', id },
    { kind: 'retry', id },
    { kind: 'refresh', id },
    { kind: 'setOpacity', id, value: Math.round(random() * 140 - 20) / 100 },
    { kind: 'enableAll' },
    { kind: 'enableLayers', ids: world.registry.ids.filter(() => random() < 0.5) },
    { kind: 'disableAll' },
    { kind: 'retryFailed' },
    { kind: 'clearCache' },
    { kind: 'advance', ms: pick(random, [100, TTL_MS - 1, TTL_MS + 1]) },
  ])
}

/** Выполняет шаг и возвращает нарушения, специфичные для ответа (I4, I5). */
const runStep = async (
  world: World,
  step: Step,
  expectedEnabled: Map<LayerId, boolean>,
): Promise<string[]> => {
  const problems: string[] = []
  switch (step.kind) {
    case 'enable':
    case 'disable':
    case 'toggle':
    case 'retry':
    case 'refresh': {
      const before = layerOf(world, step.id).enabled
      world.service[step.kind](step.id)
      if (step.kind === 'enable') expectedEnabled.set(step.id, true)
      if (step.kind === 'disable') expectedEnabled.set(step.id, false)
      if (step.kind === 'toggle') expectedEnabled.set(step.id, !before)
      break
    }
    case 'setOpacity': {
      world.service.setOpacity(step.id, step.value)
      const expected = Math.min(1, Math.max(0, step.value))
      if (layerOf(world, step.id).opacity !== expected) problems.push('setOpacity: не клампит')
      break
    }
    case 'enableLayers':
      world.service.enableLayers(step.ids)
      for (const id of step.ids) expectedEnabled.set(id, true)
      break
    case 'enableAll':
    case 'disableAll':
      world.service[step.kind]()
      for (const id of world.registry.ids) expectedEnabled.set(id, step.kind === 'enableAll')
      break
    case 'retryFailed':
      world.service.retryFailed()
      break
    case 'clearCache':
      world.service.clearCache()
      break
    case 'advance':
      world.advance(step.ms)
      break
    case 'resolve':
    case 'reject':
    case 'abortError': {
      const call = world.calls[step.call]
      if (call === undefined || call.settled) break
      const requestId = requestIdOf(world, call)
      const layerBefore = layerOf(world, call.id)
      const byIdBefore = world.store.get('byId')
      const wasCurrent =
        layerBefore.load.kind === 'loading' && layerBefore.load.requestId === requestId
      const writesBefore = world.cacheWrites.length
      call.settled = true
      if (step.kind === 'resolve') call.resolve(call.data)
      else if (step.kind === 'reject')
        call.reject(new LayerApiError('server', 'Сервер вернул ошибку'))
      else call.reject(abortError())
      await flush()
      const writes = world.cacheWrites.slice(writesBefore)
      // I4: в кэш пишется только ответ, прошедший проверку requestId.
      if (
        writes.some((write) => write.data !== call.data || !wasCurrent || step.kind !== 'resolve')
      ) {
        problems.push(`I4: запись в кэш от r${String(requestId)} (актуален: ${String(wasCurrent)})`)
      }
      const layerAfter = layerOf(world, call.id)
      if (step.kind === 'abortError') {
        // I5: отмена не меняет стор: ни error, ни attempt.
        if (world.store.get('byId') !== byIdBefore)
          problems.push(`I5: AbortError r${String(requestId)} изменил стор`)
      } else if (!wasCurrent) {
        // Устаревший ответ отбрасывается целиком (R1, R8, R12).
        if (layerAfter !== layerBefore)
          problems.push(`R8: устаревший r${String(requestId)} изменил слой`)
      } else if (step.kind === 'resolve') {
        if (layerAfter.load.kind !== 'success' || layerAfter.load.data !== call.data) {
          problems.push(`§5.2/5: актуальный ответ r${String(requestId)} не дал success`)
        }
      } else if (layerAfter.load.kind !== 'error') {
        problems.push(`§5.2/6: актуальная ошибка r${String(requestId)} не дала error`)
      } else if (layerAfter.load.stale !== layerBefore.load.stale) {
        problems.push('§5.2/6: stale не сохранён при ошибке')
      }
      break
    }
  }

  return problems
}

/** Завершает всё, что в полёте: после этого ни один слой не должен остаться в loading (I7). */
const drain = async (world: World) => {
  for (const call of world.calls) {
    if (call.settled) continue
    call.settled = true
    if (call.signal.aborted) call.reject(abortError())
    else call.resolve(call.data)
    await flush()
  }
}

describe('инварианты гонок на случайных последовательностях (ТЗ §5.1–§5.3)', () => {
  it(`I1–I7: ${String(SEQUENCES)} последовательностей по ≤ ${String(MAX_STEPS)} шагов без нарушений`, async () => {
    const failures: string[] = []
    let totalSteps = 0
    let failed = false

    for (let sequence = 0; sequence < SEQUENCES && !failed; sequence += 1) {
      const seed = BASE_SEED + sequence
      const random = createRandom(seed)
      const world = createWorld(random, 1 + Math.floor(random() * 5))
      const expectedEnabled = new Map(world.registry.ids.map((id) => [id, false]))
      const steps: Step[] = []
      const length = 5 + Math.floor(random() * (MAX_STEPS - 4))

      for (let index = 0; index < length; index += 1) {
        const step = nextStep(random, world)
        steps.push(step)
        totalSteps += 1
        const problems = [
          ...(await runStep(world, step, expectedEnabled)),
          ...checkInvariants(world, expectedEnabled),
        ]
        if (problems.length > 0) {
          failures.push(
            `seed ${String(seed)}: ${problems.join('; ')}\nшаги:\n${steps.map(describeStep).join('\n')}`,
          )
          failed = true
          break
        }
      }

      if (failed) break
      await drain(world)
      const stuck = world.registry.ids.filter((id) => layerOf(world, id).load.kind === 'loading')
      const problems = [...checkInvariants(world, expectedEnabled)]
      if (stuck.length > 0)
        problems.push(`I7: после завершения всех запросов в loading: ${stuck.join(', ')}`)
      if (world.service.inFlightCount() !== 0)
        problems.push(`I7: inFlight = ${String(world.service.inFlightCount())}`)
      if (problems.length > 0) {
        failures.push(
          `seed ${String(seed)}: ${problems.join('; ')}\nшаги:\n${steps.map(describeStep).join('\n')}`,
        )
        failed = true
      }
    }

    expect(failures).toEqual([])
    expect(totalSteps).toBeGreaterThan(SEQUENCES * 5)
  })
})
