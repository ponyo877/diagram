import { useEffect } from 'react'

interface ShortcutsModalProps {
  onClose: () => void
}

const CATEGORIES = [
  {
    title: 'Palette',
    items: [
      { keys: ['C'], label: 'Create Class' },
      { keys: ['I'], label: 'Create Interface' },
      { keys: ['E'], label: 'Create Enum' },
      { keys: ['N'], label: 'Create Note' },
      { keys: ['P'], label: 'Create Package' },
    ],
  },
  {
    title: 'Editing',
    items: [
      { keys: ['Delete'], label: 'Delete selection' },
      { keys: ['⌘', 'C'], label: 'Copy' },
      { keys: ['⌘', 'X'], label: 'Cut' },
      { keys: ['⌘', 'V'], label: 'Paste' },
      { keys: ['⌘', 'Z'], label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
    ],
  },
  {
    title: 'Z-Order',
    items: [
      { keys: ['⌘', ']'], label: 'Bring Forward' },
      { keys: ['⌘', '['], label: 'Send Backward' },
      { keys: ['⌘', '⇧', ']'], label: 'Bring to Front' },
      { keys: ['⌘', '⇧', '['], label: 'Send to Back' },
    ],
  },
  {
    title: 'Selection & Pan',
    items: [
      { keys: ['Drag'], label: 'Pan canvas (empty area)' },
      { keys: ['⇧', 'Drag'], label: 'Marquee select (empty area)' },
      { keys: ['⇧', 'Click'], label: 'Add to selection' },
      { keys: ['Middle', 'Drag'], label: 'Pan canvas' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['⌘', '/'], label: 'Shortcut help' },
      { keys: ['Esc'], label: 'Close / deselect' },
    ],
  },
]

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ boxShadow: '0 12px 40px rgba(139,120,100,0.15)' }}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-soft-border shrink-0">
          <span className="text-sm font-bold text-soft-text">Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-soft-hover text-soft-muted hover:text-soft-text text-base leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll p-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <div className="text-[10px] font-bold text-soft-light uppercase tracking-widest mb-2">
                {cat.title}
              </div>
              <div className="flex flex-col gap-1.5">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-soft-text">{item.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="inline-block px-1.5 py-0.5 bg-soft-input border border-soft-border rounded text-[10px] font-mono text-soft-text min-w-[20px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
