import { useCallback, useEffect, useRef, useState } from 'react'

export type ListState<T> = {
  /** null until the first answer. */
  items: T[] | null
  /** The error of the last load, if it failed. */
  error: unknown
  loading: boolean
  /** Loads again, keeping the current items on screen meanwhile. */
  reload: () => Promise<void>
}

/** A list loaded from the API when the screen opens, and reloaded after each change. */
export function useList<T>(load: () => Promise<T[]>): ListState<T> {
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  // Deux chargements rapproches peuvent repondre dans le desordre : seul le dernier compte.
  const latest = useRef(0)

  const fetchList = useCallback(async (request: number) => {
    try {
      const loaded = await load()
      if (request === latest.current) {
        setItems(loaded)
        setError(null)
      }
    } catch (e) {
      if (request === latest.current) setError(e)
    } finally {
      if (request === latest.current) setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void fetchList(++latest.current)
  }, [fetchList])

  const reload = useCallback(async () => {
    const request = ++latest.current
    setLoading(true)
    await fetchList(request)
  }, [fetchList])

  return { items, error, loading, reload }
}
