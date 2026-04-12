import type { NodeType } from '../../types/diagram'

const PALETTE_ITEMS: { type: NodeType; label: string; engLabel: string; shortcut: string; svg: React.ReactNode }[] = [
  {
    type: 'class',
    label: 'Class',
    engLabel: 'Class',
    shortcut: 'C',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="6" rx="1" />
        <rect x="3" y="9" width="18" height="12" rx="0 0 1 1" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    ),
  },
  {
    type: 'interface',
    label: 'Interface',
    engLabel: 'I/F',
    shortcut: 'I',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2">
        <rect x="3" y="3" width="18" height="18" rx="1" />
      </svg>
    ),
  },
  {
    type: 'enum',
    label: 'Enum',
    engLabel: 'Enum',
    shortcut: 'E',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="5" rx="1" />
        <line x1="7" y1="13" x2="17" y2="13" />
        <line x1="7" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'Note',
    engLabel: 'Note',
    shortcut: 'N',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M16 4v4h4" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    type: 'package',
    label: 'Package',
    engLabel: 'Pkg',
    shortcut: 'P',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-soft-border px-1.5 py-1.5">
      {PALETTE_ITEMS.map(({ type, label, engLabel, shortcut, svg }) => (
        <button
          key={type}
          title={`${label} (${shortcut})`}
          onClick={() => handleClick(type)}
          className={`
            w-11 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl
            transition-colors duration-100
            ${selected === type
              ? 'bg-soft-primary-light text-soft-primary'
              : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
            }
          `}
        >
          {svg}
          <span className="text-[8px] leading-none">{engLabel}</span>
        </button>
      ))}
    </div>
  )
}
