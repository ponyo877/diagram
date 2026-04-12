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

  const borderColor = selected ? '#0d99ff' : '#e0e0e0'
  const boxShadow = selected
    ? '0 2px 8px rgba(13,153,255,0.2)'
    : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'

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
        lineStyle={{ borderColor: '#0d99ff', borderWidth: 1 }}
        handleStyle={{ background: '#0d99ff', width: 8, height: 8, border: '2px solid white', borderRadius: 2 }}
      />

      {HANDLE_POSITIONS.map((pos) => (
        <Handle key={`${pos}-s`} type="source" position={pos} id={`${pos}-s`} style={handleStyle} />
      ))}
      {HANDLE_POSITIONS.map((pos) => (
        <Handle key={`${pos}-t`} type="target" position={pos} id={`${pos}-t`} style={handleStyle} />
      ))}

      {/* パッケージタブ */}
      <div
        className="absolute left-0 flex items-center px-2 py-0.5 rounded-tl rounded-tr"
        style={{
          top: -24,
          backgroundColor: bg,
          border: `1px solid ${borderColor}`,
          borderBottom: 'none',
          minWidth: 80,
        }}
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
            className="text-[12px] font-semibold bg-transparent border-b border-figma-blue outline-none w-full text-figma-text"
          />
        ) : (
          <span className="text-[12px] font-semibold text-figma-text cursor-text">{nodeData.name}</span>
        )}
      </div>

      {/* パッケージ本体 */}
      <div
        className="w-full h-full rounded-tr rounded-b"
        style={{
          backgroundColor: bg,
          border: `1px solid ${borderColor}`,
          boxShadow,
          opacity: 0.7,
        }}
      />
    </div>
  )
}
