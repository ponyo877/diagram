import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useReactFlow,
} from '@xyflow/react'
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { NodeType } from '../../types/diagram'
import ClassNode from './nodes/ClassNode'
import EnumNode from './nodes/EnumNode'
import NoteNode from './nodes/NoteNode'
import PackageNode from './nodes/PackageNode'

const nodeTypes: NodeTypes = {
  class: ClassNode,
  interface: ClassNode,
  enum: EnumNode,
  note: NoteNode,
  package: PackageNode,
}

interface CanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  selectedPalette: NodeType | null
  onCreateNode: (type: string, position: { x: number; y: number }) => void
  onNodeSelect: (node: Node | null) => void
  onEdgeSelect: (edge: Edge | null) => void
}

export default function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  selectedPalette,
  onCreateNode,
  onNodeSelect,
  onEdgeSelect,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      onNodeSelect(null)
      onEdgeSelect(null)
      if (!selectedPalette) return
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      onCreateNode(selectedPalette, position)
    },
    [selectedPalette, screenToFlowPosition, onCreateNode, onNodeSelect, onEdgeSelect],
  )

  return (
    <div
      className="w-full h-full"
      style={{ cursor: selectedPalette ? 'crosshair' : 'default' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={(_, node) => onNodeSelect(node)}
        onEdgeClick={(_, edge) => onEdgeSelect(edge)}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#94a3b8"
        />
        <MiniMap position="bottom-right" zoomable pannable />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  )
}
