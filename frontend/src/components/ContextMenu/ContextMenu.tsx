import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  shortcut?: string
  action: () => void
  danger?: boolean
  separator?: false
}
export interface ContextMenuSeparator {
  separator: true
}
export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Defer a tick so the opening click doesn't immediately close it
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown)
    }, 0)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Clamp to viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const width = 200
  const maxItemsVisible = 12
  const estimatedHeight = Math.min(items.length, maxItemsVisible) * 28 + 16
  const left = Math.min(x, vw - width - 8)
  const top = Math.min(y, vh - estimatedHeight - 8)

  return (
    <div
      ref={ref}
      className="fixed z-[1500] min-w-[200px] bg-white/98 backdrop-blur-sm rounded-xl shadow-lg border border-soft-border py-1"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry, i) => {
        if ('separator' in entry && entry.separator) {
          return <div key={i} className="h-px bg-soft-border my-1" />
        }
        const item = entry as ContextMenuItem
        return (
          <button
            key={i}
            onClick={() => { item.action(); onClose() }}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-soft-hover transition-colors ${
              item.danger ? 'text-soft-red hover:text-red-700' : 'text-soft-text'
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-soft-light font-mono ml-2">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
