import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { ClassNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function ClassNode({ data, type, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const nodeData = data as unknown as ClassNodeData
  const isInterface = type === 'interface'

  const handleStyle = {
    width: 10,
    height: 10,
    background: '#3B82F6',
    border: '2px solid white',
    borderRadius: '50%',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  }

  return (
    <div
      className={`bg-white border-2 rounded shadow-sm min-w-[160px] select-none ${selected ? 'border-blue-500' : 'border-gray-400'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={140}
        minHeight={60}
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

      {/* ヘッダー */}
      <div
        className="px-3 py-2 text-center border-b border-gray-300 rounded-t"
        style={{ backgroundColor: nodeData.color || '#dbeafe' }}
      >
        {nodeData.stereotype && (
          <div className="text-xs text-gray-500 italic leading-tight">{nodeData.stereotype}</div>
        )}
        {!nodeData.stereotype && isInterface && (
          <div className="text-xs text-gray-500 italic leading-tight">{'<<interface>>'}</div>
        )}
        <div className="font-bold text-sm text-gray-800 leading-snug">{nodeData.name}</div>
      </div>

      {/* 属性セクション */}
      <div className="px-3 py-1 border-b border-gray-300 min-h-[24px]">
        {nodeData.attributes.map((attr) => (
          <div key={attr.id} className="text-xs text-gray-700 py-0.5 font-mono">
            {attr.visibility} {attr.name}: {attr.type}
          </div>
        ))}
      </div>

      {/* メソッドセクション */}
      <div className="px-3 py-1 min-h-[24px] rounded-b">
        {nodeData.methods.map((method) => (
          <div key={method.id} className="text-xs text-gray-700 py-0.5 font-mono">
            {method.visibility} {method.name}(
            {method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')}
            ): {method.returnType}
          </div>
        ))}
      </div>
    </div>
  )
}
