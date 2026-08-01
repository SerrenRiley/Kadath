import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { type World } from '../types/world'
import { getWorld, updateWorld } from '../stores/worlds'

function ChapterCard({ chapter, index, onUpdateTitle, onUpdateSummary, onDelete }: {
  chapter: { id: string; title: string; summary: string; originalMessages: string }
  index: number
  onUpdateTitle: (title: string) => void
  onUpdateSummary: (summary: string) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chapter.title)
  const [editSummary, setEditSummary] = useState(chapter.summary)

  function saveEdit() {
    onUpdateTitle(editTitle)
    onUpdateSummary(editSummary)
    setEditing(false)
  }

  let originalMessages: any[] = []
  try { originalMessages = JSON.parse(chapter.originalMessages) } catch {}

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          <span className="font-medium text-stone-700">{chapter.title}</span>
        </div>
        <span className="text-xs text-stone-400">第{index + 1}章</span>
      </button>
      {open && (
        <div className="border-t border-stone-100 p-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">标题</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-stone-400" />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">摘要</label>
                <textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} className="w-full h-48 p-3 text-sm rounded-md border border-stone-200 resize-y focus:outline-none focus:border-stone-400 leading-relaxed" />
              </div>
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
              {originalMessages.map((m: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="text-stone-400 mb-0.5">{m.role === 'user' ? 'You' : 'Simon'}</div>
                  <div className="text-stone-600 whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
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

  useEffect(() => {
    if (id) {
      const w = getWorld(id)
      if (w) setWorld(w)
    }
  }, [id])

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  function handleSave() {
    if (!world) return
    updateWorld({ ...world, updatedAt: Date.now() })
    setSaved(true)
  }

  function updateSetting<K extends keyof World['setting']>(key: K, value: World['setting'][K]) {
    if (!world) return
    setWorld({ ...world, setting: { ...world.setting, [key]: value } })
  }

  function updateCharacter(field: string, value: string) {
    if (!world) return
    setWorld({
      ...world,
      setting: {
        ...world.setting,
        myCharacter: { ...world.setting.myCharacter, [field]: value }
      }
    })
  }

  function updateDisplayName(field: 'user' | 'assistant', value: string) {
    if (!world) return
    setWorld({
      ...world,
      displayNames: { ...world.displayNames, [field]: value }
    })
  }

  if (!world) {
    return (
      <div className="p-6 text-center text-stone-400">
        <p>找不到这个世界。</p>
        <Link to="/" className="text-stone-600 hover:underline mt-2 inline-block">返回主世界</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-stone-400 hover:text-stone-600 transition-colors text-sm">← 返回</Link>
            <input
              type="text"
              value={world.name}
              onChange={e => setWorld({ ...world, name: e.target.value })}
              className="text-2xl font-light bg-transparent border-none outline-none focus:border-b focus:border-stone-300 transition-colors"
              style={{ minWidth: '100px', width: `${Math.max(world.name.length, 3)}ch` }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">编辑世界设定</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/world/${world.id}/chat`}
            className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            进入对话
          </Link>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
          >
            {saved ? '✓ 已保存' : '保存设定'}
          </button>
        </div>
      </div>

      {/* 显示名称 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">显示名称</h2>
        <p className="text-xs text-stone-400">在这个世界的对话中使用的名字。留空则使用全局设置的默认名字。</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">你的角色名</label>
            <input
              type="text"
              value={world.displayNames.user}
              onChange={e => updateDisplayName('user', e.target.value)}
              placeholder="使用全局默认"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">AI 角色名</label>
            <input
              type="text"
              value={world.displayNames.assistant}
              onChange={e => updateDisplayName('assistant', e.target.value)}
              placeholder="使用全局默认"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* 世界观 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">世界观</h2>
        <p className="text-xs text-stone-400">这个世界的背景设定、时代、地点、规则。</p>
        <textarea
          value={world.setting.worldview}
          onChange={e => updateSetting('worldview', e.target.value)}
          placeholder="描述这个世界的背景..."
          className="w-full h-40 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>

      {/* 我的角色 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">我的角色</h2>
        <p className="text-xs text-stone-400">你在这个世界里扮演的角色。</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">角色名</label>
            <input
              type="text"
              value={world.setting.myCharacter.name}
              onChange={e => updateCharacter('name', e.target.value)}
              placeholder="角色名称"
              className="w-full p-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">外貌</label>
            <textarea
              value={world.setting.myCharacter.appearance}
              onChange={e => updateCharacter('appearance', e.target.value)}
              placeholder="描述角色的外貌特征..."
              className="w-full h-24 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">性格</label>
            <textarea
              value={world.setting.myCharacter.personality}
              onChange={e => updateCharacter('personality', e.target.value)}
              placeholder="描述角色的性格特点..."
              className="w-full h-24 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">能力</label>
            <textarea
              value={world.setting.myCharacter.abilities}
              onChange={e => updateCharacter('abilities', e.target.value)}
              placeholder="描述角色的能力、技能、特殊力量..."
              className="w-full h-24 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">关系</label>
            <textarea
              value={world.setting.myCharacter.relationships}
              onChange={e => updateCharacter('relationships', e.target.value)}
              placeholder="与其他角色的关系..."
              className="w-full h-24 p-3 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* 特殊规则 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">特殊规则</h2>
        <p className="text-xs text-stone-400">恐怖尺度、叙事限制、禁止事项等。</p>
        <textarea
          value={world.setting.specialRules}
          onChange={e => updateSetting('specialRules', e.target.value)}
          placeholder="这个世界的特殊规则..."
          className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>

      {/* 写作偏好 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">写作偏好</h2>
        <p className="text-xs text-stone-400">叙事视角、语言风格、节奏要求等。</p>
        <textarea
          value={world.setting.writingPreferences}
          onChange={e => updateSetting('writingPreferences', e.target.value)}
          placeholder="叙事视角、语言风格..."
          className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>

      {/* 已完成剧情 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">已完成剧情</h2>
        <p className="text-xs text-stone-400">已归档的章节摘要。可折叠、编辑、重新总结或查看原始对话。</p>
        {world.setting.completedChapters.length === 0 ? (
          <div className="text-sm text-stone-400 py-4">还没有归档任何章节。在对话中点击"总结本章并归档"来创建。</div>
        ) : (
          <div className="space-y-3">
            {world.setting.completedChapters.map((chapter, index) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                index={index}
                onUpdateTitle={(title) => {
                  const chapters = [...world.setting.completedChapters]
                  chapters[index] = { ...chapters[index], title }
                  setWorld({ ...world, setting: { ...world.setting, completedChapters: chapters } })
                }}
                onUpdateSummary={(summary) => {
                  const chapters = [...world.setting.completedChapters]
                  chapters[index] = { ...chapters[index], summary }
                  setWorld({ ...world, setting: { ...world.setting, completedChapters: chapters } })
                }}
                onDelete={() => {
                  if (confirm(`确定要删除「${chapter.title}」吗？`)) {
                    const chapters = world.setting.completedChapters.filter((_, i) => i !== index)
                    setWorld({ ...world, setting: { ...world.setting, completedChapters: chapters } })
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 本世界总结指令 */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-stone-700">总结指令</h2>
        <p className="text-xs text-stone-400">本世界专用的章节总结prompt。留空则使用全局默认。</p>
        <textarea
          value={world.setting.summaryPrompt}
          onChange={e => updateSetting('summaryPrompt', e.target.value)}
          placeholder="留空使用全局默认总结指令..."
          className="w-full h-32 p-4 text-sm rounded-lg border border-stone-200 bg-white resize-y focus:outline-none focus:border-stone-400 transition-colors"
        />
      </section>

      {/* 底部保存 */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
        >
          {saved ? '✓ 已保存' : '保存设定'}
        </button>
      </div>
    </div>
  )
}
