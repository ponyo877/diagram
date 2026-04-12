import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const FOLD_SIZE = 14

export default function NoteNode({ data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as NoteNodeData
  const bg = nodeData.color || '#fef9c3'

  const handleStyle = {
    width: 8,
    height: 8,
    background: '#0d99ff',
    border: '2px solid white',
    borderRadius: '50%',
    boxShadow: '0 0 0 1px #0d99ff',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.1s',
    zIndex: 10,
  }

  const borderColor = selected ? '#0d99ff' : '#e0e0e0'

  return (
    <div
      className="relative min-w-[120px] min-h-[60px] select-none"
      style={{
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        boxShadow: selected
          ? '0 2px 8px rgba(13,153,255,0.2)'
          : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
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
        lineStyle={{ borderColor: '#0d99ff', borderWidth: 1 }}
        handleStyle={{ background: '#0d99ff', width: 8, height: 8, border: '2px solid white', borderRadius: 2 }}
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
        style={{ color: 'rgba(0,0,0,0.08)' }}
      >
        <polygon
          points={`0,0 ${FOLD_SIZE},${FOLD_SIZE} 0,${FOLD_SIZE}`}
          fill="currentColor"
        />
      </svg>

      {/* テキスト内容 */}
      <div className="px-3 pt-2 pb-2 text-[12px] text-figma-text whitespace-pre-wrap leading-relaxed">
        {nodeData.content}
      </div>
    </div>
  )
}
