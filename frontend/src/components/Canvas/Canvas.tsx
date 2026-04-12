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
  EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { NodeType } from '../../types/diagram'
import ClassNode from './nodes/ClassNode'
import EnumNode from './nodes/EnumNode'
import NoteNode from './nodes/NoteNode'
import PackageNode from './nodes/PackageNode'
import DiagramEdge from './edges/DiagramEdge'

const nodeTypes: NodeTypes = {
  class: ClassNode,
  interface: ClassNode,
  enum: EnumNode,
  note: NoteNode,
  package: PackageNode,
}

const edgeTypes: EdgeTypes = {
  diagram: DiagramEdge,
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
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'diagram' }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={(_, node) => {
          onNodeSelect(node)
          onEdgeSelect(null)
        }}
        onEdgeClick={(_, edge) => {
          onEdgeSelect(edge)
          onNodeSelect(null)
        }}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#ddd8cf"
        />
        <MiniMap
          position="bottom-right"
          zoomable
          pannable
          style={{
            backgroundColor: '#fdfaf5',
            border: '1px solid #e8e2d8',
          }}
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              class: '#e3ecf8', interface: '#e4e1f5',
              enum: '#daf0e2', note: '#fdf5dc', package: '#f0ebe3',
            }
            return colors[node.type as string] ?? '#e8e2d8'
          }}
        />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
