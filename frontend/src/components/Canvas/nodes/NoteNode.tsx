import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const FOLD_SIZE = 14

export default function NoteNode({ data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as NoteNodeData
  const bg = nodeData.color || '#fdf5dc'

  const handleStyle = {
    width: 8,
    height: 8,
    background: '#4a9ce8',
    border: '2px solid white',
    borderRadius: '50%',
    boxShadow: '0 0 0 1px #4a9ce8',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.1s',
    zIndex: 10,
  }

  const borderColor = selected ? '#4a9ce8' : '#e8e2d8'

  return (
    <div
      className="relative min-w-[120px] min-h-[60px] select-none"
      style={{
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        boxShadow: selected
          ? '0 3px 12px rgba(74,156,232,0.18)'
          : '0 2px 8px rgba(139,120,100,0.08), 0 0 0 1px rgba(139,120,100,0.06)',
        clipPath: `polygon(0 0, calc(100% - ${FOLD_SIZE}px) 0, 100% ${FOLD_SIZE}px, 100% 100%, 0 100%)`,
        overflow: 'visible',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineStyle={{ borderColor: '#4a9ce8', borderWidth: 1 }}
        handleStyle={{ background: '#4a9ce8', width: 8, height: 8, border: '2px solid white', borderRadius: 4 }}
      />

      {HANDLE_POSITIONS.map((pos) => (
        <Handle key={`${pos}-s`} type="source" position={pos} id={`${pos}-s`} style={handleStyle} />
      ))}
      {HANDLE_POSITIONS.map((pos) => (
        <Handle key={`${pos}-t`} type="target" position={pos} id={`${pos}-t`} style={handleStyle} />
      ))}

      {/* 折れ角のSVG装飾 */}
      <svg
        className="absolute top-0 right-0 pointer-events-none"
        width={FOLD_SIZE}
        height={FOLD_SIZE}
        style={{ color: 'rgba(139,120,100,0.1)' }}
      >
        <polygon
          points={`0,0 ${FOLD_SIZE},${FOLD_SIZE} 0,${FOLD_SIZE}`}
          fill="currentColor"
        />
      </svg>

      {/* テキスト内容 */}
      <div className="px-3 pt-2 pb-2 text-[12px] text-soft-text whitespace-pre-wrap leading-relaxed">
        {nodeData.content}
      </div>
    </div>
  )
}
