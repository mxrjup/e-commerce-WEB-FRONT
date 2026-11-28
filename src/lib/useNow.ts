import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `everyMs`: « il y a 5 minutes » keeps
 * telling the truth while the page stays open, and rendering stays pure.
 */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}
