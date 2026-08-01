export interface ChatModelConfig {
  apiUrl: string
  apiKey: string
  modelName: string
}

export interface SummaryModelConfig {
  apiUrl: string
  apiKey: string
  modelName: string
}

export interface DisplayNames {
  user: string
  assistant: string
}

export interface AppSettings {
  corePrompt: string
  chatModel: ChatModelConfig
  summaryModel: SummaryModelConfig
  summaryPrompt: string
  displayNames: DisplayNames
  thinkingLevel: 'light' | 'default' | 'deep'
  streamEnabled: boolean
}

export const defaultSettings: AppSettings = {
  corePrompt: '',
  chatModel: {
    apiUrl: '',
    apiKey: '',
    modelName: '',
  },
  summaryModel: {
    apiUrl: '',
    apiKey: '',
    modelName: '',
  },
  summaryPrompt: '你是一个剧情摘要助手。请将以下RP对话内容压缩为结构化的章节摘要。\n\n摘要必须包含以下部分：\n【剧情概要】用三到五句话概括本章发生了什么\n【关键事件】列出本章最重要的几个剧情节点\n【角色关系变化】记录本章中角色之间关系的推进或转折\n【未解伏笔】记录尚未解决的悬念或暗线\n【重要细节】记录可能后续会用到的道具、台词、设定细节',
  displayNames: {
    user: 'You',
    assistant: 'Simon',
  },
  thinkingLevel: 'default' as const,
  streamEnabled: true,
}
