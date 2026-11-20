import { useCallback, useEffect, useRef, useState } from 'react'

export type LoadState<T> = {
  /** null until the first answer. */
  data: T | null
  /** The error of the last load, if it failed. */
  error: unknown
  loading: boolean
  /** Loads again, keeping the current data on screen meanwhile. */
  reload: () => Promise<void>
}

type Answer<T> = { for: unknown; data: T | null; error: unknown }

/**
 * Data loaded from the API when the screen opens, and again whenever `load`
 * changes (a new filter, a new page). The previous data stays on screen
 * while the next answer comes, and an answer arriving after a newer request
 * is ignored: a slow first page cannot replace a fast second one.
 */
export function useLoad<T>(load: () => Promise<T>): LoadState<T> {
  // La reponse affichee retient pour quel `load` elle est venue : tant que ce
  // n'est pas le load courant, le chargement est en cours.
  const [answer, setAnswer] = useState<Answer<T>>({ for: null, data: null, error: null })
  const [reloading, setReloading] = useState(false)
  const latest = useRef(0)

  const run = useCallback(async (request: number) => {
    try {
      const data = await load()
      if (request === latest.current) setAnswer({ for: load, data, error: null })
    } catch (error) {
      if (request === latest.current) setAnswer((previous) => ({ for: load, data: previous.data, error }))
    }
  }, [load])

  useEffect(() => {
    void run(++latest.current)
  }, [run])

  const reload = useCallback(async () => {
    const request = ++latest.current
    setReloading(true)
    try {
      await run(request)
    } finally {
      if (request === latest.current) setReloading(false)
    }
  }, [run])

  return { data: answer.data, error: answer.error, loading: answer.for !== load || reloading, reload }
}
