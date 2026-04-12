import { useState } from 'react'
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { ClassNodeData } from '../../../types/diagram'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

const VISIBILITY_SYMBOLS: Record<string, string> = {
  public: '+',
  private: '-',
  protected: '#',
  package: '~',
}

export default function ClassNode({ id, data, type, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const { setNodes } = useReactFlow()

  const nodeData = data as unknown as ClassNodeData
  const isInterface = type === 'interface'

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

  const borderClass = selected
    ? 'border border-figma-blue shadow-node-selected'
    : 'border border-figma-border shadow-node'

  return (
    <div
      className={`bg-white ${borderClass} rounded overflow-hidden min-w-[160px] select-none`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={140}
        minHeight={60}
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

      {/* ヘッダー */}
      <div
        className="px-3 py-2 flex flex-col items-center"
        style={{ backgroundColor: nodeData.color ?? '#dbeafe' }}
      >
        {(nodeData.stereotype || isInterface) && (
          <span className="text-[10px] text-gray-500 italic leading-tight">
            {nodeData.stereotype || '<<interface>>'}
          </span>
        )}
        {isEditingName ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-semibold text-gray-800 bg-transparent border-b border-figma-blue text-center outline-none w-full"
          />
        ) : (
          <span
            className="text-[13px] font-semibold text-figma-text leading-tight cursor-text"
            onDoubleClick={startEditName}
          >
            {nodeData.name}
          </span>
        )}
      </div>

      {/* 属性セクション */}
      {nodeData.attributes.length > 0 && (
        <>
          <div className="h-px bg-figma-border" />
          <div className="px-2 py-1">
            {nodeData.attributes.map((attr) => (
              <div key={attr.id} className="text-[11px] font-mono text-figma-text py-0.5 leading-tight">
                {VISIBILITY_SYMBOLS[attr.visibility] ?? attr.visibility}{attr.name}: {attr.type}
              </div>
            ))}
          </div>
        </>
      )}

      {/* メソッドセクション */}
      {nodeData.methods.length > 0 && (
        <>
          <div className="h-px bg-figma-border" />
          <div className="px-2 py-1">
            {nodeData.methods.map((method) => (
              <div key={method.id} className="text-[11px] font-mono text-figma-text py-0.5 leading-tight">
                {VISIBILITY_SYMBOLS[method.visibility] ?? method.visibility}{method.name}(
                {method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')}
                ): {method.returnType}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 属性もメソッドも空の場合の最小高さ確保 */}
      {nodeData.attributes.length === 0 && nodeData.methods.length === 0 && (
        <>
          <div className="h-px bg-figma-border" />
          <div className="px-2 py-2" />
        </>
      )}
    </div>
  )
}
