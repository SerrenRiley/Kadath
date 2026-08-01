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

function buildRequestBody(settings: AppSettings, apiMessages: { role: string; content: string }[], modelOverride?: string) {
  const model = modelOverride || settings.chatModel.modelName
  const base: any = { model, messages: apiMessages }
  const thinkingParams = getThinkingParams(settings.thinkingLevel)
  if (thinkingParams.thinking) base.thinking = thinkingParams.thinking
  return base
}

export async function sendMessageStream(
  messages: Message[],
  onThinking: (chunk: string) => void,
  onContent: (chunk: string) => void,
  onUsage: (usage: TokenUsage) => void,
  modelOverride?: string,
): Promise<void> {
  const settings = getSettings()
  if (!settings) throw new Error('请先在设置页面配置API信息')

  const { apiUrl, apiKey } = settings.chatModel
  const modelName = modelOverride || settings.chatModel.modelName
  if (!apiUrl || !apiKey || !modelName) throw new Error('请先在设置页面填写完整的API配置')

  const apiMessages: { role: string; content: string }[] = []
  if (settings.corePrompt) apiMessages.push({ role: 'system', content: settings.corePrompt })
  apiMessages.push(...messages.map(m => ({ role: m.role, content: m.content })))

  const startTime = Date.now()

  if (!settings.streamEnabled) {
    const body = buildRequestBody(settings, apiMessages, modelOverride)
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    if (!response.ok) { const error = await response.text(); throw new Error(`API请求失败: ${response.status} ${error}`) }
    const data = await response.json()
    const msg = data.choices[0].message
    if (msg.reasoning_content) onThinking(msg.reasoning_content)
    if (msg.content) onContent(msg.content)
    if (data.usage) {
      onUsage({
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        duration: Date.now() - startTime,
      })
    }
    return
  }

  const body = { ...buildRequestBody(settings, apiMessages, modelOverride), stream: true, stream_options: { include_usage: true } }
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) { const error = await response.text(); throw new Error(`API请求失败: ${response.status} ${error}`) }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.usage) {
          onUsage({ promptTokens: parsed.usage.prompt_tokens || 0, completionTokens: parsed.usage.completion_tokens || 0, totalTokens: parsed.usage.total_tokens || 0, duration: Date.now() - startTime })
        }
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
    const response = await fetch(`${apiUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id).sort()
    }
    return []
  } catch {
    return []
  }
}
