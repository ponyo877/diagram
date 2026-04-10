import { useState } from 'react'
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { EnumNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function EnumNode({ id, data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const { setNodes } = useReactFlow()

  const nodeData = data as unknown as EnumNodeData

  const handleStyle = {
    width: 10,
    height: 10,
    background: '#10B981',
    border: '2px solid white',
    borderRadius: '50%',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  }

  const startEditName = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(nodeData.name)
    setIsEditingName(true)
  }

  const commitEditName = () => {
    setIsEditingName(false)
    const trimmed = editName.trim()
    if (trimmed) {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, name: trimmed } } : n)),
      )
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEditName()
    if (e.key === 'Escape') setIsEditingName(false)
  }

  return (
    <div
      className={`bg-white border-2 rounded shadow-sm min-w-[140px] select-none ${selected ? 'border-blue-500' : 'border-gray-400'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={120}
        minHeight={60}
        isVisible={selected}
        lineStyle={{ borderColor: '#3B82F6', borderWidth: 1 }}
        handleStyle={{ background: '#3B82F6', width: 8, height: 8, border: '2px solid white' }}
      />

      {HANDLE_POSITIONS.map((pos) => (
        <>
          <Handle key={`${pos}-s`} type="source" position={pos} id={`${pos}-s`} style={handleStyle} />
          <Handle key={`${pos}-t`} type="target" position={pos} id={`${pos}-t`} style={handleStyle} />
        </>
      ))}

      {/* ヘッダー */}
      <div
        className="px-3 py-2 text-center border-b border-gray-300 rounded-t"
        style={{ backgroundColor: nodeData.color || '#dcfce7' }}
      >
        <div className="text-xs text-gray-500 italic leading-tight">{'<<enumeration>>'}</div>
        {isEditingName ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-sm text-gray-800 bg-transparent border-b border-blue-500 text-center outline-none w-full"
          />
        ) : (
          <div
            className="font-bold text-sm text-gray-800 leading-snug cursor-text"
            onDoubleClick={startEditName}
          >
            {nodeData.name}
          </div>
        )}
      </div>

      {/* 列挙値セクション */}
      <div className="px-3 py-1 min-h-[24px] rounded-b">
        {nodeData.values.map((val) => (
          <div key={val.id} className="text-xs text-gray-700 py-0.5 font-mono">
            {val.name}
          </div>
        ))}
      </div>
    </div>
  )
}
