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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-lg w-full max-w-2xl mx-4 flex flex-col max-h-[75vh]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-figma-border shrink-0">
          <span className="text-sm font-semibold text-figma-text">PlantUML 出力</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-figma-canvas text-figma-muted hover:text-figma-text transition-colors text-base leading-none"
            title="閉じる"
          >
            ×
          </button>
        </div>

        {/* コード表示 */}
        <pre className="flex-1 overflow-auto p-4 text-[12px] font-mono text-figma-text bg-figma-canvas leading-relaxed whitespace-pre">
          {text}
        </pre>

        {/* ボタン群 */}
        <div className="flex items-center justify-end gap-2 px-4 h-12 border-t border-figma-border shrink-0">
          <button
            onClick={handleCopy}
            className="h-8 px-4 text-xs border border-figma-border rounded hover:bg-figma-canvas transition-colors text-figma-text"
          >
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
          <button
            onClick={handleDownload}
            className="h-8 px-4 text-xs bg-figma-blue hover:bg-figma-blue-hover text-white rounded transition-colors"
          >
            .puml でダウンロード
          </button>
        </div>
      </div>
    </div>
  )
}
