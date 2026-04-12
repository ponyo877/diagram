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

const panelTitle = (node: Node | null, edge: Edge | null) => {
  if (edge) return 'Edge'
  if (!node) return ''
  const labels: Record<string, string> = {
    class: 'Class', interface: 'I/F', enum: 'Enum', note: 'Note', package: 'Package',
  }
  return labels[node.type ?? ''] ?? 'Properties'
}

export default function Sidebar({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
}: SidebarProps) {
  if (!selectedNode && !selectedEdge) return null

  return (
    <div className="w-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-soft-border overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* パネルヘッダー */}
      <div className="h-9 flex items-center px-3 border-b border-soft-border shrink-0">
        <span className="text-[11px] font-bold text-soft-muted uppercase tracking-widest">
          {panelTitle(selectedNode, selectedEdge)}
        </span>
      </div>

      <div className="overflow-y-auto panel-scroll flex-1">
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
    </div>
  )
}
