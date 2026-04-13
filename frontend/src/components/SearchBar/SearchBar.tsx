import { useEffect, useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'

interface SearchBarProps {
  nodes: Node[]
  onClose: () => void
  onMatchChange: (matchedIds: string[]) => void
}

export default function SearchBar({ nodes, onClose, onMatchChange }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setCenter } = useReactFlow()

  useEffect(() => { inputRef.current?.focus() }, [])

  const matches = findMatches(nodes, query)

  useEffect(() => {
    onMatchChange(matches.map((n) => n.id))
    setCurrentIdx(0)
  }, [query, nodes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => onMatchChange([])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const jumpTo = (idx: number) => {
    const node = matches[idx]
    if (!node) return
    const w = (node.style?.width as number) ?? 180
    const h = (node.style?.height as number) ?? 120
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { duration: 300, zoom: 1 })
  }

  useEffect(() => {
    if (matches.length > 0 && query) jumpTo(currentIdx)
  }, [currentIdx, matches.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches.length > 0) {
        const next = e.shiftKey
          ? (currentIdx - 1 + matches.length) % matches.length
          : (currentIdx + 1) % matches.length
        setCurrentIdx(next)
      }
    }
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1300] flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-soft-border px-3 py-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-soft-muted">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search nodes..."
        className="w-60 text-xs bg-transparent text-soft-text focus:outline-none placeholder-soft-light"
      />
      {query && (
        <span className="text-[10px] text-soft-muted whitespace-nowrap">
          {matches.length > 0 ? `${currentIdx + 1} / ${matches.length}` : '0'}
        </span>
      )}
      <button
        onClick={onClose}
        className="text-soft-muted hover:text-soft-text text-sm leading-none"
      >
        ×
      </button>
    </div>
  )
}

function findMatches(nodes: Node[], query: string): Node[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes.filter((n) => {
    const data = n.data as Record<string, unknown>
    const fields: string[] = []
    if (typeof data.name === 'string') fields.push(data.name)
    if (typeof data.stereotype === 'string') fields.push(data.stereotype)
    if (typeof data.content === 'string') fields.push(data.content)
    if (Array.isArray(data.attributes)) {
      for (const a of data.attributes as { name: string; type: string }[]) {
        fields.push(a.name, a.type)
      }
    }
    if (Array.isArray(data.methods)) {
      for (const m of data.methods as { name: string; returnType: string }[]) {
        fields.push(m.name, m.returnType)
      }
    }
    if (Array.isArray(data.values)) {
      for (const v of data.values as { name: string }[]) fields.push(v.name)
    }
    return fields.some((f) => f.toLowerCase().includes(q))
  })
}
