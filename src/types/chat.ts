export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  duration: number
}

export interface MessageVersion {
  id: string
  content: string
  thinking?: string
  usage?: TokenUsage
}

export interface MessageImage {
  data: string
  type: string
}

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: MessageImage[]
  thinking?: string
  usage?: TokenUsage
  versions?: MessageVersion[]
  activeVersion?: number
  timestamp: number
}
