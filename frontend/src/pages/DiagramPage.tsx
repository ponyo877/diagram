import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react'
import type { NodeType } from '../types/diagram'
import Canvas from '../components/Canvas/Canvas'
import Palette from '../components/Palette/Palette'
import Sidebar from '../components/Sidebar/Sidebar'
import { createNode } from '../utils/nodeFactory'

type DiagramStatus = 'loading' | 'found' | 'not_found' | 'error'

export default function DiagramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DiagramStatus>('loading')

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedPalette, setSelectedPalette] = useState<NodeType | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [_selectedEdge, setSelectedEdge] = useState<Edge | null>(null)

  // 選択中ノードを最新データから導出
  const selectedNode = selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null

  useEffect(() => {
    if (!id) {
      navigate('/')
      return
    }
    const check = async () => {
      try {
        const res = await fetch(`/api/diagrams/${id}`)
        if (res.status === 404) setStatus('not_found')
        else if (res.ok) setStatus('found')
        else setStatus('error')
      } catch {
        setStatus('error')
      }
    }
    check()
  }, [id, navigate])

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )
  const onConnect: OnConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, data: { edgeType: 'association' } },
          eds,
        ),
      ),
    [],
  )

  const handleCreateNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const node = createNode(type, position)
      setNodes((nds) => [...nds, node])
      setSelectedPalette(null)
    },
    [],
  )

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNodeId(node?.id ?? null)
  }, [])

  const handleUpdateNode = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }, [])

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedNodeId(null)
    },
    [],
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-700 text-xl font-semibold">ダイアグラムが見つかりません</p>
        <p className="text-gray-500 text-sm">URLが正しいか確認してください。削除済みの場合もあります。</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors"
        >
          トップに戻る
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-500 text-xl font-semibold">エラーが発生しました</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors"
        >
          トップに戻る
        </button>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* ツールバー */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shadow-sm z-10 shrink-0">
          <span className="font-bold text-blue-600 text-lg">Diagramer</span>
          <span className="text-xs text-gray-400 font-mono">{id}</span>
        </div>

        {/* キャンバス＋サイドバー */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Canvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              selectedPalette={selectedPalette}
              onCreateNode={handleCreateNode}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={setSelectedEdge}
            />
          </div>
          <Sidebar
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>

        {/* パレット */}
        <Palette selected={selectedPalette} onSelect={setSelectedPalette} />
      </div>
    </ReactFlowProvider>
  )
}
