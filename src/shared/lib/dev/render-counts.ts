export const RENDER_COUNTS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_RENDER_COUNTS === 'true'

const counts = new Map<string, number>()

export const getRenderCount = (name: string): number => counts.get(name) ?? 0

export const incrementRenderCount = (name: string): number => {
  const next = getRenderCount(name) + 1
  counts.set(name, next)

  return next
}

export const resetRenderCounts = (): void => {
  counts.clear()
}
