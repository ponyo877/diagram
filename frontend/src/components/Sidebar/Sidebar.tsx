import type { Node } from '@xyflow/react'
import NodeProperties from './NodeProperties'
import EnumProperties from './EnumProperties'
import NoteProperties from './NoteProperties'
import PackageProperties from './PackageProperties'

interface SidebarProps {
  selectedNode: Node | null
  onUpdateNode: (id: string, data: Record<string, unknown>) => void
  onDeleteNode: (id: string) => void
}

export default function Sidebar({ selectedNode, onUpdateNode, onDeleteNode }: SidebarProps) {
  if (!selectedNode) {
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

  const nodeType = selectedNode.type

  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          プロパティ
        </span>
      </div>

      {(nodeType === 'class' || nodeType === 'interface') && (
        <NodeProperties
          node={selectedNode}
          onUpdate={onUpdateNode}
          onDelete={onDeleteNode}
        />
      )}
      {nodeType === 'enum' && (
        <EnumProperties
          node={selectedNode}
          onUpdate={onUpdateNode}
          onDelete={onDeleteNode}
        />
      )}
      {nodeType === 'note' && (
        <NoteProperties
          node={selectedNode}
          onUpdate={onUpdateNode}
          onDelete={onDeleteNode}
        />
      )}
      {nodeType === 'package' && (
        <PackageProperties
          node={selectedNode}
          onUpdate={onUpdateNode}
          onDelete={onDeleteNode}
        />
      )}
    </div>
  )
}
