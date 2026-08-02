import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Settings from './pages/Settings'
import WorldEdit from './pages/WorldEdit'
import WorldChat from './pages/WorldChat'

const themes = [
  { id: 'light', label: '象牙' },
  { id: 'dark', label: '夜色' },
  { id: 'purple', label: '雾紫' },
  { id: 'forest', label: '森林' },
]

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('kadath-theme') || 'light')
  const [showThemePicker, setShowThemePicker] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kadath-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <nav className="sticky top-0 z-40 border-b py-3 text-sm relative" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-center">
            <div className="flex-1 flex justify-center">
              <Link to="/" className="transition-colors tracking-wide" style={{ color: 'var(--text-secondary)' }}>主世界</Link>
            </div>
            <span className="text-2xl select-none" style={{ fontFamily: "'Lavishly Yours', cursive", color: 'var(--accent)', opacity: 0.5 }}>K</span>
            <div className="flex-1 flex justify-center">
              <Link to="/settings" className="transition-colors tracking-wide" style={{ color: 'var(--text-secondary)' }}>设置</Link>
            </div>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button onClick={() => setShowThemePicker(!showThemePicker)} className="flex items-center px-1 py-1 rounded-md transition-colors" style={{ color: 'var(--text-tertiary)' }} title="切换主题">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </button>
            {showThemePicker && (
              <div className="absolute top-8 right-0 rounded-lg shadow-md z-20 overflow-hidden min-w-24" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {themes.map(t => (
                  <button key={t.id} onClick={() => { setTheme(t.id); setShowThemePicker(false) }} className="block w-full text-left px-3 py-2 text-sm transition-colors" style={{ color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)', backgroundColor: theme === t.id ? 'var(--bg-tertiary)' : 'transparent' }}>{t.label}</button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/world/:id/edit" element={<WorldEdit />} />
          <Route path="/world/:id/chat" element={<WorldChat />} />
          <Route path="/chat" element={<WorldChat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
