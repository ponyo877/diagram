import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { PackageNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function PackageNode({ data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as PackageNodeData
  const bg = nodeData.color || '#f1f5f9'

  const handleStyle = {
    width: 10,
    height: 10,
    background: '#6B7280',
    border: '2px solid white',
    borderRadius: '50%',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  }

  return (
    <div
      className="relative w-full h-full select-none"
      style={{ overflow: 'visible' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={150}
        minHeight={100}
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

      {/* パッケージタブ（ノードの上に飛び出す） */}
      <div
        className={`absolute left-0 px-3 py-0.5 text-xs font-bold border-l border-t border-r rounded-tl rounded-tr ${selected ? 'border-blue-500' : 'border-gray-400'}`}
        style={{
          top: -26,
          backgroundColor: bg,
          minWidth: 80,
        }}
      >
        {nodeData.name}
      </div>

      {/* パッケージ本体 */}
      <div
        className={`w-full h-full border-2 rounded-tr rounded-b ${selected ? 'border-blue-500' : 'border-gray-400'}`}
        style={{ backgroundColor: bg, opacity: 0.6 }}
      />
    </div>
  )
}
