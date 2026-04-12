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
import { EdgeActionsContext } from '../contexts/EdgeActionsContext'
import { nanoid } from 'nanoid'

type DiagramStatus = 'loading' | 'found' | 'not_found' | 'error'

/* ─── アイコンSVG ─── */

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconExport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#4a9ce8" />
      <rect x="4" y="4" width="56" height="20" rx="12" fill="#3d8ad6" />
      <rect x="4" y="16" width="56" height="8" fill="#3d8ad6" />
      <line x1="4" y1="30" x2="60" y2="30" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="4" y1="44" x2="60" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      <rect x="18" y="11" width="28" height="4" rx="2" fill="white" fillOpacity="0.95" />
      <rect x="10" y="34" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="39" width="26" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
      <rect x="10" y="48" width="32" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="53" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
    </svg>
  )
}

/* ─── メインエディター ─── */

function DiagramEditor({ id }: { id: string }) {
  const navigate = useNavigate()
  const [selectedPalette, setSelectedPalette] = useState<NodeType | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const clipboardNode = useRef<Node | null>(null)

  const { ydoc, provider, syncStatus } = useYjsProvider(id)
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    handleCreateNode, handleUpdateNode, handleDeleteNode,
    handleUpdateEdge, handleDeleteEdge,
  } = useYjsDiagram(ydoc)
  const { userName, updateUserName, remoteUsers, updateCursorPosition, clearCursorPosition } = useCollaboration(provider)
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
          handleCreateNode(src.type ?? 'class', { x: src.position.x + 20, y: src.position.y + 20 }, nanoid(), { ...src.data })
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

  const [edgeToolbarPos, setEdgeToolbarPos] = useState<{ x: number; y: number } | null>(null)

  const handleEdgeSelect = useCallback((edge: Edge | null, clickPos?: { x: number; y: number }) => {
    setSelectedEdgeId(edge?.id ?? null)
    if (edge) setSelectedNodeId(null)
    setEdgeToolbarPos(clickPos ?? null)
  }, [])

  const handleDeleteNodeAndClear = useCallback((nodeId: string) => {
    handleDeleteNode(nodeId); setSelectedNodeId(null)
  }, [handleDeleteNode])

  const handleDeleteEdgeAndClear = useCallback((edgeId: string) => {
    handleDeleteEdge(edgeId); setSelectedEdgeId(null)
  }, [handleDeleteEdge])

  const handleCreateNodeAndClear = useCallback((type: string, position: { x: number; y: number }) => {
    handleCreateNode(type, position); setSelectedPalette(null)
  }, [handleCreateNode])

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }, [])

  const plantUmlText = showExportModal ? exportToPlantUml(nodes, edges) : ''

  // 保存ステータス表示
  const saveColor = saveStatus === 'saved' ? 'text-soft-green' : saveStatus === 'offline' ? 'text-soft-red' : 'text-soft-muted'
  const saveTitle = saveStatus === 'saved' ? '保存済み' : saveStatus === 'offline' ? 'オフライン' : '保存中...'

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-soft-canvas">
      {/* フルスクリーンキャンバス */}
      <EdgeActionsContext.Provider value={{ onUpdateEdge: handleUpdateEdge, onDeleteEdge: handleDeleteEdgeAndClear, toolbarPosition: edgeToolbarPos }}>
      <Canvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        selectedPalette={selectedPalette}
        onCreateNode={handleCreateNodeAndClear}
        onNodeSelect={handleNodeSelect}
        onEdgeSelect={handleEdgeSelect}
        remoteUsers={remoteUsers}
        onCursorMove={updateCursorPosition}
        onCursorLeave={clearCursorPosition}
      />
      </EdgeActionsContext.Provider>

      {/* 左上: 透過ロゴ */}
      <button
        className="absolute top-3 left-4 z-10 opacity-40 hover:opacity-70 transition-opacity"
        onClick={() => navigate('/')}
        title="トップに戻る"
      >
        <LogoIcon />
      </button>

      {/* 右上: フローティングアクションバー */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <RemoteCursors remoteUsers={remoteUsers} />
        <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-soft-border px-1 py-1">
          {/* 保存ステータス */}
          <span className={`w-8 h-8 flex items-center justify-center ${saveColor}`} title={saveTitle}>
            {saveStatus === 'saved' ? <IconCheck /> : saveStatus === 'offline' ? '●' : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
          </span>

          <div className="w-px h-5 bg-soft-border" />

          {/* URL共有 */}
          <button
            onClick={handleCopyUrl}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${urlCopied ? 'text-soft-green' : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'}`}
            title={urlCopied ? '✓ コピー済み' : 'URLを共有'}
          >
            {urlCopied ? <IconCheck /> : <IconLink />}
          </button>

          {/* エクスポート */}
          <button
            onClick={() => setShowExportModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
            title="PlantUML エクスポート"
          >
            <IconExport />
          </button>

          <div className="w-px h-5 bg-soft-border" />

          {/* ユーザー名 */}
          {isEditingName ? (
            <input
              autoFocus
              className="text-xs bg-soft-input border border-soft-border rounded-lg px-2 py-1 w-24 text-soft-text focus:outline-none focus:border-soft-primary"
              defaultValue={userName}
              onBlur={(e) => { updateUserName(e.target.value); setIsEditingName(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { updateUserName((e.target as HTMLInputElement).value); setIsEditingName(false) } }}
            />
          ) : (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-soft-primary text-white text-xs font-bold"
              onClick={() => setIsEditingName(true)}
              title={`${userName} — クリックして変更`}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </div>

      {/* 右側: フローティングプロパティパネル */}
      {(selectedNode || selectedEdge) && (
        <div className="absolute top-14 right-3 z-10">
          <Sidebar
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNodeAndClear}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdgeAndClear}
          />
        </div>
      )}

      {/* 下部中央: フローティングパレット */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Palette selected={selectedPalette} onSelect={setSelectedPalette} />
      </div>

      {/* エクスポートモーダル */}
      {showExportModal && (
        <ExportModal text={plantUmlText} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}

/* ─── ページラッパー ─── */

export default function DiagramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DiagramStatus>('loading')

  useEffect(() => {
    if (!id) { navigate('/'); return }
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/diagrams/${id}`)
        if (res.status === 404) setStatus('not_found')
        else if (res.ok) setStatus('found')
        else setStatus('error')
      } catch { setStatus('error') }
    }
    check()
  }, [id, navigate])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-canvas">
        <p className="text-soft-muted text-lg">読み込み中...</p>
      </div>
    )
  }
  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-canvas gap-4">
        <p className="text-soft-text text-xl font-bold">ダイアグラムが見つかりません</p>
        <p className="text-soft-muted text-sm">URLが正しいか確認してください。削除済みの場合もあります。</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-soft-primary hover:bg-soft-primary-hover text-white px-6 py-2 rounded-full text-sm transition-colors">
          トップに戻る
        </button>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-canvas gap-4">
        <p className="text-soft-red text-xl font-bold">エラーが発生しました</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-soft-primary hover:bg-soft-primary-hover text-white px-6 py-2 rounded-full text-sm transition-colors">
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
