import { useState, useEffect } from 'react'
import { type AppSettings, defaultSettings } from '../types/settings'
import { fetchModels } from '../stores/api'

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

function ModelPicker({ value, onChange, apiUrl, apiKey }: {
  value: string
  onChange: (v: string) => void
  apiUrl: string
  apiKey: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [history] = useState<string[]>(() => {
    const s = localStorage.getItem('kadath-model-history')
    return s ? JSON.parse(s) : []
  })

  async function handleOpen() {
    setOpen(!open)
    setSearch('')
    if (!open && models.length === 0 && apiUrl && apiKey) {
      setLoading(true)
      const list = await fetchModels()
      setModels(list)
      setLoading(false)
    }
  }

  function select(model: string) {
    onChange(model)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="模型名称（点击右侧按钮选择）"
          className="flex-1 p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
        />
        <button
          onClick={handleOpen}
          className="px-3 py-2 text-sm rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
          title="选择模型"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-14 left-0 right-0 rounded-lg bg-white border border-stone-200 shadow-md z-20 max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-stone-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索模型..."
              className="w-full p-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-stone-400"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && search.trim()) select(search.trim()) }}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length > 0 && !search && (
              <div className="px-2 pt-2">
                <div className="text-xs text-stone-400 px-2 pb-1">最近使用</div>
                {history.map(m => (
                  <button key={`h-${m}`} onClick={() => select(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>
                ))}
              </div>
            )}
            {loading ? (
              <div className="p-3 text-xs text-stone-400 text-center">加载模型列表...</div>
            ) : models.length > 0 ? (
              <div className="px-2 py-2">
                {!search && history.length > 0 && <div className="text-xs text-stone-400 px-2 pb-1 pt-1">全部模型</div>}
                {models.filter(m => !search || m.toLowerCase().includes(search.toLowerCase())).map(m => (
                  <button key={m} onClick={() => select(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>
                ))}
                {models.filter(m => !search || m.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                  <div className="px-2 py-2 text-xs text-stone-400">没有匹配的模型，按回车使用输入的名称</div>
                )}
              </div>
            ) : (
              <div className="p-3 text-xs text-stone-400 text-center">
                {apiUrl && apiKey ? '未能加载模型列表，可手动输入' : '请先填写API地址和Key'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
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
            <input type="text" value={settings.displayNames.user} onChange={e => updateDisplayName('user', e.target.value)} placeholder="You" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">AI 的名字</label>
            <input type="text" value={settings.displayNames.assistant} onChange={e => updateDisplayName('assistant', e.target.value)} placeholder="Simon" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
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
        <h2 className="text-lg font-medium text-stone-700">OOC 模式指令</h2>
        <p className="text-xs text-stone-400">切换到OOC（戏外对话）模式时，自动注入的系统提示。控制模型在OOC模式下的行为方式。</p>
        <textarea
          value={settings.oocPrompt}
          onChange={e => setSettings(prev => ({ ...prev, oocPrompt: e.target.value }))}
          placeholder="OOC模式的系统提示..."
          className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
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
          <ModelPicker
            value={settings.chatModel.modelName}
            onChange={v => updateChatModel('modelName', v)}
            apiUrl={settings.chatModel.apiUrl}
            apiKey={settings.chatModel.apiKey}
          />
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
          <ModelPicker
            value={settings.summaryModel.modelName}
            onChange={v => updateSummaryModel('modelName', v)}
            apiUrl={settings.summaryModel.apiUrl || settings.chatModel.apiUrl}
            apiKey={settings.summaryModel.apiKey || settings.chatModel.apiKey}
          />
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">WebDAV 云同步</h2>
        <p className="text-xs text-stone-400">通过WebDAV将数据备份到坚果云。需要先部署Cloudflare Worker作为转发代理。</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Worker 转发地址</label>
            <input type="text" value={settings.webdav.workerUrl} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, workerUrl: e.target.value } }))} placeholder="https://kadath-webdav.xxx.workers.dev" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">WebDAV 服务器地址</label>
            <input type="text" value={settings.webdav.serverUrl} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, serverUrl: e.target.value } }))} placeholder="https://dav.jianguoyun.com/dav/" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">用户名</label>
              <input type="text" value={settings.webdav.username} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, username: e.target.value } }))} placeholder="邮箱地址" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">密码</label>
              <input type="password" value={settings.webdav.password} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, password: e.target.value } }))} placeholder="应用密码" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">备份路径</label>
            <input type="text" value={settings.webdav.path} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, path: e.target.value } }))} placeholder="kadath_backups" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const { workerUrl, serverUrl, username, password, path } = settings.webdav
                if (!workerUrl || !serverUrl || !username || !password) { alert('请填写完整的WebDAV配置'); return }
                try {
                  const auth = 'Basic ' + btoa(`${username}:${password}`)
                  const testUrl = `${serverUrl}${path}/kadath-test.txt`
                  const putRes = await fetch(`${workerUrl}?url=${encodeURIComponent(testUrl)}`, {
                    method: 'PUT',
                    headers: { 'Authorization': auth, 'Content-Type': 'text/plain' },
                    body: 'kadath connection test ' + new Date().toISOString(),
                  })
                  if (putRes.ok || putRes.status === 201 || putRes.status === 204) {
                    const delRes = await fetch(`${workerUrl}?url=${encodeURIComponent(testUrl)}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': auth },
                    })
                    alert('✓ 连接成功！WebDAV读写正常。')
                  } else if (putRes.status === 404) {
                    alert('连接失败：备份目录不存在。请先在坚果云中手动创建文件夹「' + path + '」。')
                  } else if (putRes.status === 401) {
                    alert('连接失败：用户名或密码错误。请确认使用的是坚果云的应用密码而非登录密码。')
                  } else {
                    const text = await putRes.text().catch(() => '')
                    alert(`连接失败：HTTP ${putRes.status}\n${text}`)
                  }
                } catch (err) { alert('连接失败：' + (err instanceof Error ? err.message : '未知错误')) }
              }}
              className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              测试连接
            </button>
            <button
              onClick={async () => {
                const { workerUrl, serverUrl, username, password, path } = settings.webdav
                if (!workerUrl || !serverUrl || !username || !password) { alert('请填写完整的WebDAV配置'); return }
                try {
                  const targetUrl = `${serverUrl}${path}/kadath-backup.json`
                  const response = await fetch(`${workerUrl}?url=${encodeURIComponent(targetUrl)}`, {
                    method: 'GET',
                    headers: { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) },
                  })
                  if (!response.ok) { alert('恢复失败：找不到备份文件'); return }
                  const data = await response.json()
                  if (typeof data !== 'object') { alert('恢复失败：文件格式不正确'); return }
                  if (!confirm(`确定要从云端恢复数据吗？这会覆盖当前所有Kadath数据。\n\n检测到 ${Object.keys(data).length} 条数据记录。`)) return
                  Object.entries(data).forEach(([key, value]) => {
                    if (key.startsWith('kadath')) localStorage.setItem(key, value as string)
                  })
                  alert('恢复成功！页面将刷新。')
                  window.location.reload()
                } catch (err) { alert('恢复失败：' + (err instanceof Error ? err.message : '未知错误')) }
              }}
              className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              恢复
            </button>
            <button
              onClick={async () => {
                const { workerUrl, serverUrl, username, password, path } = settings.webdav
                if (!workerUrl || !serverUrl || !username || !password) { alert('请填写完整的WebDAV配置'); return }
                try {
                  const backupData: Record<string, string> = {}
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)
                    if (key && key.startsWith('kadath')) backupData[key] = localStorage.getItem(key) || ''
                  }
                  const targetUrl = `${serverUrl}${path}/kadath-backup.json`
                  const response = await fetch(`${workerUrl}?url=${encodeURIComponent(targetUrl)}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': 'Basic ' + btoa(`${username}:${password}`),
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(backupData, null, 2),
                  })
                  if (response.ok || response.status === 201 || response.status === 204) alert('✓ 备份成功！')
                  else alert(`备份失败：HTTP ${response.status}`)
                } catch (err) { alert('备份失败：' + (err instanceof Error ? err.message : '未知错误')) }
              }}
              className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
            >
              立即备份
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">数据管理</h2>
        <p className="text-xs text-stone-400">导出所有数据（设置、世界设定、对话记录）为JSON文件，或从JSON文件导入恢复。</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const data: Record<string, string> = {}
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith('kadath')) {
                  data[key] = localStorage.getItem(key) || ''
                }
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `kadath-backup-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
          >
            导出全部数据
          </button>
          <label className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer">
            导入数据
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const data = JSON.parse(reader.result as string)
                    if (typeof data !== 'object') throw new Error('格式错误')
                    if (!confirm(`确定要导入数据吗？这会覆盖当前所有Kadath数据。\n\n检测到 ${Object.keys(data).length} 条数据记录。`)) return
                    Object.entries(data).forEach(([key, value]) => {
                      if (key.startsWith('kadath')) localStorage.setItem(key, value as string)
                    })
                    alert('导入成功！页面将刷新。')
                    window.location.reload()
                  } catch (err) {
                    alert('导入失败：文件格式不正确。请确保是Kadath导出的JSON文件。')
                  }
                }
                reader.readAsText(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            onClick={() => {
              if (!confirm('确定要清除所有Kadath数据吗？\n\n⚠️ 此操作不可恢复！所有设置、世界、对话记录将被永久删除。\n\n建议先导出备份。')) return
              if (!confirm('再次确认：真的要删除所有数据吗？')) return
              const keysToRemove: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith('kadath')) keysToRemove.push(key)
              }
              keysToRemove.forEach(key => localStorage.removeItem(key))
              alert('所有数据已清除。页面将刷新。')
              window.location.reload()
            }}
            className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-400 hover:text-red-600 hover:border-red-300 transition-colors"
          >
            清除全部数据
          </button>
        </div>
      </section>
    </div>
  )
}
