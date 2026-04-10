import type { NodeType } from '../../types/diagram'

const PALETTE_ITEMS: { type: NodeType; label: string; icon: string }[] = [
  { type: 'class', label: 'クラス', icon: '⬜' },
  { type: 'interface', label: 'インターフェース', icon: '⬡' },
  { type: 'enum', label: '列挙型', icon: '≡' },
  { type: 'note', label: 'ノート', icon: '📝' },
  { type: 'package', label: 'パッケージ', icon: '📦' },
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
    <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-center gap-2 px-4 shadow-sm z-10">
      {selected && (
        <span className="text-xs text-blue-600 font-medium mr-2">
          キャンバスをクリックして配置
        </span>
      )}
      {PALETTE_ITEMS.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => handleClick(type)}
          className={`
            px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150
            ${
              selected === type
                ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-300'
                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
