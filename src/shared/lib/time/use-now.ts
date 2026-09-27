import { useEffect, useState } from 'react'

export const useNow = (intervalMs: number, enabled: boolean): number => {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined
    const timer = setInterval(() => {
      setTick((tick) => tick + 1)
    }, intervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [enabled, intervalMs])

  return Date.now()
}
