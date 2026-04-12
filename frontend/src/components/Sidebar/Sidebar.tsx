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
  if (edge) return 'エッジ'
  if (!node) return 'デザイン'
  const labels: Record<string, string> = {
    class: 'クラス', interface: 'I/F', enum: 'Enum', note: 'ノート', package: 'パッケージ',
  }
  return labels[node.type ?? ''] ?? 'プロパティ'
}

export default function Sidebar({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
}: SidebarProps) {
  return (
    <aside
      className="w-60 bg-white shrink-0 overflow-y-auto panel-scroll flex flex-col"
      style={{ boxShadow: '-1px 0 0 #e0e0e0' }}
    >
      {/* パネルヘッダー */}
      <div className="h-9 flex items-center px-3 border-b border-figma-border sticky top-0 bg-white z-10 shrink-0">
        <span className="text-[11px] font-semibold text-figma-muted uppercase tracking-widest">
          {panelTitle(selectedNode, selectedEdge)}
        </span>
      </div>

      {!selectedNode && !selectedEdge && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-figma-light text-center px-4 leading-relaxed">
            ノードを選択すると<br />プロパティが表示されます
          </p>
        </div>
      )}

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
    </aside>
  )
}
