export interface World {
  id: string
  name: string
  coverImage: string
  createdAt: number
  updatedAt: number
  setting: {
    worldview: string
    myCharacter: {
      name: string
      avatar: string
      appearance: string
      personality: string
      abilities: string
      relationships: string
    }
    npcs: {
      id: string
      name: string
      avatar: string
      appearance: string
      personality: string
      relationships: string
      notes: string
    }[]
    completedChapters: {
      id: string
      title: string
      summary: string
      originalMessages: string
    }[]
    specialRules: string
    writingPreferences: string
    summaryPrompt: string
  }
  displayNames: {
    user: string
    assistant: string
  }
}

export function createEmptyWorld(name: string): World {
  return {
    id: crypto.randomUUID(),
    name,
    coverImage: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    setting: {
      worldview: '',
      myCharacter: {
        name: '',
        avatar: '',
        appearance: '',
        personality: '',
        abilities: '',
        relationships: '',
      },
      npcs: [],
      completedChapters: [],
      specialRules: '',
      writingPreferences: '',
      summaryPrompt: '',
    },
    displayNames: {
      user: 'You',
      assistant: 'Simon',
    },
  }
}
