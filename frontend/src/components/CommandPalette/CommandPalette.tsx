import { useEffect, useState, useRef } from 'react'

export interface Command {
  id: string
  label: string
  category: string
  shortcut?: string
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  commands: Command[]
  onClose: () => void
}

export default function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = filterCommands(commands, query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[selectedIdx]
      if (cmd) { cmd.action(); onClose() }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 flex flex-col max-h-[60vh] overflow-hidden"
        style={{ boxShadow: '0 12px 40px rgba(139,120,100,0.15)' }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command..."
          className="w-full h-12 px-4 text-sm bg-transparent border-b border-soft-border text-soft-text focus:outline-none placeholder-soft-light"
        />
        <div ref={listRef} className="flex-1 overflow-y-auto panel-scroll py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-soft-muted">No commands found</div>
          )}
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              data-idx={idx}
              onMouseEnter={() => setSelectedIdx(idx)}
              onClick={() => { cmd.action(); onClose() }}
              className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                idx === selectedIdx ? 'bg-soft-primary-light text-soft-primary' : 'text-soft-text hover:bg-soft-hover'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-soft-light uppercase tracking-widest min-w-[60px]">{cmd.category}</span>
                <span>{cmd.label}</span>
              </div>
              {cmd.shortcut && <span className="text-[10px] font-mono text-soft-light">{cmd.shortcut}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  return commands
    .map((c) => ({ cmd: c, score: score(c, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.cmd)
}

function score(cmd: Command, q: string): number {
  const haystack = [cmd.label, cmd.category, ...(cmd.keywords ?? [])].join(' ').toLowerCase()
  if (haystack.includes(q)) return 10
  // Fuzzy: sequential char match
  let i = 0, score = 0
  for (const ch of haystack) {
    if (ch === q[i]) { i++; score++; if (i === q.length) return score }
  }
  return i === q.length ? score : 0
}
