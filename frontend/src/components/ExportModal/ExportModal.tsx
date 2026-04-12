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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">PlantUML 出力</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
            title="閉じる"
          >
            ×
          </button>
        </div>

        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-700 bg-gray-50 border-b border-gray-100 whitespace-pre">
          {text}
        </pre>

        <div className="flex gap-2 px-5 py-3 justify-end">
          <button
            onClick={handleCopy}
            className="text-xs px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {copied ? 'コピーしました！' : 'コピー'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            ダウンロード (.puml)
          </button>
        </div>
      </div>
    </div>
  )
}
