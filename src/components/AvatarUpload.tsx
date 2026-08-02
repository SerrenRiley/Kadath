import { useRef } from 'react'

export default function AvatarUpload({ src, onChange, name }: { src: string; onChange: (dataUrl: string) => void; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 128
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        onChange(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const initial = (name || '?').charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-12 h-12 rounded-full overflow-hidden border-2 transition-colors hover:opacity-80 flex items-center justify-center"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
        title="点击上传头像"
      >
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-light">{initial}</span>
        )}
      </button>
      {src && (
        <button onClick={() => onChange('')} className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>移除</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}
