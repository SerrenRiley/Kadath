import { type AppSettings } from '../types/settings'
import { type Message, type TokenUsage } from '../types/chat'

const STORAGE_KEY = 'kadath-settings'

function getSettings(): AppSettings | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return JSON.parse(saved)
  return null
}

function getThinkingParams(level: string) {
  switch (level) {
    case 'light': return { thinking: { type: 'enabled', budget_tokens: 2000 } }
    case 'deep': return { thinking: { type: 'enabled', budget_tokens: 20000 } }
    default: return {}
  }
}

export async function sendMessageStream(
  messages: Message[],
  onThinking: (chunk: string) => void,
  onContent: (chunk: string) => void,
  onUsage: (usage: TokenUsage) => void,
  signal?: AbortSignal,
): Promise<void> {
  const settings = getSettings()
  if (!settings) throw new Error('请先在设置页面配置API信息')

  const { apiUrl, apiKey, modelName } = settings.chatModel
  if (!apiUrl || !apiKey || !modelName) throw new Error('请先在设置页面填写完整的API配置')

  const apiMessages: { role: string; content: any }[] = []
  if (settings.corePrompt) apiMessages.push({ role: 'system', content: settings.corePrompt })
  apiMessages.push(...messages.map(m => {
    if (m.images && m.images.length > 0) {
      const parts: any[] = [{ type: 'text', text: m.content || '' }]
      m.images.forEach(img => {
        parts.push({ type: 'image_url', image_url: { url: img.data } })
      })
      return { role: m.role, content: parts }
    }
    return { role: m.role, content: m.content }
  }))

  const startTime = Date.now()
  const thinkingParams = getThinkingParams(settings.thinkingLevel)
  const body: any = { model: modelName, messages: apiMessages, ...thinkingParams }

  if (!settings.streamEnabled) {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) throw new Error(`API请求失败: ${response.status} ${await response.text()}`)
    const data = await response.json()
    const msg = data.choices[0].message

    if (msg.reasoning_content) onThinking(msg.reasoning_content)
    if (msg.content) onContent(msg.content)
    if (data.usage) onUsage({ promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0, duration: Date.now() - startTime })
    return
  }

  body.stream = true
  body.stream_options = { include_usage: true }

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(`API请求失败: ${response.status} ${await response.text()}`)

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        if (parsed.usage) onUsage({ promptTokens: parsed.usage.prompt_tokens || 0, completionTokens: parsed.usage.completion_tokens || 0, totalTokens: parsed.usage.total_tokens || 0, duration: Date.now() - startTime })
        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue
        if (delta.reasoning_content) onThinking(delta.reasoning_content)
        if (delta.content) onContent(delta.content)
      } catch { }
    }
  }
}

export async function fetchModels(): Promise<string[]> {
  const settings = getSettings()
  if (!settings) return []
  const { apiUrl, apiKey } = settings.chatModel
  if (!apiUrl || !apiKey) return []
  try {
    const response = await fetch(`${apiUrl}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
    if (!response.ok) return []
    const data = await response.json()
    return data.data && Array.isArray(data.data) ? data.data.map((m: any) => m.id).sort() : []
  } catch { return [] }
}

export async function sendSummary(content: string): Promise<string> {
  const settings = getSettings()
  if (!settings) throw new Error('请先在设置页面配置API信息')
  const apiUrl = settings.summaryModel.apiUrl || settings.chatModel.apiUrl
  const apiKey = settings.summaryModel.apiKey || settings.chatModel.apiKey
  const modelName = settings.summaryModel.modelName || settings.chatModel.modelName
  if (!apiUrl || !apiKey || !modelName) throw new Error('请配置总结模型信息')
  const summaryPrompt = settings.summaryPrompt || '请将以下对话内容压缩为简洁的章节摘要。'
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelName, messages: [{ role: 'system', content: summaryPrompt }, { role: 'user', content }] }),
  })
  if (!response.ok) throw new Error(`总结请求失败: ${response.status} ${await response.text()}`)
  const data = await response.json()
  return data.choices[0].message.content
}

export async function rollDice(messages: Message[], count: number, modelOverride?: string): Promise<string[]> {
  const settings = getSettings()
  if (!settings) throw new Error('请先配置API信息')

  const apiUrl = settings.chatModel.apiUrl
  const apiKey = settings.chatModel.apiKey
  const modelName = modelOverride || settings.dice.modelName || settings.chatModel.modelName
  if (!apiUrl || !apiKey || !modelName) throw new Error('请先配置API和骰子模型')

  const apiMessages: { role: string; content: string }[] = []
  if (settings.corePrompt) apiMessages.push({ role: 'system', content: settings.corePrompt })
  apiMessages.push(...messages.map(m => ({ role: m.role, content: m.content })))
  const dicePrompt = settings.dice?.prompt || `根据以上对话的上下文和角色设定，以旁白/导演的视角，生成${count}个可能的剧情走向。每个走向用一行简短的话描述接下来可能发生的事件或场景变化（不超过30字）。不要写角色的对话和心理活动，只描述将要发生的事件。格式要求：每行一个走向，用数字编号，不要其他多余内容。例如：\n1. 远处突然传来一声巨响\n2. 一个陌生人推门走了进来`
  apiMessages.push({
    role: 'system',
    content: dicePrompt.replace('{count}', String(count)),
  })

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelName, messages: apiMessages, max_tokens: 200 }),
  })

  if (!response.ok) throw new Error(`骰子请求失败: ${response.status}`)
  const data = await response.json()
  const content = data.choices[0].message.content as string

  return content.split('\n').map(line => line.replace(/^\d+[\.\、\)\s]+/, '').trim()).filter(line => line.length > 0).slice(0, count)
}

export async function parseWorldSetting(text: string): Promise<Record<string, any>> {
  const settings = getSettings()
  if (!settings) throw new Error('请先配置API信息')

  const apiUrl = settings.summaryModel.apiUrl || settings.chatModel.apiUrl
  const apiKey = settings.summaryModel.apiKey || settings.chatModel.apiKey
  const modelName = settings.summaryModel.modelName || settings.chatModel.modelName
  if (!apiUrl || !apiKey || !modelName) throw new Error('请配置模型信息')

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: `你是一个设定解析助手。用户会给你一大段RP世界设定文本，请从中提取信息并返回一个JSON对象。只返回JSON，不要其他内容。

JSON格式如下（字段值为空字符串表示原文中未提及，不要编造内容）：
{
  "worldview": "世界观/背景设定",
  "myCharacter": {
    "name": "用户扮演的角色名",
    "appearance": "外貌描述",
    "personality": "性格描述",
    "abilities": "能力/技能描述",
    "relationships": "与其他角色的关系"
  },
  "npcs": [
    {
      "name": "NPC名字",
      "appearance": "外貌",
      "personality": "性格",
      "relationships": "与主角的关系",
      "notes": "其他备注"
    }
  ],
  "specialRules": "特殊规则/限制",
  "writingPreferences": "写作偏好/叙事风格",
  "displayNames": {
    "user": "用户在对话中的显示名",
    "assistant": "AI在对话中的显示名"
  }
}`
        },
        { role: 'user', content: text }
      ],
    }),
  })

  if (!response.ok) throw new Error(`解析失败: ${response.status}`)
  const data = await response.json()
  let content = data.choices[0].message.content as string

  // 清理可能的markdown代码块包裹
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  return JSON.parse(content)
}
