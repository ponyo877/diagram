import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const FOLD_SIZE = 16

export default function NoteNode({ data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as NoteNodeData
  const bg = nodeData.color || '#fef9c3'

  const handleStyle = {
    width: 10,
    height: 10,
    background: '#F59E0B',
    border: '2px solid white',
    borderRadius: '50%',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  }

  return (
    <div
      className={`relative border-2 rounded-b rounded-bl shadow-sm min-w-[120px] min-h-[60px] select-none overflow-visible ${selected ? 'border-blue-500' : 'border-gray-400'}`}
      style={{
        backgroundColor: bg,
        clipPath: `polygon(0 0, calc(100% - ${FOLD_SIZE}px) 0, 100% ${FOLD_SIZE}px, 100% 100%, 0 100%)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineStyle={{ borderColor: '#3B82F6', borderWidth: 1 }}
        handleStyle={{ background: '#3B82F6', width: 8, height: 8, border: '2px solid white' }}
      />

      {HANDLE_POSITIONS.map((pos) => (
        <>
          <Handle
            key={`${pos}-s`}
            type="source"
            position={pos}
            id={`${pos}-s`}
            style={handleStyle}
          />
          <Handle
            key={`${pos}-t`}
            type="target"
            position={pos}
            id={`${pos}-t`}
            style={handleStyle}
          />
        </>
      ))}

      {/* 折れ角のSVG装飾 */}
      <svg
        className="absolute top-0 right-0 pointer-events-none"
        width={FOLD_SIZE}
        height={FOLD_SIZE}
        style={{ color: 'rgba(0,0,0,0.15)' }}
      >
        <polygon
          points={`0,0 ${FOLD_SIZE},${FOLD_SIZE} 0,${FOLD_SIZE}`}
          fill="currentColor"
        />
      </svg>

      {/* テキスト内容 */}
      <div className="px-3 pt-2 pb-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
        {nodeData.content}
      </div>
    </div>
  )
}
