import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type World } from '../types/world'
import { loadWorlds, addWorld, deleteWorld, togglePin } from '../stores/worlds'
import { type AppSettings, defaultSettings } from '../types/settings'

function getAssistantName(): string {
  const saved = localStorage.getItem('kadath-settings')
  if (saved) { const s: AppSettings = { ...defaultSettings, ...JSON.parse(saved) }; return s.displayNames?.assistant || 'AI' }
  return 'AI'
}

export default function Home() {
  const [worlds, setWorlds] = useState<World[]>(loadWorlds)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [showSummaries, setShowSummaries] = useState(false)
  const [summaries, setSummaries] = useState<any[]>([])
  const [viewingSummary, setViewingSummary] = useState<any | null>(null)
  const [editingSummary, setEditingSummary] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [showOriginal, setShowOriginal] = useState<string | null>(null)
  const aiName = getAssistantName()

  function handleCreate() { const n = newName.trim(); if (!n) return; addWorld(n); setWorlds(loadWorlds()); setNewName(''); setShowCreate(false) }
  function handleDelete(id: string, name: string) { if (confirm(`确定要删除「${name}」吗？删除后无法恢复。`)) { deleteWorld(id); setWorlds(loadWorlds()) } }

  function openSummaries() {
    const data = JSON.parse(localStorage.getItem('kadath-main-summaries') || '[]')
    setSummaries(data)
    setShowSummaries(true)
  }

  function saveSummaryEdit(id: string) {
    const updated = summaries.map(s => s.id === id ? { ...s, title: editTitle, summary: editContent } : s)
    setSummaries(updated)
    localStorage.setItem('kadath-main-summaries', JSON.stringify(updated))
    setEditingSummary(null)
  }

  function deleteSummary(id: string) {
    if (!confirm('确定要删除这条摘要吗？')) return
    const updated = summaries.filter(s => s.id !== id)
    setSummaries(updated)
    localStorage.setItem('kadath-main-summaries', JSON.stringify(updated))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12 mb-8">
        <h1 className="text-5xl mb-3" style={{ fontFamily: "'Lavishly Yours', cursive", color: 'var(--accent)' }}>Kadath</h1>
        <p className="text-sm italic tracking-wide" style={{ color: 'var(--text-tertiary)', fontFamily: "'Lavishly Yours', cursive", fontSize: '1.1rem' }}>Through secret realms, find where you belong.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3">
        <Link to="/chat" className="inline-block px-5 py-2.5 text-sm rounded-lg border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>与 {aiName} 本体对话</Link>
        <button onClick={openSummaries} className="px-3 py-2.5 text-sm rounded-lg border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }} title="本体对话摘要">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>我的世界</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm rounded-lg transition-colors" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>+ 创建新世界</button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex gap-3">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="给你的新世界起个名字..." autoFocus className="flex-1 p-3 text-sm rounded-lg border focus:outline-none transition-colors" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 transition-colors" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>创建</button>
            <button onClick={() => { setShowCreate(false); setNewName('') }} className="px-4 py-2 text-sm rounded-lg border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>取消</button>
          </div>
        </div>
      )}

      {worlds.length === 0 ? (
        <div className="text-center text-sm py-16" style={{ color: 'var(--text-tertiary)' }}>还没有创建任何世界。点击上方按钮，开始你的第一段旅程。</div>
      ) : (
        <div className="space-y-2">
          {[...worlds].sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; if (a.pinned && b.pinned) return b.pinnedAt - a.pinnedAt; return 0 }).map(world => (
            <div key={world.id} className="group flex items-center justify-between py-3 px-4 rounded-lg border transition-all hover:shadow-sm" style={{ borderColor: world.pinned ? 'var(--accent)' : 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{world.name}</span>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => { togglePin(world.id); setWorlds(loadWorlds()) }} className="transition-colors opacity-60 hover:opacity-100" style={{ color: world.pinned ? 'var(--accent)' : 'var(--text-muted)' }} title={world.pinned ? '取消置顶' : '置顶'}>
                  {world.pinned ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 9h-6l3-9z"/><line x1="12" y1="11" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}><path d="M12 2l3 9h-6l3-9z"/><line x1="12" y1="11" x2="12" y2="22"/></svg>}
                </button>
                <div className="flex gap-2 opacity-60 hover:opacity-100 transition-opacity">
                  <Link to={`/world/${world.id}/chat`} className="px-2.5 py-1 rounded-md transition-colors" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>对话</Link>
                  <Link to={`/world/${world.id}/edit`} className="px-2.5 py-1 rounded-md border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>设定</Link>
                  <button onClick={() => handleDelete(world.id, world.name)} className="px-2.5 py-1 rounded-md border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSummaries && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4" onClick={() => { setShowSummaries(false); setEditingSummary(null); setShowOriginal(null) }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>本体对话摘要</span>
              <button onClick={() => { setShowSummaries(false); setEditingSummary(null); setShowOriginal(null) }} className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>关闭</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
              {summaries.length === 0 ? (
                <div className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>还没有压缩过对话。在本体对话中点击"压缩上下文"来创建。</div>
              ) : (
                <div className="space-y-2">
                  {summaries.map((s: any) => (
                    <div key={s.id} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                      <button onClick={() => setViewingSummary(viewingSummary?.id === s.id ? null : s)} className="w-full flex items-center justify-between p-3 transition-colors" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`inline-block transition-transform ${viewingSummary?.id === s.id ? 'rotate-90' : ''}`} style={{ color: 'var(--text-tertiary)' }}>▶</span>
                          <span style={{ fontWeight: 300 }}>{s.title}</span>
                        </div>
                      </button>
                      {viewingSummary?.id === s.id && (
                        <div className="border-t p-4 space-y-3" style={{ borderColor: 'var(--border-light)' }}>
                          {editingSummary === s.id ? (
                            <div className="space-y-3">
                              <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>标题</label><input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 text-sm rounded-md border focus:outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} /></div>
                              <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>摘要</label><textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full h-40 p-3 text-sm rounded-md border resize-y focus:outline-none leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} /></div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingSummary(null)} className="px-3 py-1.5 text-xs rounded-md border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>取消</button>
                                <button onClick={() => saveSummaryEdit(s.id)} className="px-3 py-1.5 text-xs rounded-md transition-colors" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>保存</button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{s.summary}</div>
                          )}
                          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                            {editingSummary !== s.id && <button onClick={() => { setEditingSummary(s.id); setEditTitle(s.title); setEditContent(s.summary) }} className="text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>编辑</button>}
                            <button onClick={() => setShowOriginal(showOriginal === s.id ? null : s.id)} className="text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>{showOriginal === s.id ? '收起原文' : '查看原文'}</button>
                            <button onClick={() => deleteSummary(s.id)} className="text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>删除</button>
                          </div>
                          {showOriginal === s.id && s.originalMessages && (
                            <div className="mt-3 p-3 rounded-lg max-h-64 overflow-y-auto space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              {JSON.parse(s.originalMessages).map((m: any, i: number) => (
                                <div key={i} className="text-xs">
                                  <div className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{m.role === 'user' ? 'You' : 'AI'}</div>
                                  <div className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{m.content}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
