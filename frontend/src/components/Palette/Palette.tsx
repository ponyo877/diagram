import type { NodeType } from '../../types/diagram'

const PALETTE_ITEMS: { type: NodeType; label: string; shortcut: string; svg: React.ReactNode }[] = [
  {
    type: 'class',
    label: 'クラス',
    shortcut: 'C',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="6" rx="1" />
        <rect x="3" y="9" width="18" height="12" rx="0 0 1 1" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    ),
  },
  {
    type: 'interface',
    label: 'I/F',
    shortcut: 'I',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2">
        <rect x="3" y="3" width="18" height="18" rx="1" />
      </svg>
    ),
  },
  {
    type: 'enum',
    label: 'Enum',
    shortcut: 'E',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="5" rx="1" />
        <line x1="7" y1="13" x2="17" y2="13" />
        <line x1="7" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'ノート',
    shortcut: 'N',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M16 4v4h4" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    type: 'package',
    label: 'Pkg',
    shortcut: 'P',
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h5l2-4h9v11H4z" />
        <line x1="4" y1="9" x2="4" y2="20" />
      </svg>
    ),
  },
]

interface PaletteProps {
  selected: NodeType | null
  onSelect: (type: NodeType | null) => void
}

export default function Palette({ selected, onSelect }: PaletteProps) {
  const handleClick = (type: NodeType) => {
    onSelect(selected === type ? null : type)
  }

  return (
    <nav className="w-14 bg-soft-bg border-r border-soft-border flex flex-col items-center pt-2 pb-2 gap-0.5 shrink-0 z-10">
      {PALETTE_ITEMS.map(({ type, label, shortcut, svg }) => (
        <button
          key={type}
          title={`${label} (${shortcut})`}
          onClick={() => handleClick(type)}
          className={`
            w-10 h-10 flex flex-col items-center justify-center rounded-xl
            transition-colors duration-100
            ${selected === type
              ? 'bg-soft-primary-light text-soft-primary'
              : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
            }
          `}
        >
          {svg}
          <span className="text-[9px] mt-0.5 leading-none">{label.slice(0, 3)}</span>
        </button>
      ))}

      <div className="w-8 h-px bg-soft-border my-1" />

      {selected && (
        <span className="text-[9px] text-soft-light text-center px-1 leading-tight">
          Esc<br />解除
        </span>
      )}
    </nav>
  )
}
