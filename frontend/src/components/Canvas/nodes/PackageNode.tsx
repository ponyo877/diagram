import { useState } from 'react'
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { PackageNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function PackageNode({ id, data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const { setNodes } = useReactFlow()

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
        <Handle key={`${pos}-s`} type="source" position={pos} id={`${pos}-s`} style={handleStyle} />
      ))}
      {HANDLE_POSITIONS.map((pos) => (
        <Handle key={`${pos}-t`} type="target" position={pos} id={`${pos}-t`} style={handleStyle} />
      ))}

      {/* パッケージタブ */}
      <div
        className={`absolute left-0 flex items-center px-2 py-0.5 text-xs font-bold border-l border-t border-r rounded-tl rounded-tr ${selected ? 'border-blue-500' : 'border-gray-400'}`}
        style={{ top: -26, backgroundColor: bg, minWidth: 80 }}
        onDoubleClick={startEditName}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-xs bg-transparent border-b border-blue-500 outline-none w-full"
          />
        ) : (
          <span className="cursor-text">{nodeData.name}</span>
        )}
      </div>

      {/* パッケージ本体 */}
      <div
        className={`w-full h-full border-2 rounded-tr rounded-b ${selected ? 'border-blue-500' : 'border-gray-400'}`}
        style={{ backgroundColor: bg, opacity: 0.5 }}
      />
    </div>
  )
}
