import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type World } from '../types/world'
import { loadWorlds, addWorld, deleteWorld } from '../stores/worlds'

export default function Home() {
  const [worlds, setWorlds] = useState<World[]>(loadWorlds)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  function handleCreate() {
    const name = newName.trim()
    if (!name) return
    addWorld(name)
    setWorlds(loadWorlds())
    setNewName('')
    setShowCreate(false)
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`确定要删除「${name}」吗？删除后无法恢复。`)) {
      deleteWorld(id)
      setWorlds(loadWorlds())
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-light mb-2">Kadath</h1>
        <p className="text-sm text-stone-400">
          穿越诸多秘境，找到属于自己的地方。
        </p>
      </div>

      <div className="mb-6">
        <Link
          to="/chat"
          className="inline-block px-4 py-2 text-sm rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
        >
          与 Simon 本体对话
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-stone-700">我的世界</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
        >
          + 创建新世界
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 rounded-lg border border-stone-200 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="给你的新世界起个名字..."
              autoFocus
              className="flex-1 p-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors"
            >
              创建
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName('') }}
              className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {worlds.length === 0 ? (
        <div className="text-center text-stone-400 text-sm py-16">
          还没有创建任何世界。点击上方按钮，开始你的第一段旅程。
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {worlds.map(world => (
            <div
              key={world.id}
              className="group rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-stone-800 mb-3">{world.name}</h3>
              <div className="flex gap-2 text-xs">
                <Link
                  to={`/world/${world.id}/chat`}
                  className="px-3 py-1.5 rounded-md bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
                >
                  进入对话
                </Link>
                <Link
                  to={`/world/${world.id}/edit`}
                  className="px-3 py-1.5 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  编辑设定
                </Link>
                <button
                  onClick={() => handleDelete(world.id, world.name)}
                  className="px-3 py-1.5 rounded-md border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
