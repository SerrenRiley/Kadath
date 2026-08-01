import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { type Message, type MessageVersion, type TokenUsage } from '../types/chat'
import { type AppSettings, defaultSettings } from '../types/settings'
import { sendMessageStream } from '../stores/api'

function getChatKey(worldId?: string) { return worldId ? `kadath-chat-${worldId}` : 'kadath-main-chat' }
function loadMessages(worldId?: string): Message[] { const s = localStorage.getItem(getChatKey(worldId)); if (s) return JSON.parse(s); return [] }
function loadDisplayNames() { const s = localStorage.getItem('kadath-settings'); if (s) { const p: AppSettings = { ...defaultSettings, ...JSON.parse(s) }; return p.displayNames || defaultSettings.displayNames }; return defaultSettings.displayNames }
function formatDuration(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function formatDateTime(ts: number) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}` }
function getActiveVersion(msg: Message): { content: string; thinking?: string; usage?: TokenUsage } { if (msg.versions && msg.versions.length > 0 && msg.activeVersion !== undefined) { const v = msg.versions[msg.activeVersion]; return { content: v.content, thinking: v.thinking, usage: v.usage } }; return { content: msg.content, thinking: msg.thinking, usage: msg.usage } }
function Avatar({ name, isUser }: { name: string; isUser: boolean }) { return <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isUser ? 'bg-stone-200 text-stone-600' : 'bg-stone-700 text-stone-100'}`}>{name.charAt(0).toUpperCase()}</div> }

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
  const dn = loadDisplayNames()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreamingRef = useRef(false)

  useEffect(() => { setMessages(loadMessages(worldId)) }, [worldId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (!isStreamingRef.current) localStorage.setItem(getChatKey(worldId), JSON.stringify(messages)) }, [messages, worldId])
  const autoResize = useCallback(() => { const t = textareaRef.current; if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 124) + 'px' }, [])
  useEffect(() => { autoResize() }, [input, autoResize])
  useEffect(() => { if (expanded && expandedTextareaRef.current) { expandedTextareaRef.current.focus(); const l = expandedTextareaRef.current.value.length; expandedTextareaRef.current.setSelectionRange(l, l) } }, [expanded])
  useEffect(() => { if (editingId && editTextareaRef.current) { editTextareaRef.current.focus(); const l = editTextareaRef.current.value.length; editTextareaRef.current.setSelectionRange(l, l) } }, [editingId])

  function toggleThinking(id: string) { setThinkingOpen(p => ({ ...p, [id]: !p[id] })) }
  function toggleUsage(id: string) { setUsageOpen(p => ({ ...p, [id]: !p[id] })) }
  async function handleCopy(c: string, id: string) { await navigator.clipboard.writeText(c); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) }
  function switchVersion(id: string, dir: number) { setMessages(p => p.map(m => { if (m.id !== id || !m.versions) return m; const ni = (m.activeVersion || 0) + dir; if (ni < 0 || ni >= m.versions.length) return m; return { ...m, activeVersion: ni } })) }
  function startEdit(msg: Message) { setEditingId(msg.id); setEditText(msg.content) }
  function cancelEdit() { setEditingId(null); setEditText('') }

  async function submitEdit(msgId: string) {
    const t = editText.trim(); if (!t || loading) return
    const mi = messages.findIndex(m => m.id === msgId); if (mi === -1) return
    const um = messages.map((m, i) => i === mi ? { ...m, content: t } : m)
    const nai = mi + 1; const nm = um[nai]; setEditingId(null); setEditText('')
    if (nm && nm.role === 'assistant') {
      const api = um.slice(0, nai); let vs: MessageVersion[] = []
      if (nm.versions && nm.versions.length > 0) vs = [...nm.versions]; else if (nm.content) vs = [{ id: crypto.randomUUID(), content: nm.content, thinking: nm.thinking, usage: nm.usage }]
      vs.push({ id: crypto.randomUUID(), content: '', thinking: '' }); const nvi = vs.length - 1
      setMessages(um.map((m, i) => i === nai ? { ...m, versions: vs, activeVersion: nvi } : m)); await streamToVersion(nm.id, nai, nvi, api)
    } else setMessages(um)
  }

  async function handleRegenerate(msgId: string) {
    if (loading) return; const mi = messages.findIndex(m => m.id === msgId); if (mi === -1) return
    const tm = messages[mi]; const before = messages.slice(0, mi); let vs: MessageVersion[] = []
    if (tm.versions && tm.versions.length > 0) vs = [...tm.versions]; else vs = [{ id: crypto.randomUUID(), content: tm.content, thinking: tm.thinking, usage: tm.usage }]
    vs.push({ id: crypto.randomUUID(), content: '', thinking: '' }); const nvi = vs.length - 1
    setMessages(p => p.map((m, i) => i === mi ? { ...m, versions: vs, activeVersion: nvi } : m)); await streamToVersion(msgId, mi, nvi, before)
  }

  async function streamToVersion(msgId: string, mi: number, vi: number, apiMsgs: Message[]) {
    setLoading(true); setError(''); isStreamingRef.current = true; setThinkingOpen(p => ({ ...p, [msgId]: true }))
    try { await sendMessageStream(apiMsgs,
      c => { setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, thinking: (v.thinking||'')+c } : v) } })) },
      c => { setThinkingOpen(p => ({ ...p, [msgId]: false })); setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, content: v.content+c } : v) } })) },
      u => { setMessages(p => p.map((m, i) => { if (i !== mi || !m.versions) return m; return { ...m, versions: m.versions.map((v, j) => j === vi ? { ...v, usage: u } : v) } })) },
    ) } catch (e) { setError(e instanceof Error ? e.message : '生成失败') }
    finally { setLoading(false); isStreamingRef.current = false; setMessages(p => { localStorage.setItem(getChatKey(worldId), JSON.stringify(p)); return p }) }
  }

  async function handleSend() {
    const t = input.trim(); if (!t || loading) return
    const um: Message = { id: crypto.randomUUID(), role: 'user', content: t, timestamp: Date.now() }
    const aid = crypto.randomUUID(); const am: Message = { id: aid, role: 'assistant', content: '', thinking: '', timestamp: Date.now() }
    setMessages(p => [...p, um, am]); setInput(''); setExpanded(false); setLoading(true); setError(''); isStreamingRef.current = true; setThinkingOpen(p => ({ ...p, [aid]: true }))
    try { await sendMessageStream([...messages, um],
      c => { setMessages(p => p.map(m => m.id === aid ? { ...m, thinking: (m.thinking||'')+c } : m)) },
      c => { setThinkingOpen(p => ({ ...p, [aid]: false })); setMessages(p => p.map(m => m.id === aid ? { ...m, content: m.content+c } : m)) },
      u => { setMessages(p => p.map(m => m.id === aid ? { ...m, usage: u } : m)) },
    ) } catch (e) { setError(e instanceof Error ? e.message : '发送失败') }
    finally { setLoading(false); isStreamingRef.current = false; setMessages(p => { localStorage.setItem(getChatKey(worldId), JSON.stringify(p)); return p }) }
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
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
        {messages.length === 0 && <div className="text-center text-stone-400 text-sm pt-20">说点什么吧。</div>}
        {messages.map(msg => {
          const a = msg.role === 'assistant' ? getActiveVersion(msg) : null
          const dc = a ? a.content : msg.content
          const dt = a ? a.thinking : msg.thinking
          const du = a ? a.usage : msg.usage
          const tv = msg.versions?.length || 0
          const cv = msg.activeVersion ?? 0
          const ie = editingId === msg.id
          const iu = msg.role === 'user'
          const name = iu ? dn.user : dn.assistant

          return (
            <div key={msg.id} className="group max-w-3xl mx-auto">
              {/* 头部：头像 + (名字 / 日期) */}
              <div className={`flex items-start gap-2.5 mb-3 ${iu ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar name={name} isUser={iu} />
                <div className={`${iu ? 'text-right' : 'text-left'}`}>
                  <div className="text-xs text-stone-600 font-medium">{name}</div>
                  <div className="text-xs text-stone-300">{formatDateTime(msg.timestamp)}</div>
                </div>
              </div>

              {/* 内容区 */}
              <div className={`${iu ? 'flex flex-col items-end' : ''}`}>
                {dt && (
                  <div className="mb-3">
                    <button onClick={() => toggleThinking(msg.id)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
                      <span className={`inline-block transition-transform ${thinkingOpen[msg.id] ? 'rotate-90' : ''}`}>▶</span>思考过程
                    </button>
                    {thinkingOpen[msg.id] && <div className="mt-2 p-3 rounded-lg bg-stone-100 text-xs text-stone-500 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{dt}</div>}
                  </div>
                )}

                {iu && ie ? (
                  <div className="space-y-2">
                    <textarea ref={editTextareaRef} value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(msg.id) } if (e.key === 'Escape') cancelEdit() }}
                      className="w-full p-3 text-sm text-left rounded-lg border border-stone-300 bg-white resize-none focus:outline-none focus:border-stone-400 transition-colors" rows={3} />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
                      <button onClick={() => submitEdit(msg.id)} disabled={!editText.trim() || loading} className="px-3 py-1.5 text-xs rounded-md bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 transition-colors">保存并重新生成</button>
                    </div>
                  </div>
                ) : (
                  <div className={`text-sm leading-relaxed ${iu ? 'text-stone-600' : 'text-stone-800'}`}>
                    <ReactMarkdown components={mdComponents}>{dc}</ReactMarkdown>
                  </div>
                )}

                {iu && !ie && msg.content && (
                  <div className="mt-2 flex justify-end">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyBtn id={msg.id} content={msg.content} />
                      <button onClick={() => startEdit(msg)} className="text-stone-300 hover:text-stone-500 transition-colors" title="编辑">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    </div>
                  </div>
                )}

                {!iu && dc && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyBtn id={msg.id} content={dc} />
                      <button onClick={() => handleRegenerate(msg.id)} disabled={loading} className="text-stone-300 hover:text-stone-500 disabled:opacity-40 transition-colors" title="重新生成">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                      </button>
                      {tv > 1 && <div className="flex items-center gap-1 text-xs text-stone-400"><button onClick={() => switchVersion(msg.id, -1)} disabled={cv === 0} className="hover:text-stone-600 disabled:opacity-30 transition-colors">‹</button><span>{cv+1}/{tv}</span><button onClick={() => switchVersion(msg.id, 1)} disabled={cv === tv-1} className="hover:text-stone-600 disabled:opacity-30 transition-colors">›</button></div>}
                    </div>
                    {du && (
                      <div className="relative">
                        <button onClick={() => toggleUsage(msg.id)} className="text-xs text-stone-300 hover:text-stone-500 transition-colors">{du.totalTokens} tokens</button>
                        {usageOpen[msg.id] && <div className="absolute bottom-6 right-0 p-2.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs text-stone-500 space-y-1 z-10 whitespace-nowrap"><div>输入：{du.promptTokens} tokens</div><div>输出：{du.completionTokens} tokens</div><div>用时：{formatDuration(du.duration)}</div></div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {error && <div className="max-w-3xl mx-auto text-sm text-red-500">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-stone-200 p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <div className="relative flex-1">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="输入消息..." rows={1} className="w-full p-3 pr-9 text-sm rounded-lg border border-stone-200 bg-white resize-none focus:outline-none focus:border-stone-400 transition-colors overflow-y-auto" style={{ maxHeight: '124px' }} />
            <button onClick={() => setExpanded(true)} className="absolute top-2 right-2 text-stone-300 hover:text-stone-500 transition-colors" title="展开编辑">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
          </div>
          <button onClick={handleSend} disabled={loading || !input.trim()} className="self-end px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">发送</button>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex flex-col">
          <div className="flex-1 flex flex-col m-4 sm:m-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
              <span className="text-sm text-stone-500">编辑消息</span>
              <button onClick={() => setExpanded(false)} className="text-stone-400 hover:text-stone-600 transition-colors" title="收起">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
              </button>
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
