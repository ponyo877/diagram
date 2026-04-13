import { useCallback, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import type { AwarenessState } from '../../hooks/useCollaboration'
import { createNode } from '../../utils/nodeFactory'
import ClassNode from './nodes/ClassNode'
import EnumNode from './nodes/EnumNode'
import NoteNode from './nodes/NoteNode'
import PackageNode from './nodes/PackageNode'
import DiagramEdge from './edges/DiagramEdge'
import CanvasCursors from '../Cursors/CanvasCursors'

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
  onEdgeSelect: (edge: Edge | null, clickPos?: { x: number; y: number }) => void
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void
  onNodeContextMenu?: (event: React.MouseEvent, node: Node) => void
  onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void
  onPaneContextMenu?: (event: React.MouseEvent) => void
  remoteUsers: Map<number, AwarenessState>
  onCursorMove: (pos: { x: number; y: number }) => void
  onCursorLeave: () => void
}

const PREVIEW_ID = '__preview__'

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
  onSelectionChange,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneContextMenu,
  remoteUsers,
  onCursorMove,
  onCursorLeave,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null)

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
      setPreviewPos(null)
    },
    [selectedPalette, screenToFlowPosition, onCreateNode, onNodeSelect, onEdgeSelect],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      onCursorMove(flowPos)
      if (selectedPalette) {
        setPreviewPos(flowPos)
      }
    },
    [screenToFlowPosition, onCursorMove, selectedPalette],
  )

  const handleMouseLeave = useCallback(() => {
    onCursorLeave()
    setPreviewPos(null)
  }, [onCursorLeave])

  // プレビューノード生成
  const previewNode = useMemo(() => {
    if (!selectedPalette || !previewPos) return null
    const node = createNode(selectedPalette, previewPos, PREVIEW_ID)
    return {
      ...node,
      draggable: false,
      selectable: false,
      connectable: false,
      style: { ...node.style, opacity: 0.4, pointerEvents: 'none' as const },
    }
  }, [selectedPalette, previewPos])

  // プレビューノードを含む全ノード
  const allNodes = useMemo(() => {
    if (!previewNode) return nodes
    return [...nodes, previewNode]
  }, [nodes, previewNode])

  return (
    <div
      className="w-full h-full"
      style={{ cursor: selectedPalette ? 'crosshair' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'diagram' }}
        onNodesChange={(changes) => {
          // プレビューノードへの変更を無視
          const filtered = changes.filter((c) => !('id' in c && c.id === PREVIEW_ID))
          if (filtered.length > 0) onNodesChange(filtered)
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
          if (onSelectionChange) {
            onSelectionChange(
              selNodes.filter((n) => n.id !== PREVIEW_ID).map((n) => n.id),
              selEdges.map((e) => e.id),
            )
          }
        }}
        selectionOnDrag={!selectedPalette}
        panOnDrag={selectedPalette ? true : [1, 2]}
        onNodeContextMenu={(event, node) => {
          event.preventDefault()
          if (node.id === PREVIEW_ID) return
          if (onNodeContextMenu) onNodeContextMenu(event, node)
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault()
          if (onEdgeContextMenu) onEdgeContextMenu(event, edge)
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          if (onPaneContextMenu) onPaneContextMenu(event as React.MouseEvent)
        }}
        selectionKeyCode={null}
        multiSelectionKeyCode={'Shift'}
        panActivationKeyCode={'Space'}
        onNodeClick={(_, node) => {
          if (node.id === PREVIEW_ID) return
          onNodeSelect(node)
          onEdgeSelect(null)
        }}
        onEdgeClick={(event, edge) => {
          const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
          onEdgeSelect(edge, flowPos)
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
        {/* リモートユーザーのカーソル表示 */}
        <CanvasCursors remoteUsers={remoteUsers} />
      </ReactFlow>
    </div>
  )
}
