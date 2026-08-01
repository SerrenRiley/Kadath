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

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  thinking?: string
  usage?: TokenUsage
  versions?: MessageVersion[]
  activeVersion?: number
  timestamp: number
}
