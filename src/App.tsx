import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import WorldEdit from './pages/WorldEdit'
import WorldChat from './pages/WorldChat'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-stone-50 text-stone-800">
        <nav className="sticky top-0 z-40 bg-stone-50 border-b border-stone-200 px-6 py-3 flex gap-4 text-sm">
          <Link to="/" className="text-stone-600 hover:text-stone-900">
            主世界
          </Link>
          <Link to="/settings" className="text-stone-600 hover:text-stone-900">
            设置
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<WorldChat />} />
          <Route path="/world/:id/edit" element={<WorldEdit />} />
          <Route path="/world/:id/chat" element={<WorldChat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
