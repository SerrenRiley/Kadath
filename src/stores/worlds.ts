import { type World, createEmptyWorld } from '../types/world'

const STORAGE_KEY = 'kadath-worlds'

export function loadWorlds(): World[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return JSON.parse(saved)
  return []
}

export function saveWorlds(worlds: World[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds))
}

export function addWorld(name: string): World {
  const worlds = loadWorlds()
  const newWorld = createEmptyWorld(name)
  worlds.push(newWorld)
  saveWorlds(worlds)
  return newWorld
}

export function deleteWorld(id: string) {
  const worlds = loadWorlds().filter(w => w.id !== id)
  saveWorlds(worlds)
}

export function getWorld(id: string): World | undefined {
  return loadWorlds().find(w => w.id === id)
}

export function updateWorld(updated: World) {
  const worlds = loadWorlds().map(w => w.id === updated.id ? updated : w)
  saveWorlds(worlds)
}

export function togglePin(id: string): boolean {
  const worlds = loadWorlds()
  const target = worlds.find(w => w.id === id)
  if (!target) return false

  if (target.pinned) {
    target.pinned = false
    target.pinnedAt = 0
    saveWorlds(worlds)
    return false
  }

  const pinnedCount = worlds.filter(w => w.pinned).length
  if (pinnedCount >= 5) return target.pinned

  target.pinned = true
  target.pinnedAt = Date.now()
  saveWorlds(worlds)
  return true
}
