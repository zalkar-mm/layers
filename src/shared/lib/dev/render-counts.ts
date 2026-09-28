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

const VISIBILITY_ATTRIBUTE = 'renderCounts'

let renderCountsVisible = false

export const isRenderCountsVisible = (): boolean => renderCountsVisible

export const setRenderCountsVisible = (visible: boolean): void => {
  renderCountsVisible = visible
  document.documentElement.dataset[VISIBILITY_ATTRIBUTE] = visible ? 'on' : 'off'
}
