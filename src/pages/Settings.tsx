import { useState, useEffect } from 'react'
import { type AppSettings, defaultSettings } from '../types/settings'

const STORAGE_KEY = 'kadath-settings'

function loadSettings(): AppSettings {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    return { ...defaultSettings, ...parsed, displayNames: { ...defaultSettings.displayNames, ...parsed.displayNames } }
  }
  return defaultSettings
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSummaryApiKey, setShowSummaryApiKey] = useState(false)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
  }

  function updateChatModel(field: string, value: string) {
    setSettings(prev => ({ ...prev, chatModel: { ...prev.chatModel, [field]: value } }))
  }

  function updateSummaryModel(field: string, value: string) {
    setSettings(prev => ({ ...prev, summaryModel: { ...prev.summaryModel, [field]: value } }))
  }

  function updateDisplayName(field: 'user' | 'assistant', value: string) {
    setSettings(prev => ({ ...prev, displayNames: { ...prev.displayNames, [field]: value } }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light">设置</h1>
        <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">显示名称</h2>
        <p className="text-xs text-stone-400">对话中显示的名字和头像。每个小世界可在设定中单独覆盖。</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">你的名字</label>
            <input
              type="text"
              value={settings.displayNames.user}
              onChange={e => updateDisplayName('user', e.target.value)}
              placeholder="You"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">AI 的名字</label>
            <input
              type="text"
              value={settings.displayNames.assistant}
              onChange={e => updateDisplayName('assistant', e.target.value)}
              placeholder="Simon"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">核心人格 Prompt</h2>
        <p className="text-xs text-stone-400">全局生效，所有世界共享。这是你在每个世界中的底层人格。</p>
        <textarea
          value={settings.corePrompt}
          onChange={e => setSettings(prev => ({ ...prev, corePrompt: e.target.value }))}
          placeholder="在这里写入核心人格设定..."
          className="w-full h-48 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">聊天模型</h2>
        <p className="text-xs text-stone-400">用于RP对话的主力模型。</p>
        <div className="space-y-3">
          <input type="text" value={settings.chatModel.apiUrl} onChange={e => updateChatModel('apiUrl', e.target.value)} placeholder="API 地址（如 https://api.openai.com/v1）" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          <div className="relative">
            <input type={showApiKey ? 'text' : 'password'} value={settings.chatModel.apiKey} onChange={e => updateChatModel('apiKey', e.target.value)} placeholder="API Key" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors pr-16" />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600">{showApiKey ? '隐藏' : '显示'}</button>
          </div>
          <input type="text" value={settings.chatModel.modelName} onChange={e => updateChatModel('modelName', e.target.value)} placeholder="模型名称（如 claude-sonnet-4-20250514）" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">总结模型</h2>
        <p className="text-xs text-stone-400">用于章节摘要生成的轻量模型，独立于聊天模型。</p>
        <div className="space-y-3">
          <input type="text" value={settings.summaryModel.apiUrl} onChange={e => updateSummaryModel('apiUrl', e.target.value)} placeholder="API 地址" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          <div className="relative">
            <input type={showSummaryApiKey ? 'text' : 'password'} value={settings.summaryModel.apiKey} onChange={e => updateSummaryModel('apiKey', e.target.value)} placeholder="API Key" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors pr-16" />
            <button type="button" onClick={() => setShowSummaryApiKey(!showSummaryApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600">{showSummaryApiKey ? '隐藏' : '显示'}</button>
          </div>
          <input type="text" value={settings.summaryModel.modelName} onChange={e => updateSummaryModel('modelName', e.target.value)} placeholder="模型名称（如 claude-haiku）" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">总结指令</h2>
        <p className="text-xs text-stone-400">全局默认的章节总结prompt。每个世界可单独覆盖。</p>
        <textarea
          value={settings.summaryPrompt}
          onChange={e => setSettings(prev => ({ ...prev, summaryPrompt: e.target.value }))}
          placeholder="总结指令..."
          className="w-full h-48 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>
    </div>
  )
}
