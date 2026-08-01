import { type AppSettings } from '../types/settings'
import { type Message, type TokenUsage } from '../types/chat'

const STORAGE_KEY = 'kadath-settings'

function getSettings(): AppSettings | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return JSON.parse(saved)
  return null
}

export async function sendMessageStream(
  messages: Message[],
  onThinking: (chunk: string) => void,
  onContent: (chunk: string) => void,
  onUsage: (usage: TokenUsage) => void,
): Promise<void> {
  const settings = getSettings()
  if (!settings) throw new Error('请先在设置页面配置API信息')

  const { apiUrl, apiKey, modelName } = settings.chatModel
  if (!apiUrl || !apiKey || !modelName) {
    throw new Error('请先在设置页面填写完整的API配置')
  }

  const apiMessages: { role: string; content: string }[] = []

  if (settings.corePrompt) {
    apiMessages.push({ role: 'system', content: settings.corePrompt })
  }

  apiMessages.push(
    ...messages.map(m => ({ role: m.role, content: m.content }))
  )

  const startTime = Date.now()

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: apiMessages,
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API请求失败: ${response.status} ${error}`)
  }

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
      if (data === '[DONE]') {
        return
      }

      try {
        const parsed = JSON.parse(data)

        if (parsed.usage) {
          const duration = Date.now() - startTime
          onUsage({
            promptTokens: parsed.usage.prompt_tokens || 0,
            completionTokens: parsed.usage.completion_tokens || 0,
            totalTokens: parsed.usage.total_tokens || 0,
            duration,
          })
        }

        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue

        if (delta.reasoning_content) {
          onThinking(delta.reasoning_content)
        }

        if (delta.content) {
          onContent(delta.content)
        }
      } catch {
        // 解析失败的行跳过
      }
    }
  }
}
