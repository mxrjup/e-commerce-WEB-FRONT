import { useLoad } from './useLoad'

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
  const { data, ...rest } = useLoad(load)
  return { items: data, ...rest }
}
