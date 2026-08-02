import { useState, useEffect } from 'react'
import { type AppSettings, defaultSettings } from '../types/settings'
import { fetchModels } from '../stores/api'

const STORAGE_KEY = 'kadath-settings'

function loadSettings(): AppSettings {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    return { ...defaultSettings, ...parsed, displayNames: { ...defaultSettings.displayNames, ...parsed.displayNames }, webdav: { ...defaultSettings.webdav, ...parsed.webdav }, supabase: { ...defaultSettings.supabase, ...parsed.supabase } }
  }
  return defaultSettings
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const sectionIcons: Record<string, React.ReactNode> = {
  '显示设置': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  '指令设置': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  '模型配置': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  '骰子设置': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  '云同步': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  '数据管理': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const icon = sectionIcons[title]
  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
        <span className="flex items-center gap-2 text-base text-stone-700" style={{ fontWeight: 300 }}>{icon}{title}</span>
        <span className={`text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && <div className="border-t border-stone-100 p-4 space-y-6">{children}</div>}
    </div>
  )
}

function ModelPicker({ value, onChange, apiUrl, apiKey }: { value: string; onChange: (v: string) => void; apiUrl: string; apiKey: string }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [history] = useState<string[]>(() => { const s = localStorage.getItem('kadath-model-history'); return s ? JSON.parse(s) : [] })

  async function handleOpen() {
    setOpen(!open); setSearch('')
    if (!open && models.length === 0 && apiUrl && apiKey) { setLoading(true); const list = await fetchModels(); setModels(list); setLoading(false) }
  }

  function select(model: string) { onChange(model); setOpen(false); setSearch('') }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="模型名称（点击右侧按钮选择）" className="flex-1 p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
        <button onClick={handleOpen} className="px-3 py-2 text-sm rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors" title="选择模型">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-14 left-0 right-0 rounded-lg bg-white border border-stone-200 shadow-md z-20 max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-stone-100"><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索模型..." className="w-full p-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-stone-400" autoFocus onKeyDown={e => { if (e.key === 'Enter' && search.trim()) select(search.trim()) }} /></div>
          <div className="flex-1 overflow-y-auto">
            {history.length > 0 && !search && <div className="px-2 pt-2"><div className="text-xs text-stone-400 px-2 pb-1">最近使用</div>{history.map(m => <button key={`h-${m}`} onClick={() => select(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>)}</div>}
            {loading ? <div className="p-3 text-xs text-stone-400 text-center">加载模型列表...</div>
              : models.length > 0 ? <div className="px-2 py-2">{!search && history.length > 0 && <div className="text-xs text-stone-400 px-2 pb-1 pt-1">全部模型</div>}{models.filter(m => !search || m.toLowerCase().includes(search.toLowerCase())).map(m => <button key={m} onClick={() => select(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>)}{models.filter(m => !search || m.toLowerCase().includes(search.toLowerCase())).length === 0 && <div className="px-2 py-2 text-xs text-stone-400">没有匹配，按回车使用输入的名称</div>}</div>
              : <div className="p-3 text-xs text-stone-400 text-center">{apiUrl && apiKey ? '未能加载模型列表，可手动输入' : '请先填写API地址和Key'}</div>}
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

  useEffect(() => { if (saved) { const t = setTimeout(() => setSaved(false), 2000); return () => clearTimeout(t) } }, [saved])

  function handleSave() { saveSettings(settings); setSaved(true) }
  function updateChatModel(field: string, value: string) { setSettings(prev => ({ ...prev, chatModel: { ...prev.chatModel, [field]: value } })) }
  function updateSummaryModel(field: string, value: string) { setSettings(prev => ({ ...prev, summaryModel: { ...prev.summaryModel, [field]: value } })) }
  function updateDisplayName(field: 'user' | 'assistant', value: string) { setSettings(prev => ({ ...prev, displayNames: { ...prev.displayNames, [field]: value } })) }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light">设置</h1>
        <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">{saved ? '✓ 已保存' : '保存设置'}</button>
      </div>

      <Section title="显示设置" defaultOpen={true}>
        <div>
          <p className="text-xs text-stone-400 mb-3">对话中显示的名字。每个小世界可在设定中单独覆盖。</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">你的名字</label>
              <input type="text" value={settings.displayNames.user} onChange={e => updateDisplayName('user', e.target.value)} placeholder="输入你的名字"
 className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">AI 的名字</label>
              <input type="text" value={settings.displayNames.assistant} onChange={e => updateDisplayName('assistant', e.target.value)} placeholder="输入AI的名字" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="指令设置">
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">核心人格 Prompt</h3>
          <p className="text-xs text-stone-400 mb-2">全局生效，所有世界共享。</p>
          <textarea value={settings.corePrompt} onChange={e => setSettings(prev => ({ ...prev, corePrompt: e.target.value }))} placeholder="在这里写入核心人格设定..." className="w-full h-48 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">OOC 模式指令</h3>
          <p className="text-xs text-stone-400 mb-2">切换到OOC模式时自动注入的系统提示。</p>
          <textarea value={settings.oocPrompt} onChange={e => setSettings(prev => ({ ...prev, oocPrompt: e.target.value }))} placeholder="OOC模式的系统提示..." className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">总结指令</h3>
          <p className="text-xs text-stone-400 mb-2">全局默认的章节总结prompt。每个世界可单独覆盖。</p>
          <textarea value={settings.summaryPrompt} onChange={e => setSettings(prev => ({ ...prev, summaryPrompt: e.target.value }))} placeholder="总结指令..." className="w-full h-48 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
      </Section>

      <Section title="模型配置">
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">聊天模型</h3>
          <p className="text-xs text-stone-400 mb-2">用于RP对话的主力模型。</p>
          <div className="space-y-3">
            <input type="text" value={settings.chatModel.apiUrl} onChange={e => updateChatModel('apiUrl', e.target.value)} placeholder="API 地址（如 https://api.openai.com/v1）" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            <div className="relative">
              <input type={showApiKey ? 'text' : 'password'} value={settings.chatModel.apiKey} onChange={e => updateChatModel('apiKey', e.target.value)} placeholder="API Key" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors pr-16" />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600">{showApiKey ? '隐藏' : '显示'}</button>
            </div>
            <ModelPicker value={settings.chatModel.modelName} onChange={v => updateChatModel('modelName', v)} apiUrl={settings.chatModel.apiUrl} apiKey={settings.chatModel.apiKey} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">总结模型</h3>
          <p className="text-xs text-stone-400 mb-2">用于章节摘要的轻量模型，独立于聊天模型。</p>
          <div className="space-y-3">
            <input type="text" value={settings.summaryModel.apiUrl} onChange={e => updateSummaryModel('apiUrl', e.target.value)} placeholder="API 地址" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            <div className="relative">
              <input type={showSummaryApiKey ? 'text' : 'password'} value={settings.summaryModel.apiKey} onChange={e => updateSummaryModel('apiKey', e.target.value)} placeholder="API Key" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors pr-16" />
              <button type="button" onClick={() => setShowSummaryApiKey(!showSummaryApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600">{showSummaryApiKey ? '隐藏' : '显示'}</button>
            </div>
            <ModelPicker value={settings.summaryModel.modelName} onChange={v => updateSummaryModel('modelName', v)} apiUrl={settings.summaryModel.apiUrl || settings.chatModel.apiUrl} apiKey={settings.summaryModel.apiKey || settings.chatModel.apiKey} />
          </div>
        </div>
      </Section>

      <Section title="骰子设置">
        <div>
          <p className="text-xs text-stone-400 mb-3">在小世界对话中掷骰子，AI会根据上下文生成多个剧情走向供你选择。</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">生成数量（1D几）</label>
              <div className="flex items-center gap-3">
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => setSettings(prev => ({ ...prev, dice: { ...prev.dice, count: n } }))} className={`px-4 py-2 text-sm rounded-lg border transition-colors ${settings.dice.count === n ? 'bg-stone-800 text-stone-50 border-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>1D{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">骰子模型（留空则使用聊天模型）</label>
              <ModelPicker value={settings.dice.modelName} onChange={v => setSettings(prev => ({ ...prev, dice: { ...prev.dice, modelName: v } }))} apiUrl={settings.chatModel.apiUrl} apiKey={settings.chatModel.apiKey} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">骰子指令（留空使用默认指令，可用 {'{count}'} 代表数量）</label>
              <textarea value={settings.dice.prompt} onChange={e => setSettings(prev => ({ ...prev, dice: { ...prev.dice, prompt: e.target.value } }))} placeholder="留空使用默认指令：根据上下文生成剧情走向..." className="w-full h-24 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="云同步">
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">Supabase 云同步</h3>
          <p className="text-xs text-stone-400 mb-2">国内直连，无需梯子。</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Project URL</label>
              <input type="text" value={settings.supabase.projectUrl} onChange={e => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, projectUrl: e.target.value } }))} placeholder="https://xxxxx.supabase.co" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Anon Key</label>
              <input type="password" value={settings.supabase.anonKey} onChange={e => setSettings(prev => ({ ...prev, supabase: { ...prev.supabase, anonKey: e.target.value } }))} placeholder="eyJhb..." className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
            </div>
            <div className="flex gap-3">
              <button onClick={async () => { const { projectUrl, anonKey } = settings.supabase; if (!projectUrl || !anonKey) { alert('请填写Supabase配置'); return }; try { const res = await fetch(`${projectUrl}/storage/v1/object/kadath/kadath-test.json`, { method: 'POST', headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify({ test: true }) }); if (res.ok) { await fetch(`${projectUrl}/storage/v1/object/kadath/kadath-test.json`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }); alert('✓ 连接成功！读写正常。') } else alert(`连接失败：HTTP ${res.status}`) } catch (err) { alert('连接失败：' + (err instanceof Error ? err.message : '未知错误')) } }} className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">测试连接</button>
              <button onClick={async () => { const { projectUrl, anonKey } = settings.supabase; if (!projectUrl || !anonKey) { alert('请填写Supabase配置'); return }; try { const res = await fetch(`${projectUrl}/storage/v1/object/kadath/kadath-backup.json`, { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }); if (!res.ok) { alert('恢复失败：找不到备份文件'); return }; const data = await res.json(); if (!confirm(`确定从云端恢复？将覆盖所有数据。\n\n${Object.keys(data).length} 条记录。`)) return; Object.entries(data).forEach(([k, v]) => { if (k.startsWith('kadath')) localStorage.setItem(k, v as string) }); alert('恢复成功！'); window.location.reload() } catch (err) { alert('恢复失败：' + (err instanceof Error ? err.message : '未知错误')) } }} className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">恢复</button>
              <button onClick={async () => { const { projectUrl, anonKey } = settings.supabase; if (!projectUrl || !anonKey) { alert('请填写Supabase配置'); return }; try { const d: Record<string, string> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('kadath')) d[k] = localStorage.getItem(k) || '' }; const res = await fetch(`${projectUrl}/storage/v1/object/kadath/kadath-backup.json`, { method: 'POST', headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(d, null, 2) }); if (res.ok) alert('✓ 备份成功！'); else alert(`备份失败：HTTP ${res.status}`) } catch (err) { alert('备份失败：' + (err instanceof Error ? err.message : '未知错误')) } }} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">立即备份</button>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">WebDAV 云同步</h3>
          <p className="text-xs text-stone-400 mb-2">通过Worker转发连接坚果云。因网络限制暂不可用，保留待Tauri桌面版。</p>
          <div className="space-y-3 opacity-60">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-stone-500 mb-1 block">Worker 转发地址</label><input type="text" value={settings.webdav.workerUrl} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, workerUrl: e.target.value } }))} placeholder="https://xxx.workers.dev" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
              <div><label className="text-xs text-stone-500 mb-1 block">服务器地址</label><input type="text" value={settings.webdav.serverUrl} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, serverUrl: e.target.value } }))} placeholder="https://dav.jianguoyun.com/dav/" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-stone-500 mb-1 block">用户名</label><input type="text" value={settings.webdav.username} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, username: e.target.value } }))} placeholder="邮箱" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
              <div><label className="text-xs text-stone-500 mb-1 block">密码</label><input type="password" value={settings.webdav.password} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, password: e.target.value } }))} placeholder="应用密码" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
              <div><label className="text-xs text-stone-500 mb-1 block">路径</label><input type="text" value={settings.webdav.path} onChange={e => setSettings(prev => ({ ...prev, webdav: { ...prev.webdav, path: e.target.value } }))} placeholder="kadath_backups" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="数据管理">
        <div>
          <p className="text-xs text-stone-400 mb-3">导出所有数据为JSON文件，或从JSON文件导入恢复。</p>
          <div className="flex gap-3">
            <button onClick={() => { const d: Record<string, string> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('kadath')) d[k] = localStorage.getItem(k) || '' }; const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `kadath-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url) }} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">导出全部数据</button>
            <label className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer">导入数据<input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result as string); if (!confirm(`确定导入？将覆盖所有数据。\n\n${Object.keys(d).length} 条记录。`)) return; Object.entries(d).forEach(([k, v]) => { if (k.startsWith('kadath')) localStorage.setItem(k, v as string) }); alert('导入成功！'); window.location.reload() } catch { alert('导入失败：文件格式不正确。') } }; r.readAsText(f); e.target.value = '' }} /></label>
            <button onClick={() => { if (!confirm('确定清除所有Kadath数据？\n\n⚠️ 不可恢复！建议先导出备份。')) return; if (!confirm('再次确认：真的要删除所有数据吗？')) return; const keys: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('kadath')) keys.push(k) }; keys.forEach(k => localStorage.removeItem(k)); alert('已清除。'); window.location.reload() }} className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-400 hover:text-red-600 hover:border-red-300 transition-colors">清除全部数据</button>
          </div>
        </div>
      </Section>
    </div>
  )
}
