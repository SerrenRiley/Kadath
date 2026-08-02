import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { type Message, type MessageVersion, type TokenUsage } from '../types/chat'
import { type AppSettings, defaultSettings } from '../types/settings'
import { sendMessageStream, fetchModels, sendSummary, rollDice } from '../stores/api'
import { getWorld, updateWorld } from '../stores/worlds'

function getChatKey(wid?: string) { return wid ? `kadath-chat-${wid}` : 'kadath-main-chat' }
function loadMessages(wid?: string): Message[] { const s = localStorage.getItem(getChatKey(wid)); return s ? JSON.parse(s) : [] }
function loadDisplayNames() { const s = localStorage.getItem('kadath-settings'); if (s) { const p: AppSettings = { ...defaultSettings, ...JSON.parse(s), displayNames: { ...defaultSettings.displayNames, ...(JSON.parse(s).displayNames || {}) } }; return p.displayNames }; return defaultSettings.displayNames }
function formatDuration(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s` }
function formatDateTime(ts: number) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}` }
function getActiveVersion(msg: Message): { content: string; thinking?: string; usage?: TokenUsage } { if (msg.versions?.length && msg.activeVersion !== undefined) { const v = msg.versions[msg.activeVersion]; return { content: v.content, thinking: v.thinking, usage: v.usage } }; return { content: msg.content, thinking: msg.thinking, usage: msg.usage } }
function Avatar({ name, isUser, avatar }: { name: string; isUser: boolean; avatar?: string }) {
  if (avatar) return <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  return <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isUser ? 'bg-stone-200 text-stone-600' : 'bg-stone-700 text-stone-100'}`}>{(name || '?').charAt(0).toUpperCase()}</div>
}

export default function WorldChat() {
  const { id: worldId } = useParams()
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(worldId))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [thinkingOpen, setThinkingOpen] = useState<Record<string, boolean>>({})
  const [usageOpen, setUsageOpen] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [summaryTitle, setSummaryTitle] = useState('')
  const [summaryContent, setSummaryContent] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [oocMode, setOocMode] = useState(false)
  const [pendingImages, setPendingImages] = useState<{ data: string; type: string }[]>([])
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [diceResults, setDiceResults] = useState<string[]>([])
  const [showDice, setShowDice] = useState(false)
  const [rollingDice, setRollingDice] = useState(false)
  const [expandedDice, setExpandedDice] = useState<number | null>(null)
  const [chapters, setChapters] = useState<{ id: string; title: string; summary: string }[]>([])
  const [viewingChapter, setViewingChapter] = useState<{ title: string; summary: string } | null>(null)
  const [, setQuickModel] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [modelHistory, setModelHistory] = useState<string[]>(() => { const s = localStorage.getItem('kadath-model-history'); return s ? JSON.parse(s) : [] })
  const [modelLoading, setModelLoading] = useState(false)
  const [showThinkingPicker, setShowThinkingPicker] = useState(false)
  const [streamOn, setStreamOn] = useState(() => { const s = localStorage.getItem('kadath-settings'); if (s) { return JSON.parse(s).streamEnabled !== false }; return true })
  const [thinkingLevel, setThinkingLevel] = useState(() => { const s = localStorage.getItem('kadath-settings'); if (s) { return JSON.parse(s).thinkingLevel || 'default' }; return 'default' })
  function cleanContent(content: string, hasThinking: boolean): string {
    if (!hasThinking) return content
    return content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim()
  }

  function extractThinkFromContent(content: string): { thinking: string; clean: string } {
    const match = content.match(/<think>([\s\S]*?)<\/think>/)
    if (match) {
      const clean = content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      return { thinking: match[1].trim(), clean }
    }
    return { thinking: '', clean: content }
  }

  const dn = loadDisplayNames()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreamingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { setMessages(loadMessages(worldId)) }, [worldId])
  useEffect(() => {
    if (worldId) {
      const world = getWorld(worldId)
      if (world) setChapters(world.setting.completedChapters.map(ch => ({ id: ch.id, title: ch.title, summary: ch.summary })))
    }
  }, [worldId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (!isStreamingRef.current) localStorage.setItem(getChatKey(worldId), JSON.stringify(messages)) }, [messages, worldId])
  const autoResize = useCallback(() => { const t = textareaRef.current; if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 124) + 'px' }, [])
  useEffect(() => { autoResize() }, [input, autoResize])
  useEffect(() => { if (expanded && expandedTextareaRef.current) { expandedTextareaRef.current.focus(); const l = expandedTextareaRef.current.value.length; expandedTextareaRef.current.setSelectionRange(l, l) } }, [expanded])
  useEffect(() => { if (editingId && editTextareaRef.current) { editTextareaRef.current.focus(); const l = editTextareaRef.current.value.length; editTextareaRef.current.setSelectionRange(l, l) } }, [editingId])

  function handleStop() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
  }

  function handleDelete(msgId: string) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const isUser = msg.role === 'user'

    if (isUser && msg.versions && msg.versions.length > 1) {
      if (!confirm('确定要删除当前版本吗？')) return
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.versions) return m
        const currentIdx = m.activeVersion ?? 0
        const newVersions = m.versions.filter((_, i) => i !== currentIdx)
        const newActive = Math.min(currentIdx, newVersions.length - 1)
        return { ...m, content: newVersions[newActive].content, versions: newVersions, activeVersion: newActive }
      }))
    } else if (isUser) {
      if (!confirm('确定要删除这条消息吗？下方的AI回复也会一并删除。')) return
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msgId)
        if (idx === -1) return prev
        const next = prev[idx + 1]
        if (next && next.role === 'assistant') return prev.filter(m => m.id !== msgId && m.id !== next.id)
        return prev.filter(m => m.id !== msgId)
      })
    } else {
      if (!confirm('确定要删除这条回复吗？')) return
      setMessages(prev => prev.filter(m => m.id !== msgId))
    }
  }

  function toggleThinking(id: string) { setThinkingOpen(p => ({ ...p, [id]: !p[id] })) }
  function toggleUsage(id: string) { setUsageOpen(p => ({ ...p, [id]: !p[id] })) }
  async function handleCopy(c: string, id: string) { await navigator.clipboard.writeText(c); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) }
  function switchVersion(id: string, dir: number) { setMessages(p => p.map(m => { if (m.id !== id || !m.versions) return m; const ni = (m.activeVersion || 0) + dir; if (ni < 0 || ni >= m.versions.length) return m; return { ...m, activeVersion: ni } })) }
  function startEdit(msg: Message) { setEditingId(msg.id); setEditText(msg.content) }
  function cancelEdit() { setEditingId(null); setEditText('') }

  function toggleStream() { const nv = !streamOn; setStreamOn(nv); const s = localStorage.getItem('kadath-settings'); if (s) { const p = JSON.parse(s); p.streamEnabled = nv; localStorage.setItem('kadath-settings', JSON.stringify(p)) } }
  function setThinking(level: string) { setThinkingLevel(level); setShowThinkingPicker(false); const s = localStorage.getItem('kadath-settings'); if (s) { const p = JSON.parse(s); p.thinkingLevel = level; localStorage.setItem('kadath-settings', JSON.stringify(p)) } }
  function applyModelOverride(model: string) { if (!model) return; setQuickModel(model); setShowModelPicker(false); setModelSearch(''); const s = localStorage.getItem('kadath-settings'); if (s) { const p = JSON.parse(s); p.chatModel.modelName = model; localStorage.setItem('kadath-settings', JSON.stringify(p)) }; const nh = [model, ...modelHistory.filter(m => m !== model)].slice(0, 5); setModelHistory(nh); localStorage.setItem('kadath-model-history', JSON.stringify(nh)) }
  async function openModelPicker() { setShowModelPicker(!showModelPicker); setShowThinkingPicker(false); setModelSearch(''); if (!showModelPicker && modelList.length === 0) { setModelLoading(true); const models = await fetchModels(); setModelList(models); setModelLoading(false) } }

  async function handleSummarize() {
    if (messages.length === 0 || summarizing) return
    setSummarizing(true)
    try {
      const chatContent = messages.map(m => `${m.role === 'user' ? dn.user : dn.assistant}: ${m.content}`).join('\n\n')
      const summary = await sendSummary(chatContent)
      setSummaryTitle(`第${(worldId ? (getWorld(worldId)?.setting.completedChapters.length || 0) : 0) + 1}章`)
      setSummaryContent(summary); setShowSummary(true)
    } catch (err) { setError(err instanceof Error ? err.message : '总结失败') }
    finally { setSummarizing(false) }
  }

  function confirmArchive() {
    if (!worldId || !summaryContent.trim()) return
    const world = getWorld(worldId); if (!world) return
    const newChapter = { id: crypto.randomUUID(), title: summaryTitle.trim() || '未命名章节', summary: summaryContent, originalMessages: JSON.stringify(messages) }
    updateWorld({ ...world, setting: { ...world.setting, completedChapters: [...world.setting.completedChapters, newChapter] }, updatedAt: Date.now() })
    setMessages([]); localStorage.removeItem(getChatKey(worldId)); setShowSummary(false); setSummaryTitle(''); setSummaryContent('')
    const refreshed = getWorld(worldId)
    if (refreshed) setChapters(refreshed.setting.completedChapters.map(ch => ({ id: ch.id, title: ch.title, summary: ch.summary })))
  }

  async function submitEdit(msgId: string) {
    const t = editText.trim(); if (!t || loading) return
    const mi = messages.findIndex(m => m.id === msgId); if (mi === -1) return
    const oldMsg = messages[mi]
    setEditingId(null); setEditText('')

    let userVersions: MessageVersion[] = []
    if (oldMsg.versions?.length) {
      userVersions = [...oldMsg.versions]
    } else {
      userVersions = [{ id: crypto.randomUUID(), content: oldMsg.content }]
    }
    userVersions.push({ id: crypto.randomUUID(), content: t })
    const userActiveIndex = userVersions.length - 1

    let um = messages.map((m, i) => i === mi ? { ...m, content: t, versions: userVersions, activeVersion: userActiveIndex } : m)

    const nai = mi + 1; const nm = um[nai]
    if (nm && nm.role === 'assistant') {
      const api = um.slice(0, nai); let vs: MessageVersion[] = []
      if (nm.versions?.length) vs = [...nm.versions]; else if (nm.content) vs = [{ id: crypto.randomUUID(), content: nm.content, thinking: nm.thinking, usage: nm.usage }]
      vs.push({ id: crypto.randomUUID(), content: '', thinking: '' }); const nvi = vs.length - 1
      setMessages(um.map((m, i) => i === nai ? { ...m, versions: vs, activeVersion: nvi } : m)); await streamToVersion(nm.id, nai, nvi, api)
    } else setMessages(um)
  }

  async function handleRegenerate(msgId: string) {
    if (loading) return; const mi = messages.findIndex(m => m.id === msgId); if (mi === -1) return
    const tm = messages[mi]; const before = messages.slice(0, mi); let vs: MessageVersion[] = []
    if (tm.versions?.length) vs = [...tm.versions]; else vs = [{ id: crypto.randomUUID(), content: tm.content, thinking: tm.thinking, usage: tm.usage }]
    vs.push({ id: crypto.randomUUID(), content: '', thinking: '' }); const nvi = vs.length - 1
    setMessages(p => p.map((m, i) => i === mi ? { ...m, versions: vs, activeVersion: nvi } : m)); await streamToVersion(msgId, mi, nvi, before)
  }

  async function streamToVersion(msgId: string, mi: number, vi: number, apiMsgs: Message[]) {
    setLoading(true); setError(''); isStreamingRef.current = true; setThinkingOpen(p => ({ ...p, [msgId]: true }))
    abortRef.current = new AbortController()
    try { await sendMessageStream(apiMsgs,
      c => { setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, thinking: (v.thinking||'')+c } : v) } })) },
      c => { setThinkingOpen(p => ({ ...p, [msgId]: false })); setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, content: v.content+c } : v) } })) },
      u => { setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, usage: u } : v) } })) },
      abortRef.current.signal,
    ) } catch (e) { if (e instanceof Error && e.name === 'AbortError') { /* 用户主动停止 */ } else { setError(e instanceof Error ? e.message : '生成失败') } }
    finally {
      setLoading(false); isStreamingRef.current = false
      setMessages(p => {
        const cleaned = p.map(m => {
          if (m.role !== 'assistant') return m
          if (m.thinking && m.content) {
            const cleanedContent = m.content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim()
            return { ...m, content: cleanedContent }
          }
          if (m.versions) {
            const cleanedVersions = m.versions.map(v => {
              if (v.thinking && v.content) {
                return { ...v, content: v.content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim() }
              }
              return v
            })
            return { ...m, versions: cleanedVersions }
          }
          return m
        })
        localStorage.setItem(getChatKey(worldId), JSON.stringify(cleaned))
        return cleaned
      })
    }
  }

  async function handleSend() {
    const t = input.trim(); if (!t || loading) return
    const um: Message = { id: crypto.randomUUID(), role: 'user', content: t, timestamp: Date.now(), images: pendingImages.length > 0 ? [...pendingImages] : undefined }
    setPendingImages([])
    const aid = crypto.randomUUID(); const am: Message = { id: aid, role: 'assistant', content: '', thinking: '', timestamp: Date.now() }
    setMessages(p => [...p, um, am]); setInput(''); setExpanded(false); setLoading(true); setError(''); isStreamingRef.current = true; setThinkingOpen(p => ({ ...p, [aid]: true }))
    try {
      let contextMessages: Message[] = []
      if (worldId) {
        const world = getWorld(worldId)
        if (world && world.setting.completedChapters.length > 0) {
          const archiveSummary = world.setting.completedChapters.map(ch => `【${ch.title}】\n${ch.summary}`).join('\n\n')
          contextMessages.push({ id: 'archive', role: 'system', content: `以下是之前章节的摘要：\n\n${archiveSummary}`, timestamp: 0 })
        }
      }
      abortRef.current = new AbortController()
      if (oocMode) {
        const oocSettings = localStorage.getItem('kadath-settings')
        const oocPrompt = oocSettings ? (JSON.parse(oocSettings).oocPrompt || '用户接下来的消息是戏外对话（OOC）。请以真实身份回应。') : '用户接下来的消息是戏外对话（OOC）。请以真实身份回应。'
        contextMessages.push({ id: 'ooc', role: 'system', content: oocPrompt, timestamp: 0 })
      }
      await sendMessageStream([...contextMessages, ...messages, um],
        c => { setMessages(p => p.map(m => m.id === aid ? { ...m, thinking: (m.thinking||'')+c } : m)) },
        c => { setThinkingOpen(p => ({ ...p, [aid]: false })); setMessages(p => p.map(m => m.id === aid ? { ...m, content: m.content+c } : m)) },
        u => { setMessages(p => p.map(m => m.id === aid ? { ...m, usage: u } : m)) },
        abortRef.current.signal,
      )
    } catch (e) { if (e instanceof Error && e.name === 'AbortError') { /* 用户主动停止 */ } else { setError(e instanceof Error ? e.message : '发送失败') } }
    finally {
      setLoading(false); isStreamingRef.current = false
      setMessages(p => {
        const cleaned = p.map(m => {
          if (m.role !== 'assistant') return m
          if (m.thinking && m.content) {
            const cleanedContent = m.content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim()
            return { ...m, content: cleanedContent }
          }
          if (m.versions) {
            const cleanedVersions = m.versions.map(v => {
              if (v.thinking && v.content) {
                return { ...v, content: v.content.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim() }
              }
              return v
            })
            return { ...m, versions: cleanedVersions }
          }
          return m
        })
        localStorage.setItem(getChatKey(worldId), JSON.stringify(cleaned))
        return cleaned
      })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  function handleImageSelect(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        setPendingImages(prev => [...prev, { data: reader.result as string, type: file.type }])
      }
      reader.readAsDataURL(file)
    })
  }

  function removePendingImage(index: number) {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  async function handleRollDice() {
    if (messages.length === 0 || rollingDice) return
    setRollingDice(true); setShowDice(true); setDiceResults([]); setExpandedDice(null)
    try {
      const s = localStorage.getItem('kadath-settings')
      const count = s ? (JSON.parse(s).dice?.count || 2) : 2
      const results = await rollDice(messages, count)
      setDiceResults(results)
    } catch (err) { setError(err instanceof Error ? err.message : '掷骰失败'); setShowDice(false) }
    finally { setRollingDice(false) }
  }

  function selectDiceResult(result: string) {
    setShowDice(false); setDiceResults([]); setExpandedDice(null)
    setInput(prev => (prev ? prev + '\n' : '') + `[骰子选择] ${result}\n请按照这个方向继续推进剧情。`)
  }

  const thinkingLabels: Record<string, string> = { off: '关闭', light: '轻度', default: '默认', deep: '深度' }
  const CopyBtn = ({ id, content }: { id: string; content: string }) => (
    <button onClick={() => handleCopy(content, id)} className="text-stone-300 hover:text-stone-500 transition-colors" title="复制">
      {copiedId === id ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
    </button>
  )
  const mdComponents = {
    p: ({ children }: any) => <p className="mb-3 last:mb-0">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    hr: () => <hr className="my-4 border-stone-200" />,
    h1: ({ children }: any) => <h1 className="text-lg font-medium mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-medium mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-3">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-stone-300 pl-3 my-3 text-stone-500 italic">{children}</blockquote>,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {worldId && chapters.length > 0 && (
          <div className="max-w-3xl mx-auto mb-4">
            <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
              <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-xs text-stone-500 font-medium">已完成章节</div>
              <div className="max-h-32 overflow-y-auto">
                {chapters.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setViewingChapter({ title: ch.title, summary: ch.summary })}
                    className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-b-0 truncate"
                  >
                    {ch.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.length === 0 && <div className="text-center text-stone-400 text-sm pt-20">说点什么吧。</div>}
        {messages.map((msg, msgIndex) => {
          const floor = msgIndex + 1
          const a = msg.role === 'assistant' ? getActiveVersion(msg) : null
          const userActive = msg.role === 'user' && msg.versions?.length ? msg.versions[msg.activeVersion ?? 0] : null
          let rawContent = a ? a.content : (userActive ? userActive.content : msg.content)
          let rawThinking = a ? a.thinking : msg.thinking
          const du = a ? a.usage : msg.usage

          // 如果thinking已经有内容（来自reasoning_content字段），清理content里重复的<think>标签
          // 如果thinking没有内容，尝试从content里提取<think>标签
          let dc: string, dt: string | undefined
          if (rawThinking) {
            dc = cleanContent(rawContent, true)
            dt = rawThinking
          } else {
            const extracted = extractThinkFromContent(rawContent)
            dc = extracted.clean
            dt = extracted.thinking || undefined
          }
          const tv = msg.versions?.length || 0, cv = msg.activeVersion ?? 0
          const ie = editingId === msg.id, iu = msg.role === 'user', name = iu ? dn.user : dn.assistant
          return (
            <div key={msg.id} className="group max-w-3xl mx-auto">
              <div className={`flex items-start gap-2.5 mb-3 ${iu ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar name={name} isUser={iu} avatar={iu ? dn.userAvatar : dn.assistantAvatar} />
                <div className={iu ? 'text-right' : 'text-left'}>
                  <div className="text-xs text-stone-600 font-medium">{name}</div>
                  <div className="text-xs text-stone-300">{formatDateTime(msg.timestamp)}</div>
                </div>
              </div>
              <div className={iu ? 'flex flex-col items-end' : ''}>
                {dt && <div className="mb-3 w-full">
                  <button onClick={() => toggleThinking(msg.id)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1"><span className={`inline-block transition-transform ${thinkingOpen[msg.id] ? 'rotate-90' : ''}`}>▶</span>思考过程</button>
                  {thinkingOpen[msg.id] && <div className="mt-2 p-3 rounded-lg bg-stone-100 text-xs text-stone-500 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{dt}</div>}
                </div>}
                {iu && ie ? (
                  <div className="space-y-2 w-full">
                    <textarea ref={editTextareaRef} value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id) } if (e.key === 'Escape') cancelEdit() }} className="w-full p-3 text-sm text-left rounded-lg border border-stone-300 bg-white resize-none focus:outline-none focus:border-stone-400 transition-colors" rows={3} />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
                      <button onClick={() => submitEdit(msg.id)} disabled={!editText.trim() || loading} className="px-3 py-1.5 text-xs rounded-md bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors">保存并重新生成</button>
                    </div>
                  </div>
                ) : (               
                  <div className={`text-sm leading-relaxed ${iu ? 'text-stone-600' : 'text-stone-800'}`}>{msg.images && msg.images.length > 0 && <div className="flex gap-2 mb-2 flex-wrap">{msg.images.map((img, i) => <img key={i} src={img.data} alt="" className="max-w-48 max-h-48 rounded-lg object-cover border border-stone-200 cursor-pointer" onClick={() => setViewingImage(img.data)} />)}</div>}<ReactMarkdown components={mdComponents}>{iu ? dc : dc.replace(/<br\s*\/?>/gi, '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim()}</ReactMarkdown></div>
                )}
                {iu && !ie && msg.content && (
                  <div className="mt-2 flex justify-end">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyBtn id={msg.id} content={msg.content} />
                      <button onClick={() => startEdit(msg)} className="text-stone-300 hover:text-stone-500 transition-colors" title="编辑"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                      <button onClick={() => handleDelete(msg.id)} className="text-stone-300 hover:text-red-400 transition-colors" title="删除"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                      {tv > 1 && <div className="flex items-center gap-1 text-xs text-stone-400"><button onClick={() => switchVersion(msg.id, -1)} disabled={cv === 0} className="hover:text-stone-600 disabled:opacity-30 transition-colors">‹</button><span>{cv+1}/{tv}</span><button onClick={() => switchVersion(msg.id, 1)} disabled={cv === tv-1} className="hover:text-stone-600 disabled:opacity-30 transition-colors">›</button></div>}
                    </div>
                  </div>
                )}
                {!iu && (
                  <div className="mt-2 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyBtn id={msg.id} content={dc} />
                      <button onClick={() => handleRegenerate(msg.id)} disabled={loading} className="text-stone-300 hover:text-stone-500 disabled:opacity-40 transition-colors" title="重新生成"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg></button>
                      {tv > 1 && <div className="flex items-center gap-1 text-xs text-stone-400"><button onClick={() => switchVersion(msg.id, -1)} disabled={cv === 0} className="hover:text-stone-600 disabled:opacity-30 transition-colors">‹</button><span>{cv+1}/{tv}</span><button onClick={() => switchVersion(msg.id, 1)} disabled={cv === tv-1} className="hover:text-stone-600 disabled:opacity-30 transition-colors">›</button></div>}
                      <button onClick={() => handleDelete(msg.id)} className="text-stone-300 hover:text-red-400 transition-colors" title="删除"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                    { <div
 className="relative"><button onClick={() => toggleUsage(msg.id)} className="text-xs text-stone-300 hover:text-stone-500 transition-colors">{du ? du.totalTokens + ' tokens' : '#' + floor}</button>
                      {usageOpen[msg.id] && du && <div className="absolute bottom-6 right-0 p-2.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs text-stone-500 space-y-1 z-10 whitespace-nowrap"><div>楼层：#{floor}</div><div>输入：{du.promptTokens}
 tokens</div><div>输出：{du.completionTokens} tokens</div><div>用时：{formatDuration(du.duration)}</div></div>}</div>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {error && <div className="max-w-3xl mx-auto text-sm text-red-500">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-stone-200 p-3">
        <div className="max-w-2xl mx-auto mb-2 flex items-center gap-1 text-xs">
          <div className="relative">
            <button onClick={openModelPicker} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title="切换模型">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span className="max-w-28 truncate">{(() => { const s = localStorage.getItem('kadath-settings'); if (s) { return JSON.parse(s).chatModel?.modelName || '未设置' }; return '未设置' })()}</span>
            </button>
            {showModelPicker && <div className="absolute bottom-9 left-0 rounded-lg bg-white border border-stone-200 shadow-md z-20 w-72 max-h-80 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-stone-100"><input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="搜索或输入模型名称..." className="w-full p-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-stone-400" autoFocus onKeyDown={e => { if (e.key === 'Enter') applyModelOverride(modelSearch.trim()) }} /></div>
              <div className="flex-1 overflow-y-auto">
                {modelHistory.length > 0 && !modelSearch && <div className="px-2 pt-2"><div className="text-xs text-stone-400 px-2 pb-1">最近使用</div>{modelHistory.map(m => <button key={`h-${m}`} onClick={() => applyModelOverride(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>)}</div>}
                {modelLoading ? <div className="p-3 text-xs text-stone-400 text-center">加载模型列表...</div>
                  : modelList.length > 0 ? <div className="px-2 py-2">{!modelSearch && modelHistory.length > 0 && <div className="text-xs text-stone-400 px-2 pb-1 pt-1">全部模型</div>}{modelList.filter(m => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase())).map(m => <button key={m} onClick={() => applyModelOverride(m)} className="w-full text-left px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-50 rounded-md transition-colors truncate">{m}</button>)}{modelList.filter(m => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && <div className="px-2 py-2 text-xs text-stone-400">没有匹配的模型，按回车使用输入的名称</div>}</div>
                  : <div className="p-3 text-xs text-stone-400 text-center">按回车确认输入的模型名称</div>}
              </div>
            </div>}
          </div>
          <div className="relative">
            <button onClick={() => { setShowThinkingPicker(!showThinkingPicker); setShowModelPicker(false) }} className={`flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-stone-100 transition-colors ${thinkingLevel === 'off' ? 'text-stone-300' : thinkingLevel === 'light' ? 'text-amber-300' : thinkingLevel === 'deep' ? 'text-amber-500' : 'text-amber-400'}`} title="思考强度">
              <svg width="14" height="14" viewBox="0 0 24 24" fill={thinkingLevel === 'off' ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.46 12.26 8.93 13.02 9.09 14"/></svg>
            </button>
            {showThinkingPicker && <div className="absolute bottom-9 left-0 rounded-lg bg-white border border-stone-200 shadow-md z-20 overflow-hidden min-w-28">
              {['off', 'light', 'default', 'deep'].map(l => <button key={l} onClick={() => setThinking(l)} className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-stone-50 transition-colors ${thinkingLevel === l ? 'text-stone-800 font-medium bg-stone-50' : 'text-stone-500'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={l === 'off' ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={l === 'off' ? 'text-stone-300' : l === 'light' ? 'text-amber-300' : l === 'deep' ? 'text-amber-500' : 'text-amber-400'}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.46 12.26 8.93 13.02 9.09 14"/></svg>{thinkingLabels[l]}</button>)}
            </div>}
          </div>
          <button onClick={toggleStream} className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-stone-100 ${streamOn ? 'text-stone-600' : 'text-stone-300'}`} title={streamOn ? '流式输出：开' : '流式输出：关'}>流</button>
          {worldId && <button onClick={handleRollDice} disabled={rollingDice || loading || messages.length === 0} className="px-2 py-1.5 rounded-md text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-40 transition-colors" title="掷骰子生成剧情走向"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg></button>}
          {worldId && <Link to={`/world/${worldId}/edit`} className="px-2 py-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title="世界设定"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></Link>}
          {worldId && <button onClick={() => setOocMode(!oocMode)}
 className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-stone-100 ${oocMode ? 'text-orange-500' : 'text-stone-400 hover:text-stone-600'}`} title={oocMode ? 'OOC模式：开（点击切回RP）' : 'OOC模式：关（点击切换到戏外）'}>{oocMode ? 'OOC' : 'RP'}</button>}
        </div>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
                    {pendingImages.length > 0 && <div className="flex gap-2 mb-2 flex-wrap">{pendingImages.map((img, i) => <div key={i} className="relative group"><img src={img.data} alt="" className="w-16 h-16 rounded-lg object-cover border border-stone-200" /><button onClick={() => removePendingImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }}>×</button></div>)}</div>}
          <div className="relative flex-1">
                        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleImageSelect(e.target.files); e.target.value = '' }} />
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={oocMode ? '戏外对话模式...' : '输入消息...'} rows={1} className={`w-full pl-9 py-3 pr-9 text-sm rounded-lg border resize-none focus:outline-none transition-colors overflow-y-auto ${oocMode ? 'border-orange-300 bg-orange-50/30 focus:border-orange-400' : 'border-stone-200 bg-white focus:border-stone-400'}`} style={{ maxHeight: '124px' }} />
            <button onClick={() => imageInputRef.current?.click()} className="absolute top-3.5 left-2.5 text-stone-300 hover:text-stone-500 transition-colors" title="上传图片"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>
            <button onClick={() => setExpanded(true)} className="absolute top-2 right-2 text-stone-300 hover:text-stone-500 transition-colors" title="展开编辑"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg></button>
          </div>
          {loading ? (
            <button onClick={handleStop} className="mt-[-6px] w-9 h-9 shrink-0
 rounded-full flex items-center justify-center transition-colors" style={{ border: '2px solid var(--danger)', color: 'var(--danger)' }} title="停止生成">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} className="mt-[-6px] w-9 h-9 shrink-0
 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors" style={{ border: '2px solid var(--btn-bg)', color: 'var(--btn-bg)' }} title="发送">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          )}
        </div>
                {worldId && messages.length > 0 && <div className="max-w-2xl mx-auto mt-1 flex justify-end"><button onClick={() => { const d = loadDisplayNames(); let md = '# 对话记录\n\n'; messages.forEach(m => { md += `**${m.role === 'user' ? (d.user || 'You') : (d.assistant || 'AI')}**\n\n${m.content}\n\n---\n\n` }); const b = new Blob([md], { type: 'text/markdown' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `对话记录-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(u) }} className="text-xs text-stone-400 hover:text-stone-600 transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-0.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>导出对话</button></div>}

        {worldId && messages.length > 0 && <div className="max-w-2xl mx-auto mt-2 flex justify-end"><button onClick={handleSummarize} disabled={summarizing || loading} className="text-xs text-stone-400 hover:text-stone-600 disabled:opacity-40 transition-colors"><span className="flex items-center gap-1">{summarizing ? '正在总结...' : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> 总结本章并归档</>}</span></button>
</div>}
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showDice && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-6" onClick={() => { if (!rollingDice) { setShowDice(false); setDiceResults([]); setExpandedDice(null) } }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm text-stone-700 font-medium"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>剧情走向</span>
              {!rollingDice && <button onClick={() => { setShowDice(false); setDiceResults([]); setExpandedDice(null) }} className="text-stone-400 hover:text-stone-600 transition-colors text-sm">取消</button>}
            </div>
            <div className="p-4">
              {rollingDice ? (
                <div className="text-center text-stone-400 text-sm py-8">正在投掷骰子...</div>
              ) : diceResults.length > 0 ? (
                <div className="space-y-2">
                  {diceResults.map((result, idx) => (
                    <div key={idx} className="rounded-lg border border-stone-200 overflow-hidden">
                      <div className="flex items-center justify-between p-3 hover:bg-stone-50 transition-colors">
                        <button onClick={() => setExpandedDice(expandedDice === idx ? null : idx)} className="flex-1 text-left text-sm text-stone-600 truncate">{idx + 1}. {result.slice(0, 15)}{result.length > 15 ? '...' : ''}</button>
                        <button onClick={() => selectDiceResult(result)} className="ml-2 w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-green-600 hover:bg-green-50 transition-colors shrink-0" title="选择此走向">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                      </div>
                      {expandedDice === idx && (
                        <div className="px-3 pb-3 text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-2">{result}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-stone-400 text-sm py-8">没有生成结果。</div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingChapter && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-6" onClick={() => setViewingChapter(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm text-stone-700 font-medium">{viewingChapter.title}</span>
              <button onClick={() => setViewingChapter(null)} className="text-stone-400 hover:text-stone-600 transition-colors text-sm">关闭</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {viewingChapter.summary}
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex flex-col">
          <div className="flex-1 flex flex-col m-4 sm:m-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm text-stone-600 font-medium">章节总结预览</span>
              <button onClick={() => setShowSummary(false)} className="text-stone-400 hover:text-stone-600 transition-colors text-sm">取消</button>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div><label className="text-xs text-stone-500 mb-1 block">章节标题</label><input type="text" value={summaryTitle} onChange={e => setSummaryTitle(e.target.value)} placeholder="给这一章起个标题..." className="w-full p-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 transition-colors" /></div>
              <div><label className="text-xs text-stone-500 mb-1 block">摘要内容（可编辑）</label><textarea value={summaryContent} onChange={e => setSummaryContent(e.target.value)} className="w-full h-64 p-3 text-sm rounded-lg border border-stone-200 resize-y focus:outline-none focus:border-stone-400 transition-colors leading-relaxed" /></div>
              <div className="text-xs text-stone-400">确认归档后，当前对话将被清空，摘要将保存到世界设定的"已完成剧情"中。原始对话记录会完整保留，可随时查看。</div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-3 border-t border-stone-200">
              <button onClick={() => setShowSummary(false)} className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
              <button onClick={confirmArchive} disabled={!summaryContent.trim()} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors">确认归档</button>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex flex-col">
          <div className="flex-1 flex flex-col m-4 sm:m-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm text-stone-500">编辑消息</span>
              <button onClick={() => setExpanded(false)} className="text-stone-400 hover:text-stone-600 transition-colors" title="收起"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg></button>
            </div>
            <textarea ref={expandedTextareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } if (e.key === 'Escape') setExpanded(false) }} placeholder="输入消息..." className="flex-1 p-5 text-sm resize-none focus:outline-none leading-relaxed" />
            <div className="flex justify-end gap-3 px-5 py-3 border-t border-stone-200">
              <button onClick={() => setExpanded(false)} className="px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">收起</button>
              <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors">发送</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
