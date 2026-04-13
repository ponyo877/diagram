import { useEffect, useState } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { Node } from '@xyflow/react'

interface ExportModalProps {
  text: string
  nodes: Node[]
  onClose: () => void
  onToast?: (msg: string, type?: 'success' | 'error') => void
}

type Tab = 'plantuml' | 'png' | 'svg'

export default function ExportModal({ text, nodes, onClose, onToast }: ExportModalProps) {
  const [tab, setTab] = useState<Tab>('plantuml')
  const [copied, setCopied] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pixelRatio, setPixelRatio] = useState<1 | 2 | 3>(2)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Generate image preview when tab changes (PNG/SVG)
  useEffect(() => {
    if (tab === 'plantuml') return
    let cancelled = false
    const generate = async () => {
      try {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
        if (!viewport) {
          if (!cancelled) setPreviewUrl(null)
          return
        }
        // Calculate bounds of all nodes and apply a temporary transform for clean export
        const bounds = getNodesBounds(nodes)
        const padding = 40
        const width = bounds.width + padding * 2
        const height = bounds.height + padding * 2
        const targetViewport = getViewportForBounds(bounds, width, height, 0.5, 2, padding)

        const options = {
          backgroundColor: '#f7f3ed',
          width: Math.round(width),
          height: Math.round(height),
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${targetViewport.x}px, ${targetViewport.y}px) scale(${targetViewport.zoom})`,
          },
          pixelRatio,
          filter: (node: HTMLElement) => {
            // Exclude floating UI like cursors, edge toolbar
            const cls = node.classList
            if (!cls) return true
            if (cls.contains('react-flow__minimap')) return false
            if (cls.contains('react-flow__controls')) return false
            return true
          },
        }

        const url = tab === 'png' ? await toPng(viewport, options) : await toSvg(viewport, options)
        if (!cancelled) setPreviewUrl(url)
      } catch (e) {
        console.error('Export preview error:', e)
        if (!cancelled) setPreviewUrl(null)
      }
    }
    generate()
    return () => { cancelled = true }
  }, [tab, nodes, pixelRatio])

  const handleCopyText = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onToast?.('PlantUML copied')
    })
  }

  const handleDownloadText = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.puml'
    a.click()
    URL.revokeObjectURL(url)
    onToast?.('Downloaded diagram.puml')
  }

  const handleDownloadImage = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = tab === 'png' ? 'diagram.png' : 'diagram.svg'
    a.click()
    onToast?.(`Downloaded diagram.${tab}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]"
        style={{ boxShadow: '0 12px 40px rgba(139,120,100,0.15)' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-soft-border shrink-0">
          <span className="text-sm font-bold text-soft-text">Export</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-soft-hover text-soft-muted hover:text-soft-text transition-colors text-base leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* タブ */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-soft-border shrink-0">
          {(['plantuml', 'png', 'svg'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-soft-input text-soft-text font-bold border-b-2 border-soft-primary'
                  : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
              }`}
            >
              {t === 'plantuml' ? 'PlantUML' : t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        {tab === 'plantuml' ? (
          <>
            <pre className="flex-1 overflow-auto p-4 text-[12px] font-mono text-soft-text bg-soft-input leading-relaxed whitespace-pre">
              {text}
            </pre>
            <div className="flex items-center justify-end gap-2 px-4 h-12 border-t border-soft-border shrink-0">
              <button
                onClick={handleCopyText}
                className="h-8 px-4 text-xs border border-soft-border rounded-full hover:bg-soft-hover transition-colors text-soft-text"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadText}
                className="h-8 px-4 text-xs bg-soft-primary hover:bg-soft-primary-hover text-white rounded-full transition-colors"
              >
                Download .puml
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4 bg-soft-input flex items-center justify-center min-h-[200px]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[50vh] object-contain rounded shadow" />
              ) : (
                <span className="text-soft-muted text-xs">Generating preview...</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-4 h-12 border-t border-soft-border shrink-0">
              {tab === 'png' ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-soft-muted">Resolution:</span>
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPixelRatio(n as 1 | 2 | 3)}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        pixelRatio === n
                          ? 'bg-soft-primary-light text-soft-primary'
                          : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              ) : <span />}
              <button
                onClick={handleDownloadImage}
                disabled={!previewUrl}
                className="h-8 px-4 text-xs bg-soft-primary hover:bg-soft-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-colors"
              >
                Download .{tab}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
