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

function stripThinkTags(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function extractThinkContent(text: string): string | null {
  const match = text.match(/<think>([\s\S]*?)<\/think>/)
  return match ? match[1].trim() : null
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

  const apiMessages: { role: string; content: string }[] = []
  if (settings.corePrompt) apiMessages.push({ role: 'system', content: settings.corePrompt })
  apiMessages.push(...messages.map(m => ({ role: m.role, content: m.content })))

  const startTime = Date.now()
  const thinkingParams = getThinkingParams(settings.thinkingLevel)
  const body: any = { model: modelName, messages: apiMessages, ...thinkingParams }

  // 非流式
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

    const hasReasoning = !!msg.reasoning_content
    if (hasReasoning) onThinking(msg.reasoning_content)

    if (msg.content) {
      if (!hasReasoning) {
        const thinkText = extractThinkContent(msg.content)
        if (thinkText) onThinking(thinkText)
      }
      const clean = stripThinkTags(msg.content)
      if (clean) onContent(clean)
    }

    if (data.usage) {
      onUsage({ promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0, duration: Date.now() - startTime })
    }
    return
  }

  // 流式
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
  let hasReasoningField = false
  let inThinkTag = false
  let tagBuffer = ''

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
      if (data === '[DONE]') {
        if (tagBuffer && !inThinkTag) onContent(tagBuffer.replace(/<br\s*\/?>/gi, ''))
        return
      }

      try {
        const parsed = JSON.parse(data)
        if (parsed.usage) {
          onUsage({ promptTokens: parsed.usage.prompt_tokens || 0, completionTokens: parsed.usage.completion_tokens || 0, totalTokens: parsed.usage.total_tokens || 0, duration: Date.now() - startTime })
        }
        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue

        // reasoning_content 字段优先
        if (delta.reasoning_content) {
          hasReasoningField = true
          onThinking(delta.reasoning_content)
        }

        if (delta.content) {
          // 如果已经有reasoning_content字段，直接清除<think>标签输出content
          if (hasReasoningField) {
            tagBuffer += delta.content
            // 尝试清除完整的<think>...</think>块
            const cleaned = tagBuffer.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<br\s*\/?>/gi, '')
            // 检查是否还有未闭合的<think>标签
            const lastOpen = tagBuffer.lastIndexOf('<think>')
            const lastClose = tagBuffer.lastIndexOf('</think>')
            if (lastOpen > lastClose) {
              // 还在<think>标签内，只输出<think>之前的部分
              const beforeThink = tagBuffer.slice(0, lastOpen).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<br\s*\/?>/gi, '')
              if (beforeThink && beforeThink !== tagBuffer.slice(0, lastOpen).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<br\s*\/?>/gi, '')) {
                // 太复杂了，用简单方法：暂存不输出
              }
            } else if (lastOpen === -1 || lastClose > lastOpen) {
              // 没有未闭合标签，安全输出
              if (cleaned) {
                onContent(cleaned)
                tagBuffer = ''
              }
            }
            continue
          }

          // 没有reasoning_content字段，用状态机解析<think>标签
          tagBuffer += delta.content
          while (tagBuffer.length > 0) {
            if (!inThinkTag) {
              const openIdx = tagBuffer.indexOf('<think>')
              if (openIdx !== -1) {
                if (openIdx > 0) {
                  const before = tagBuffer.slice(0, openIdx).replace(/<br\s*\/?>/gi, '')
                  if (before) onContent(before)
                }
                tagBuffer = tagBuffer.slice(openIdx + 7)
                inThinkTag = true
                continue
              }
              // 检查是否可能有部分<think>标签
              let safe = tagBuffer.length
              for (let i = 1; i <= Math.min(6, tagBuffer.length); i++) {
                if ('<think>'.startsWith(tagBuffer.slice(-i))) { safe = tagBuffer.length - i; break }
              }
              if (safe > 0) {
                const out = tagBuffer.slice(0, safe).replace(/<br\s*\/?>/gi, '')
                if (out) onContent(out)
                tagBuffer = tagBuffer.slice(safe)
              }
              break
            } else {
              const closeIdx = tagBuffer.indexOf('</think>')
              if (closeIdx !== -1) {
                if (closeIdx > 0) onThinking(tagBuffer.slice(0, closeIdx))
                tagBuffer = tagBuffer.slice(closeIdx + 8)
                inThinkTag = false
                continue
              }
              let safe = tagBuffer.length
              for (let i = 1; i <= Math.min(7, tagBuffer.length); i++) {
                if ('</think>'.startsWith(tagBuffer.slice(-i))) { safe = tagBuffer.length - i; break }
              }
              if (safe > 0) {
                onThinking(tagBuffer.slice(0, safe))
                tagBuffer = tagBuffer.slice(safe)
              }
              break
            }
          }
        }
      } catch { }
    }
  }

  if (tagBuffer) {
    if (inThinkTag) onThinking(tagBuffer)
    else {
      const clean = tagBuffer.replace(/<br\s*\/?>/gi, '')
      if (clean) onContent(clean)
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
