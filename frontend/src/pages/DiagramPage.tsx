import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { NodeType } from '../types/diagram'
import Canvas from '../components/Canvas/Canvas'
import Palette from '../components/Palette/Palette'
import Sidebar from '../components/Sidebar/Sidebar'
import RemoteCursors from '../components/Cursors/RemoteCursors'
import ExportModal from '../components/ExportModal/ExportModal'
import { useYjsProvider } from '../hooks/useYjsProvider'
import { useYjsDiagram } from '../hooks/useYjsDiagram'
import { useCollaboration } from '../hooks/useCollaboration'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUndoManager } from '../hooks/useUndoManager'
import { exportToPlantUml } from '../utils/plantUmlExporter'
import { nanoid } from 'nanoid'

type DiagramStatus = 'loading' | 'found' | 'not_found' | 'error'

function SaveStatusBadge({ status }: { status: 'saved' | 'saving' | 'offline' }) {
  if (status === 'saving') {
    return <span className="text-xs text-gray-400">同期中...</span>
  }
  if (status === 'offline') {
    return <span className="text-xs text-red-400">オフライン</span>
  }
  return <span className="text-xs text-green-500">保存済み ✓</span>
}

function DiagramEditor({ id }: { id: string }) {
  const [selectedPalette, setSelectedPalette] = useState<NodeType | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const clipboardNode = useRef<Node | null>(null)

  const { ydoc, provider, syncStatus } = useYjsProvider(id)
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    handleCreateNode,
    handleUpdateNode,
    handleDeleteNode,
    handleUpdateEdge,
    handleDeleteEdge,
  } = useYjsDiagram(ydoc)
  const { userName, updateUserName, remoteUsers } = useCollaboration(provider)
  const saveStatus = useAutoSave(ydoc, syncStatus)
  const { undo, redo } = useUndoManager(ydoc)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      if (isInput) return

      if (e.key === 'Escape') {
        setSelectedPalette(null)
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        setShowExportModal(false)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) handleDeleteNode(selectedNodeId)
        if (selectedEdgeId) handleDeleteEdge(selectedEdgeId)
        return
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); return }
        if (e.key === 'z') { e.preventDefault(); undo(); return }
        if (e.key === 'c' && selectedNodeId) {
          e.preventDefault()
          const node = nodes.find((n) => n.id === selectedNodeId)
          if (node) clipboardNode.current = node
          return
        }
        if (e.key === 'v' && clipboardNode.current) {
          e.preventDefault()
          const src = clipboardNode.current
          const newId = nanoid()
          handleCreateNode(
            src.type ?? 'class',
            { x: src.position.x + 20, y: src.position.y + 20 },
            newId,
            { ...src.data },
          )
          return
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, selectedEdgeId, handleDeleteNode, handleDeleteEdge, undo, redo, nodes, handleCreateNode])

  const selectedNode = selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null
  const selectedEdge = selectedEdgeId ? (edges.find((e) => e.id === selectedEdgeId) ?? null) : null

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNodeId(node?.id ?? null)
    if (node) setSelectedEdgeId(null)
  }, [])

  const handleEdgeSelect = useCallback((edge: Edge | null) => {
    setSelectedEdgeId(edge?.id ?? null)
    if (edge) setSelectedNodeId(null)
  }, [])

  const handleDeleteNodeAndClearSelection = useCallback(
    (nodeId: string) => {
      handleDeleteNode(nodeId)
      setSelectedNodeId(null)
    },
    [handleDeleteNode],
  )

  const handleDeleteEdgeAndClearSelection = useCallback(
    (edgeId: string) => {
      handleDeleteEdge(edgeId)
      setSelectedEdgeId(null)
    },
    [handleDeleteEdge],
  )

  const handleCreateNodeAndClearPalette = useCallback(
    (type: string, position: { x: number; y: number }) => {
      handleCreateNode(type, position)
      setSelectedPalette(null)
    },
    [handleCreateNode],
  )

  const handleExport = useCallback(() => {
    setShowExportModal(true)
  }, [])

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }, [])

  const plantUmlText = showExportModal ? exportToPlantUml(nodes, edges) : ''

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ツールバー */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shadow-sm z-10 shrink-0">
        <span className="font-bold text-blue-600 text-lg">Diagramer</span>
        <span className="text-xs text-gray-400 font-mono">{id}</span>
        <div className="flex-1" />
        <RemoteCursors remoteUsers={remoteUsers} />
        <button
          onClick={handleCopyUrl}
          className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          title="URLをコピー"
        >
          {urlCopied ? 'コピーしました！' : 'URLをコピー'}
        </button>
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          PlantUML出力
        </button>
        <SaveStatusBadge status={saveStatus} />
        {isEditingName ? (
          <input
            autoFocus
            className="text-xs border border-gray-300 rounded px-2 py-0.5 w-32 focus:outline-none focus:border-blue-400"
            defaultValue={userName}
            onBlur={(e) => { updateUserName(e.target.value); setIsEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateUserName((e.target as HTMLInputElement).value); setIsEditingName(false) } }}
          />
        ) : (
          <button
            className="text-xs text-gray-500 hover:text-gray-800 border border-transparent hover:border-gray-200 rounded px-2 py-0.5 transition-colors"
            onClick={() => setIsEditingName(true)}
            title="クリックして名前を変更"
          >
            {userName}
          </button>
        )}
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
            onCreateNode={handleCreateNodeAndClearPalette}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
          />
        </div>
        <Sidebar
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNodeAndClearSelection}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdgeAndClearSelection}
        />
      </div>

      {/* パレット */}
      <Palette selected={selectedPalette} onSelect={setSelectedPalette} />

      {/* PlantUMLエクスポートモーダル */}
      {showExportModal && (
        <ExportModal text={plantUmlText} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}

export default function DiagramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DiagramStatus>('loading')

  useEffect(() => {
    if (!id) { navigate('/'); return }
    const check = async () => {
      try {
        const res = await fetch(`/api/diagrams/${id}`)
        if (res.status === 404) setStatus('not_found')
        else if (res.ok) setStatus('found')
        else setStatus('error')
      } catch { setStatus('error') }
    }
    check()
  }, [id, navigate])

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
        <button onClick={() => navigate('/')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors">
          トップに戻る
        </button>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-500 text-xl font-semibold">エラーが発生しました</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors">
          トップに戻る
        </button>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <DiagramEditor id={id!} />
    </ReactFlowProvider>
  )
}
