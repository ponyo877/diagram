import { useEffect, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { importFromPlantUml } from '../../utils/plantUmlImporter'
import { applyAutoLayout } from '../../utils/diagramLayout'

interface ImportModalProps {
  onClose: () => void
  onImport: (nodes: Node[], edges: Edge[]) => void
}

const SAMPLE_PLANTUML = `@startuml
class User {
  +name : String
  +email : String
  +login() : void
}

class Order {
  +id : int
  +total : double
  +place() : void
}

enum Status {
  PENDING
  ACTIVE
  CLOSED
}

User "1" --> "0..*" Order
Order --> Status
@enduml`

export default function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [text, setText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleImport = () => {
    setError(null)
    setWarnings([])

    const trimmed = text.trim()
    if (!trimmed) {
      setError('Please enter PlantUML text')
      return
    }

    try {
      const result = importFromPlantUml(trimmed)
      setWarnings(result.warnings)

      if (result.nodes.length === 0) {
        setError('No nodes detected. Please check your PlantUML syntax.')
        return
      }

      // 自動レイアウト適用
      const layoutedNodes = applyAutoLayout(result.nodes, result.edges)

      onImport(layoutedNodes, result.edges)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while parsing')
    }
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
          <span className="text-sm font-bold text-soft-text">PlantUML Import</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-soft-hover text-soft-muted hover:text-soft-text transition-colors text-base leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* テキスト入力 */}
        <div className="flex-1 overflow-auto p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`@startuml\nclass MyClass {\n  +name : String\n}\n@enduml`}
            className="w-full h-full min-h-[240px] p-3 text-[12px] font-mono text-soft-text bg-soft-input border border-soft-border rounded-xl focus:outline-none focus:border-soft-primary resize-none leading-relaxed"
          />
        </div>

        {/* 警告・エラー表示 */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[11px]">
            {error}
          </div>
        )}
        {warnings.length > 0 && !error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[11px]">
            <span className="font-bold">{warnings.length} warning(s):</span>
            <ul className="mt-1 list-disc pl-4">
              {warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
              {warnings.length > 5 && <li>...and {warnings.length - 5} more</li>}
            </ul>
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex items-center justify-end gap-2 px-4 h-12 border-t border-soft-border shrink-0">
          <button
            onClick={() => setText(SAMPLE_PLANTUML)}
            className="h-8 px-4 text-xs border border-soft-border rounded-full hover:bg-soft-hover transition-colors text-soft-muted"
          >
            Sample
          </button>
          <button
            onClick={handleImport}
            className="h-8 px-4 text-xs bg-soft-primary hover:bg-soft-primary-hover text-white rounded-full transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
