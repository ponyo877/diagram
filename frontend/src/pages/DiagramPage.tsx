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
    return <span className="text-xs text-white/50">保存中...</span>
  }
  if (status === 'offline') {
    return <span className="text-xs text-red-400">● オフライン</span>
  }
  return <span className="text-xs text-figma-green">✓ 保存済み</span>
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
      // パレットショートカット
      if (!e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === 'c' && !selectedNodeId) { setSelectedPalette('class'); return }
        if (key === 'i') { setSelectedPalette('interface'); return }
        if (key === 'e') { setSelectedPalette('enum'); return }
        if (key === 'n') { setSelectedPalette('note'); return }
        if (key === 'p') { setSelectedPalette('package'); return }
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
      {/* ダークツールバー */}
      <div className="h-10 bg-figma-toolbar border-b border-figma-toolbar-border flex items-center px-3 gap-2 shrink-0 z-20">
        <span className="text-white font-semibold text-sm tracking-tight">Diagramer</span>
        <div className="w-px h-4 bg-figma-toolbar-border mx-1" />
        <span className="text-figma-muted text-xs font-mono truncate max-w-[160px]">{id.slice(0, 8)}…</span>
        <div className="flex-1" />
        <RemoteCursors remoteUsers={remoteUsers} />
        <button
          onClick={handleCopyUrl}
          className="text-xs text-figma-muted hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
          title="URLをコピー"
        >
          {urlCopied ? '✓ コピー' : 'URL共有'}
        </button>
        <button
          onClick={handleExport}
          className="text-xs bg-figma-blue hover:bg-figma-blue-hover text-white px-3 py-1.5 rounded font-medium transition-colors"
        >
          エクスポート
        </button>
        <SaveStatusBadge status={saveStatus} />
        {isEditingName ? (
          <input
            autoFocus
            className="text-xs bg-white/10 border border-white/20 rounded px-2 py-0.5 w-28 text-white focus:outline-none focus:border-figma-blue"
            defaultValue={userName}
            onBlur={(e) => { updateUserName(e.target.value); setIsEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateUserName((e.target as HTMLInputElement).value); setIsEditingName(false) } }}
          />
        ) : (
          <button
            className="text-xs text-white/80 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
            onClick={() => setIsEditingName(true)}
            title="クリックして名前を変更"
          >
            {userName}
          </button>
        )}
      </div>

      {/* メインエリア: 左パレット + キャンバス + 右サイドバー */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左サイドパレット */}
        <Palette selected={selectedPalette} onSelect={setSelectedPalette} />

        {/* キャンバス */}
        <div className="flex-1 overflow-hidden bg-figma-canvas">
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

        {/* 右プロパティパネル */}
        <Sidebar
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNodeAndClearSelection}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdgeAndClearSelection}
        />
      </div>

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
      <div className="min-h-screen flex items-center justify-center bg-figma-canvas">
        <p className="text-figma-muted text-lg">読み込み中...</p>
      </div>
    )
  }
  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-figma-canvas gap-4">
        <p className="text-figma-text text-xl font-semibold">ダイアグラムが見つかりません</p>
        <p className="text-figma-muted text-sm">URLが正しいか確認してください。削除済みの場合もあります。</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-figma-blue hover:bg-figma-blue-hover text-white px-6 py-2 rounded text-sm transition-colors">
          トップに戻る
        </button>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-figma-canvas gap-4">
        <p className="text-figma-red text-xl font-semibold">エラーが発生しました</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-figma-blue hover:bg-figma-blue-hover text-white px-6 py-2 rounded text-sm transition-colors">
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
