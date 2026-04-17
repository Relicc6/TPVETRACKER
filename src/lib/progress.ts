import type { TaskProgressMap, HideoutProgressMap, WatchedItems } from '@/types/tarkov'

const KEYS = {
  tasks: 'tpve_task_progress',
  hideout: 'tpve_hideout_progress',
  watched: 'tpve_watched_items',
} as const

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadTaskProgress(): TaskProgressMap {
  return load<TaskProgressMap>(KEYS.tasks, {})
}

export function saveTaskProgress(progress: TaskProgressMap) {
  save(KEYS.tasks, progress)
}

export function loadHideoutProgress(): HideoutProgressMap {
  return load<HideoutProgressMap>(KEYS.hideout, {})
}

export function saveHideoutProgress(progress: HideoutProgressMap) {
  save(KEYS.hideout, progress)
}

export function loadWatchedItems(): WatchedItems {
  return load<WatchedItems>(KEYS.watched, {})
}

export function saveWatchedItems(watched: WatchedItems) {
  save(KEYS.watched, watched)
}
