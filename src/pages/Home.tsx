import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type World } from '../types/world'
import { loadWorlds, addWorld, deleteWorld } from '../stores/worlds'
import { type AppSettings, defaultSettings } from '../types/settings'

function getAssistantName(): string {
  const saved = localStorage.getItem('kadath-settings')
  if (saved) { const s: AppSettings = { ...defaultSettings, ...JSON.parse(saved) }; return s.displayNames?.assistant || 'Simon' }
  return 'Simon'
}

export default function Home() {
  const [worlds, setWorlds] = useState<World[]>(loadWorlds)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const aiName = getAssistantName()

  function handleCreate() { const n = newName.trim(); if (!n) return; addWorld(n); setWorlds(loadWorlds()); setNewName(''); setShowCreate(false) }
  function handleDelete(id: string, name: string) { if (confirm(`确定要删除「${name}」吗？删除后无法恢复。`)) { deleteWorld(id); setWorlds(loadWorlds()) } }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12 mb-8">
        <h1 className="text-5xl mb-3" style={{ fontFamily: "'Lavishly Yours', cursive", color: 'var(--accent)' }}>
          Kadath
        </h1>
        <p className="text-sm italic tracking-wide" style={{ color: 'var(--text-tertiary)', fontFamily: "'Lavishly Yours', cursive", fontSize: '1.1rem' }}>
          Through secret realms, find where you belong.
        </p>
      </div>

      <div className="mb-6 text-center">
        <Link to="/chat" className="inline-block px-5 py-2.5 text-sm rounded-lg border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          与 {aiName} 本体对话
        </Link>
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
          {worlds.map(world => (
            <div key={world.id} className="group flex items-center justify-between py-3 px-4 rounded-lg border transition-all hover:shadow-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{world.name}</span>
              <div className="flex gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to={`/world/${world.id}/chat`} className="px-2.5 py-1 rounded-md transition-colors" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>对话</Link>
                <Link to={`/world/${world.id}/edit`} className="px-2.5 py-1 rounded-md border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>设定</Link>
                <button onClick={() => handleDelete(world.id, world.name)} className="px-2.5 py-1 rounded-md border transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
