import type { Node, Edge } from '@xyflow/react'
import NodeProperties from './NodeProperties'
import EnumProperties from './EnumProperties'
import NoteProperties from './NoteProperties'
import PackageProperties from './PackageProperties'
import EdgeProperties from './EdgeProperties'

interface SidebarProps {
  selectedNode: Node | null
  selectedEdge: Edge | null
  onUpdateNode: (id: string, data: Record<string, unknown>) => void
  onDeleteNode: (id: string) => void
  onUpdateEdge: (id: string, data: Record<string, unknown>) => void
  onDeleteEdge: (id: string) => void
}

export default function Sidebar({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
}: SidebarProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 flex items-center justify-center shrink-0">
        <p className="text-xs text-gray-400 text-center px-4">
          ノードを選択すると
          <br />
          プロパティが表示されます
        </p>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          プロパティ
        </span>
      </div>

      {/* エッジ選択時 */}
      {selectedEdge && (
        <EdgeProperties
          edge={selectedEdge}
          onUpdate={onUpdateEdge}
          onDelete={onDeleteEdge}
        />
      )}

      {/* ノード選択時 */}
      {selectedNode && !selectedEdge && (
        <>
          {(selectedNode.type === 'class' || selectedNode.type === 'interface') && (
            <NodeProperties
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
          {selectedNode.type === 'enum' && (
            <EnumProperties
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
          {selectedNode.type === 'note' && (
            <NoteProperties
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
          {selectedNode.type === 'package' && (
            <PackageProperties
              node={selectedNode}
              onUpdate={onUpdateNode}
              onDelete={onDeleteNode}
            />
          )}
        </>
      )}
    </div>
  )
}
