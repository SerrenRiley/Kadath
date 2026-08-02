import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { type World } from '../types/world'
import { getWorld, updateWorld } from '../stores/worlds'
import { parseWorldSetting } from '../stores/api'

const sectionIcons: Record<string, React.ReactNode> = {
  '显示名称': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  '世界观 / 角色 / NPC': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  '规则 / 写作偏好': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  '已完成剧情': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
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

function NpcCard({ npc, onUpdate, onDelete }: {
  npc: { id: string; name: string; avatar: string; appearance: string; personality: string; relationships: string; notes: string }
  onUpdate: (field: string, value: string) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50">
      <div className="flex items-center justify-between p-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <span className={`text-stone-400 transition-transform text-xs ${open ? 'rotate-90' : ''}`}>▶</span>
          {npc.name || '未命名NPC'}
        </button>
        <button onClick={onDelete} className="text-xs text-stone-400 hover:text-red-500 transition-colors">删除</button>
      </div>
      {open && (
        <div className="border-t border-stone-200 p-3 space-y-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">名字</label>
            <input type="text" value={npc.name} onChange={e => onUpdate('name', e.target.value)} placeholder="NPC名称" className="w-full p-2.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">外貌</label>
            <textarea value={npc.appearance} onChange={e => onUpdate('appearance', e.target.value)} placeholder="外貌描述..." className="w-full h-20 p-2.5 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">性格</label>
            <textarea value={npc.personality} onChange={e => onUpdate('personality', e.target.value)} placeholder="性格特点..." className="w-full h-20 p-2.5 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">与主角的关系</label>
            <textarea value={npc.relationships} onChange={e => onUpdate('relationships', e.target.value)} placeholder="关系描述..." className="w-full h-20 p-2.5 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">备注</label>
            <textarea value={npc.notes} onChange={e => onUpdate('notes', e.target.value)} placeholder="其他信息..." className="w-full h-20 p-2.5 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
          </div>
        </div>
      )}
    </div>
  )
}

function ChapterCard({ chapter, index, onUpdateTitle, onUpdateSummary, onDelete }: {
  chapter: { id: string; title: string; summary: string; originalMessages: string }; index: number
  onUpdateTitle: (t: string) => void; onUpdateSummary: (s: string) => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chapter.title)
  const [editSummary, setEditSummary] = useState(chapter.summary)
  function saveEdit() { onUpdateTitle(editTitle); onUpdateSummary(editSummary); setEditing(false) }
  let originalMessages: any[] = []
  try { originalMessages = JSON.parse(chapter.originalMessages) } catch {}
  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-2 text-sm"><span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span><span className="font-medium text-stone-700">{chapter.title}</span></div>
        <span className="text-xs text-stone-400">第{index + 1}章</span>
      </button>
      {open && (
        <div className="border-t border-stone-100 p-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <div><label className="text-xs text-stone-500 mb-1 block">标题</label><input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-stone-400" /></div>
              <div><label className="text-xs text-stone-500 mb-1 block">摘要</label><textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} className="w-full h-48 p-3 text-sm rounded-md border border-stone-200 resize-y focus:outline-none focus:border-stone-400 leading-relaxed" /></div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setEditing(false); setEditTitle(chapter.title); setEditSummary(chapter.summary) }} className="px-3 py-1.5 text-xs rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
                <button onClick={saveEdit} className="px-3 py-1.5 text-xs rounded-md bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">保存</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{chapter.summary}</div>
          )}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
            {!editing && <button onClick={() => setEditing(true)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">编辑</button>}
            <button onClick={() => setShowOriginal(!showOriginal)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">{showOriginal ? '收起原文' : '查看原文'}</button>
            <button onClick={onDelete} className="text-xs text-stone-400 hover:text-red-500 transition-colors">删除</button>
          </div>
          {showOriginal && (
            <div className="mt-3 p-3 rounded-lg bg-stone-50 max-h-96 overflow-y-auto space-y-3">
              {originalMessages.map((m: any, i: number) => (<div key={i} className="text-xs"><div className="text-stone-400 mb-0.5">{m.role === 'user' ? 'You' : 'Simon'}</div><div className="text-stone-600 whitespace-pre-wrap">{m.content}</div></div>))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorldEdit() {
  const { id } = useParams()
  const [world, setWorld] = useState<World | null>(null)
  const [saved, setSaved] = useState(false)
  const [showParse, setShowParse] = useState(false)
  const [parseText, setParseText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')

  useEffect(() => { if (id) { const w = getWorld(id); if (w) setWorld(w) } }, [id])
  useEffect(() => { if (saved) { const t = setTimeout(() => setSaved(false), 2000); return () => clearTimeout(t) } }, [saved])

  async function handleParse() {
    if (!parseText.trim() || !world || parsing) return
    setParsing(true); setParseError('')
    try {
      const result = await parseWorldSetting(parseText.trim())
      const updated = { ...world }
      if (result.worldview) updated.setting = { ...updated.setting, worldview: result.worldview }
      if (result.specialRules) updated.setting = { ...updated.setting, specialRules: result.specialRules }
      if (result.writingPreferences) updated.setting = { ...updated.setting, writingPreferences: result.writingPreferences }
      if (result.myCharacter) {
        const mc = result.myCharacter
        updated.setting = { ...updated.setting, myCharacter: { ...updated.setting.myCharacter, name: mc.name || updated.setting.myCharacter.name, appearance: mc.appearance || updated.setting.myCharacter.appearance, personality: mc.personality || updated.setting.myCharacter.personality, abilities: mc.abilities || updated.setting.myCharacter.abilities, relationships: mc.relationships || updated.setting.myCharacter.relationships } }
      }
      if (result.npcs && Array.isArray(result.npcs) && result.npcs.length > 0) {
        const newNpcs = result.npcs.map((npc: any) => ({ id: crypto.randomUUID(), name: npc.name || '', avatar: '', appearance: npc.appearance || '', personality: npc.personality || '', relationships: npc.relationships || '', notes: npc.notes || '' }))
        updated.setting = { ...updated.setting, npcs: [...updated.setting.npcs, ...newNpcs] }
      }
      if (result.displayNames) {
        if (result.displayNames.user) updated.displayNames = { ...updated.displayNames, user: result.displayNames.user }
        if (result.displayNames.assistant) updated.displayNames = { ...updated.displayNames, assistant: result.displayNames.assistant }
      }
      setWorld(updated); setShowParse(false); setParseText('')
      alert('✓ 设定解析完成！请检查各项内容，然后点击保存。')
    } catch (err) { setParseError(err instanceof Error ? err.message : '解析失败') }
    finally { setParsing(false) }
  }

  function handleSave() { if (!world) return; updateWorld({ ...world, updatedAt: Date.now() }); setSaved(true) }

  function updateSetting<K extends keyof World['setting']>(key: K, value: World['setting'][K]) {
    if (!world) return; setWorld({ ...world, setting: { ...world.setting, [key]: value } })
  }

  function updateCharacter(field: string, value: string) {
    if (!world) return; setWorld({ ...world, setting: { ...world.setting, myCharacter: { ...world.setting.myCharacter, [field]: value } } })
  }

  function updateDisplayName(field: 'user' | 'assistant', value: string) {
    if (!world) return; setWorld({ ...world, displayNames: { ...world.displayNames, [field]: value } })
  }

  function addNpc() {
    if (!world) return
    const newNpc = { id: crypto.randomUUID(), name: '', avatar: '', appearance: '', personality: '', relationships: '', notes: '' }
    setWorld({ ...world, setting: { ...world.setting, npcs: [...world.setting.npcs, newNpc] } })
  }

  function updateNpc(npcId: string, field: string, value: string) {
    if (!world) return
    setWorld({ ...world, setting: { ...world.setting, npcs: world.setting.npcs.map(n => n.id === npcId ? { ...n, [field]: value } : n) } })
  }

  function deleteNpc(npcId: string) {
    if (!world) return
    if (!confirm('确定要删除这个NPC吗？')) return
    setWorld({ ...world, setting: { ...world.setting, npcs: world.setting.npcs.filter(n => n.id !== npcId) } })
  }

  if (!world) return <div className="p-6 text-center text-stone-400"><p>找不到这个世界。</p><Link to="/" className="text-stone-600 hover:underline mt-2 inline-block">返回主世界</Link></div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="space-y-3 mb-2">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-stone-400 hover:text-stone-600 transition-colors text-sm shrink-0">←</Link>
          <input type="text" value={world.name} onChange={e => setWorld({ ...world, name: e.target.value })} className="text-xl font-light bg-transparent border-none outline-none flex-1 min-w-0" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => {
            if (!world) return
            let md = `# ${world.name}\n\n`
            if (world.setting.worldview) md += `## 世界观\n\n${world.setting.worldview}\n\n`
            if (world.setting.myCharacter.name) {
              md += `## 我的角色：${world.setting.myCharacter.name}\n\n`
              if (world.setting.myCharacter.appearance) md += `**外貌**：${world.setting.myCharacter.appearance}\n\n`
              if (world.setting.myCharacter.personality) md += `**性格**：${world.setting.myCharacter.personality}\n\n`
              if (world.setting.myCharacter.abilities) md += `**能力**：${world.setting.myCharacter.abilities}\n\n`
              if (world.setting.myCharacter.relationships) md += `**关系**：${world.setting.myCharacter.relationships}\n\n`
            }
            if (world.setting.npcs.length > 0) {
              md += `## NPC\n\n`
              world.setting.npcs.forEach(npc => {
                md += `### ${npc.name || '未命名'}\n\n`
                if (npc.appearance) md += `**外貌**：${npc.appearance}\n\n`
                if (npc.personality) md += `**性格**：${npc.personality}\n\n`
                if (npc.relationships) md += `**关系**：${npc.relationships}\n\n`
                if (npc.notes) md += `**备注**：${npc.notes}\n\n`
              })
            }
            if (world.setting.specialRules) md += `## 特殊规则\n\n${world.setting.specialRules}\n\n`
            if (world.setting.writingPreferences) md += `## 写作偏好\n\n${world.setting.writingPreferences}\n\n`
            if (world.setting.completedChapters.length > 0) {
              md += `## 已完成剧情\n\n`
              world.setting.completedChapters.forEach((ch, i) => {
                md += `### ${ch.title}\n\n${ch.summary}\n\n`
                try {
                  const msgs = JSON.parse(ch.originalMessages)
                  md += `<details><summary>查看原文</summary>\n\n`
                  msgs.forEach((m: any) => { md += `**${m.role === 'user' ? (world.displayNames.user || 'You') : (world.displayNames.assistant || 'AI')}**\n\n${m.content}\n\n---\n\n` })
                  md += `</details>\n\n`
                } catch {}
              })
            }
            const chatKey = `kadath-chat-${world.id}`
            const chatData = localStorage.getItem(chatKey)
            if (chatData) {
              try {
                const msgs = JSON.parse(chatData)
                if (msgs.length > 0) {
                  md += `## 当前对话\n\n`
                  msgs.forEach((m: any) => { md += `**${m.role === 'user' ? (world.displayNames.user || 'You') : (world.displayNames.assistant || 'AI')}**\n\n${m.content}\n\n---\n\n` })
                }
              } catch {}
            }
            const blob = new Blob([md], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${world.name}.md`; a.click()
            URL.revokeObjectURL(url)
          }} className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>导出
          </button>
          <button onClick={() => setShowParse(true)} className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>智能填充</button>
          <Link to={`/world/${world.id}/chat`} className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">进入对话</Link>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">{saved ? '✓ 已保存' : '保存设定'}</button>
        </div>
      </div>

      {showParse && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex flex-col">
          <div className="flex-1 flex flex-col m-4 sm:m-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <div><span className="text-sm text-stone-700 font-medium"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>智能填充</span>
<p className="text-xs text-stone-400 mt-0.5">粘贴设定文本，AI将自动解析并填入各个字段</p></div>
              <button onClick={() => { setShowParse(false); setParseText(''); setParseError('') }} className="text-stone-400 hover:text-stone-600 transition-colors text-sm">取消</button>
            </div>
            <textarea value={parseText} onChange={e => setParseText(e.target.value)} placeholder={"将你的世界设定文本粘贴到这里...\n\n可以是聊天记录中整理出的设定、世界观描述、角色卡、NPC信息等任何格式的文本。\nAI会自动识别并分类填入对应字段。已有内容不会被覆盖，NPC会追加。"} className="flex-1 p-5 text-sm resize-none focus:outline-none leading-relaxed" autoFocus />
            {parseError && <div className="px-5 py-2 text-sm text-red-500">{parseError}</div>}
            <div className="flex justify-end gap-3 px-5 py-3 border-t border-stone-200">
              <button onClick={() => { setShowParse(false); setParseText(''); setParseError('') }} className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
              <button onClick={handleParse} disabled={!parseText.trim() || parsing} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors">{parsing ? '正在解析...' : '开始解析'}</button>
            </div>
          </div>
        </div>
      )}

      <Section title="显示名称" defaultOpen={true}>
        <div>
          <p className="text-xs text-stone-400 mb-3">在这个世界的对话中使用的名字。留空则使用全局默认。</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-stone-500 mb-1 block">你的角色名</label><input type="text" value={world.displayNames.user} onChange={e => updateDisplayName('user', e.target.value)} placeholder="使用全局默认" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
            <div><label className="text-xs text-stone-500 mb-1 block">AI 角色名</label><input type="text" value={world.displayNames.assistant} onChange={e => updateDisplayName('assistant', e.target.value)} placeholder="使用全局默认" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
          </div>
        </div>
      </Section>

      <Section title="世界观 / 角色 / NPC" defaultOpen={true}>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">世界观</h3>
          <p className="text-xs text-stone-400 mb-2">这个世界的背景设定、时代、地点、规则。</p>
          <textarea value={world.setting.worldview} onChange={e => updateSetting('worldview', e.target.value)} placeholder="描述这个世界的背景..." className="w-full h-40 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">我的角色</h3>
          <p className="text-xs text-stone-400 mb-2">你在这个世界里扮演的角色。</p>
          <div className="space-y-3">
            <div><label className="text-xs text-stone-500 mb-1 block">角色名</label><input type="text" value={world.setting.myCharacter.name} onChange={e => updateCharacter('name', e.target.value)} placeholder="角色名称" className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors" /></div>
            <div><label className="text-xs text-stone-500 mb-1 block">外貌</label><textarea value={world.setting.myCharacter.appearance} onChange={e => updateCharacter('appearance', e.target.value)} placeholder="外貌描述..." className="w-full h-20 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" /></div>
            <div><label className="text-xs text-stone-500 mb-1 block">性格</label><textarea value={world.setting.myCharacter.personality} onChange={e => updateCharacter('personality', e.target.value)} placeholder="性格特点..." className="w-full h-20 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" /></div>
            <div><label className="text-xs text-stone-500 mb-1 block">能力</label><textarea value={world.setting.myCharacter.abilities} onChange={e => updateCharacter('abilities', e.target.value)} placeholder="能力/技能..." className="w-full h-20 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" /></div>
            <div><label className="text-xs text-stone-500 mb-1 block">关系</label><textarea value={world.setting.myCharacter.relationships} onChange={e => updateCharacter('relationships', e.target.value)} placeholder="与其他角色的关系..." className="w-full h-20 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" /></div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div><h3 className="text-sm font-medium text-stone-600">NPC 角色列表</h3><p className="text-xs text-stone-400 mt-0.5">这个世界中的重要NPC。</p></div>
            <button onClick={addNpc} className="px-3 py-1.5 text-xs rounded-md bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors">+ 添加NPC</button>
          </div>
          {world.setting.npcs.length === 0 ? (
            <div className="text-sm text-stone-400 py-4 text-center">还没有添加NPC。</div>
          ) : (
            <div className="space-y-2">
              {world.setting.npcs.map(npc => (
                <NpcCard key={npc.id} npc={npc} onUpdate={(field, value) => updateNpc(npc.id, field, value)} onDelete={() => deleteNpc(npc.id)} />
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section title="规则 / 写作偏好">
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">特殊规则</h3>
          <p className="text-xs text-stone-400 mb-2">恐怖尺度、叙事限制、禁止事项等。</p>
          <textarea value={world.setting.specialRules} onChange={e => updateSetting('specialRules', e.target.value)} placeholder="这个世界的特殊规则..." className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">写作偏好</h3>
          <p className="text-xs text-stone-400 mb-2">叙事视角、语言风格、节奏要求等。</p>
          <textarea value={world.setting.writingPreferences} onChange={e => updateSetting('writingPreferences', e.target.value)} placeholder="叙事视角、语言风格..." className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-1">总结指令</h3>
          <p className="text-xs text-stone-400 mb-2">本世界专用的章节总结prompt。留空使用全局默认。</p>
          <textarea value={world.setting.summaryPrompt} onChange={e => updateSetting('summaryPrompt', e.target.value)} placeholder="留空使用全局默认总结指令..." className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors" />
        </div>
      </Section>

      <Section title="已完成剧情">
        <div>
          <p className="text-xs text-stone-400 mb-3">已归档的章节摘要。可折叠、编辑、重新总结或查看原始对话。</p>
          {world.setting.completedChapters.length === 0 ? (
            <div className="text-sm text-stone-400 py-4 text-center">还没有归档任何章节。在对话中点击"总结本章并归档"来创建。</div>
          ) : (
            <div className="space-y-3">
              {world.setting.completedChapters.map((chapter, index) => (
                <ChapterCard key={chapter.id} chapter={chapter} index={index}
                  onUpdateTitle={(title) => { const ch = [...world.setting.completedChapters]; ch[index] = { ...ch[index], title }; setWorld({ ...world, setting: { ...world.setting, completedChapters: ch } }) }}
                  onUpdateSummary={(summary) => { const ch = [...world.setting.completedChapters]; ch[index] = { ...ch[index], summary }; setWorld({ ...world, setting: { ...world.setting, completedChapters: ch } }) }}
                  onDelete={() => { if (confirm(`确定删除「${chapter.title}」吗？`)) { setWorld({ ...world, setting: { ...world.setting, completedChapters: world.setting.completedChapters.filter((_, i) => i !== index) } }) } }}
                />
              ))}
            </div>
          )}
        </div>
      </Section>

    </div>
  )
}
