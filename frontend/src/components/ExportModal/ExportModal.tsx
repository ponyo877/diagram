import { useEffect, useState } from 'react'

interface ExportModalProps {
  text: string
  onClose: () => void
}

export default function ExportModal({ text, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.puml'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[75vh]"
        style={{ boxShadow: '0 12px 40px rgba(139,120,100,0.15)' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-soft-border shrink-0">
          <span className="text-sm font-bold text-soft-text">PlantUML Export</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-soft-hover text-soft-muted hover:text-soft-text transition-colors text-base leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* コード表示 */}
        <pre className="flex-1 overflow-auto p-4 text-[12px] font-mono text-soft-text bg-soft-input leading-relaxed whitespace-pre">
          {text}
        </pre>

        {/* ボタン群 */}
        <div className="flex items-center justify-end gap-2 px-4 h-12 border-t border-soft-border shrink-0">
          <button
            onClick={handleCopy}
            className="h-8 px-4 text-xs border border-soft-border rounded-full hover:bg-soft-hover transition-colors text-soft-text"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="h-8 px-4 text-xs bg-soft-primary hover:bg-soft-primary-hover text-white rounded-full transition-colors"
          >
            Download .puml
          </button>
        </div>
      </div>
    </div>
  )
}
