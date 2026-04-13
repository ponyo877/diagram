import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { NodeType } from '../types/diagram'
import Canvas from '../components/Canvas/Canvas'
import Palette from '../components/Palette/Palette'
import Sidebar from '../components/Sidebar/Sidebar'
import RemoteCursors from '../components/Cursors/RemoteCursors'
import ExportModal from '../components/ExportModal/ExportModal'
import ImportModal from '../components/ImportModal/ImportModal'
import ZoomControls from '../components/ZoomControls/ZoomControls'
import ShortcutsModal from '../components/ShortcutsModal/ShortcutsModal'
import ContextMenu, { type ContextMenuEntry } from '../components/ContextMenu/ContextMenu'
import CommandPalette, { type Command } from '../components/CommandPalette/CommandPalette'
import SearchBar from '../components/SearchBar/SearchBar'
import CommentLayer from '../components/Comments/CommentLayer'
import VersionPanel from '../components/VersionHistory/VersionPanel'
import { useDiagramMeta } from '../hooks/useDiagramMeta'
import { useComments } from '../hooks/useComments'
import { useToast } from '../contexts/ToastContext'
import { useYjsProvider } from '../hooks/useYjsProvider'
import { useYjsDiagram } from '../hooks/useYjsDiagram'
import { useCollaboration } from '../hooks/useCollaboration'
import { useAutoSave } from '../hooks/useAutoSave'
import { useUndoManager } from '../hooks/useUndoManager'
import { exportToPlantUml } from '../utils/plantUmlExporter'
import { applyAutoLayout } from '../utils/diagramLayout'
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
  const [showImportModal, setShowImportModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchMatchIds, setSearchMatchIds] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuEntry[] } | null>(null)
  const [followingClientId, setFollowingClientId] = useState<number | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const clipboardNode = useRef<Node | null>(null)

  const { ydoc, provider, syncStatus } = useYjsProvider(id)
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    handleCreateNode, handleUpdateNode, handleDeleteNode,
    handleUpdateEdge, handleDeleteEdge, handleImportDiagram, handleRelayout, handleChangeZOrder,
    handleGroupNodes, handleUngroupNodes,
  } = useYjsDiagram(ydoc)
  const { userName, updateUserName, remoteUsers, updateCursorPosition, clearCursorPosition, updateViewport } = useCollaboration(provider)
  const saveStatus = useAutoSave(ydoc, syncStatus)
  const { undo, redo } = useUndoManager(ydoc)
  const { fitView } = useReactFlow()
  const toast = useToast()
  const { name: diagramName, updateName: updateDiagramName } = useDiagramMeta(ydoc)
  const { comments, addComment, addReply, toggleResolved, deleteComment } = useComments(ydoc)
  const [commentMode, setCommentMode] = useState(false)
  const [pendingCommentPos, setPendingCommentPos] = useState<{ x: number; y: number } | null>(null)
  const [pendingCommentText, setPendingCommentText] = useState('')
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  // Update browser tab title
  useEffect(() => {
    const displayName = diagramName || 'Untitled'
    document.title = `Diagramer - ${displayName}`
    return () => { document.title = 'Diagramer' }
  }, [diagramName])

  // Follow mode: apply followed user's viewport
  const { setViewport, getViewport } = useReactFlow()
  useEffect(() => {
    if (followingClientId == null) return
    const user = remoteUsers.get(followingClientId)
    if (user?.viewport) {
      setViewport(user.viewport, { duration: 150 })
    }
  }, [followingClientId, remoteUsers, setViewport])

  // Broadcast my viewport for follow mode
  useEffect(() => {
    const interval = setInterval(() => {
      const vp = getViewport()
      updateViewport(vp)
    }, 300)
    return () => clearInterval(interval)
  }, [getViewport, updateViewport])

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
        // Multi-selection support: delete all selected
        if (selectedNodeIds.length > 0) {
          selectedNodeIds.forEach((id) => handleDeleteNode(id))
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId)
        }
        if (selectedEdgeIds.length > 0) {
          selectedEdgeIds.forEach((id) => handleDeleteEdge(id))
        } else if (selectedEdgeId) {
          handleDeleteEdge(selectedEdgeId)
        }
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
        if (e.key === '/') { e.preventDefault(); setShowShortcutsModal((v) => !v); return }
        if (e.key === 'k') { e.preventDefault(); setShowCommandPalette((v) => !v); return }
        if (e.key === 'f') { e.preventDefault(); setShowSearch((v) => !v); return }
        if (e.key === 'g') {
          e.preventDefault()
          if (e.shiftKey) {
            // Ungroup
            if (selectedNodeId) {
              const node = nodes.find((n) => n.id === selectedNodeId)
              if (node?.type === 'package') handleUngroupNodes(selectedNodeId)
            }
          } else {
            // Group selected
            const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : [])
            if (ids.length > 0) {
              handleGroupNodes(ids)
              toast.success(`Grouped ${ids.length} nodes`)
            }
          }
          return
        }
        // Z-order: Cmd+] / Cmd+[ (with optional Shift for front/back)
        if ((e.key === ']' || e.key === '[') && selectedNodeId) {
          e.preventDefault()
          const action = e.shiftKey
            ? (e.key === ']' ? 'front' : 'back')
            : (e.key === ']' ? 'forward' : 'backward')
          handleChangeZOrder(selectedNodeId, action as 'forward' | 'backward' | 'front' | 'back')
          return
        }
        if (e.key === 'c' && selectedNodeId) {
          e.preventDefault()
          const node = nodes.find((n) => n.id === selectedNodeId)
          if (node) clipboardNode.current = node
          return
        }
        if (e.key === 'x' && selectedNodeId) {
          e.preventDefault()
          const node = nodes.find((n) => n.id === selectedNodeId)
          if (node) {
            clipboardNode.current = node
            handleDeleteNode(selectedNodeId)
            setSelectedNodeId(null)
          }
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
  }, [selectedNodeId, selectedEdgeId, selectedNodeIds, selectedEdgeIds, handleDeleteNode, handleDeleteEdge, undo, redo, nodes, handleCreateNode, handleChangeZOrder, handleGroupNodes, handleUngroupNodes, toast])

  const selectedNode = selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null
  const selectedEdge = selectedEdgeId ? (edges.find((e) => e.id === selectedEdgeId) ?? null) : null

  // Multi-selection state (Shift+click, marquee). Single selection stays in selectedNodeId for backward compat.
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNodeId(node?.id ?? null)
    if (node) setSelectedEdgeId(null)
  }, [])

  const handleSelectionChange = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setSelectedNodeIds(nodeIds)
    setSelectedEdgeIds(edgeIds)
    // Keep single-selection state in sync for backward compat
    if (nodeIds.length === 1) {
      setSelectedNodeId(nodeIds[0])
      setSelectedEdgeId(null)
    } else if (nodeIds.length === 0 && edgeIds.length === 1) {
      setSelectedEdgeId(edgeIds[0])
      setSelectedNodeId(null)
    } else if (nodeIds.length === 0 && edgeIds.length === 0) {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
    }
    // For multi-select, clear single-selection panel
    if (nodeIds.length > 1 || edgeIds.length > 1) {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
    }
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

  // Context menu builders
  const buildNodeMenu = useCallback((nodeId: string): ContextMenuEntry[] => [
    { label: 'Bring to Front', shortcut: '⌘⇧]', action: () => handleChangeZOrder(nodeId, 'front') },
    { label: 'Bring Forward', shortcut: '⌘]', action: () => handleChangeZOrder(nodeId, 'forward') },
    { label: 'Send Backward', shortcut: '⌘[', action: () => handleChangeZOrder(nodeId, 'backward') },
    { label: 'Send to Back', shortcut: '⌘⇧[', action: () => handleChangeZOrder(nodeId, 'back') },
    { separator: true },
    {
      label: 'Duplicate',
      shortcut: '⌘D',
      action: () => {
        const node = nodes.find((n) => n.id === nodeId)
        if (node) {
          handleCreateNode(node.type ?? 'class', { x: node.position.x + 20, y: node.position.y + 20 }, nanoid(), { ...node.data })
        }
      },
    },
    { label: 'Copy', shortcut: '⌘C', action: () => {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) clipboardNode.current = node
    } },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => handleDeleteNode(nodeId) },
  ], [nodes, handleChangeZOrder, handleCreateNode, handleDeleteNode])

  const buildEdgeMenu = useCallback((edgeId: string): ContextMenuEntry[] => [
    { label: 'Delete Edge', shortcut: 'Del', danger: true, action: () => handleDeleteEdge(edgeId) },
  ], [handleDeleteEdge])

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
      toast.success('URL copied to clipboard')
    })
  }, [toast])

  const handleImport = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    handleImportDiagram(newNodes, newEdges)
    setShowImportModal(false)
    // Fit view after import (slight delay to let React Flow render the new nodes)
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1, duration: 300 }), 100)
    toast.success(`Imported ${newNodes.length} nodes, ${newEdges.length} edges`)
  }, [handleImportDiagram, fitView, toast])

  const handleAutoLayout = useCallback(() => {
    const layouted = applyAutoLayout(nodes, edges)
    handleRelayout(layouted)
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1, duration: 300 }), 100)
    toast.info('Layout applied')
  }, [nodes, edges, handleRelayout, fitView, toast])

  // buildPaneMenu depends on handleAutoLayout, so it must be declared AFTER it
  const buildPaneMenu = useCallback((): ContextMenuEntry[] => [
    { label: 'Paste', shortcut: '⌘V', action: () => {
      if (!clipboardNode.current) return
      const src = clipboardNode.current
      handleCreateNode(src.type ?? 'class', { x: src.position.x + 40, y: src.position.y + 40 }, nanoid(), { ...src.data })
    } },
    { separator: true },
    { label: 'Zoom to Fit', action: () => fitView({ padding: 0.2, duration: 250 }) },
    { label: 'Reset to 100%', action: () => fitView({ padding: 0.2, maxZoom: 1, duration: 250 }) },
    { separator: true },
    { label: 'Auto Layout', action: () => handleAutoLayout() },
  ], [handleCreateNode, fitView, handleAutoLayout])

  const buildCommands = useCallback((): Command[] => {
    return [
      { id: 'create-class', category: 'Create', label: 'Create Class', shortcut: 'C', action: () => setSelectedPalette('class') },
      { id: 'create-interface', category: 'Create', label: 'Create Interface', shortcut: 'I', action: () => setSelectedPalette('interface') },
      { id: 'create-enum', category: 'Create', label: 'Create Enum', shortcut: 'E', action: () => setSelectedPalette('enum') },
      { id: 'create-note', category: 'Create', label: 'Create Note', shortcut: 'N', action: () => setSelectedPalette('note') },
      { id: 'create-package', category: 'Create', label: 'Create Package', shortcut: 'P', action: () => setSelectedPalette('package') },
      { id: 'undo', category: 'Edit', label: 'Undo', shortcut: '⌘Z', action: () => undo() },
      { id: 'redo', category: 'Edit', label: 'Redo', shortcut: '⌘⇧Z', action: () => redo() },
      { id: 'delete', category: 'Edit', label: 'Delete Selected', shortcut: 'Del', action: () => {
        selectedNodeIds.forEach((id) => handleDeleteNode(id))
        selectedEdgeIds.forEach((id) => handleDeleteEdge(id))
      } },
      { id: 'group', category: 'Edit', label: 'Group Selected', shortcut: '⌘G', action: () => {
        const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : [])
        if (ids.length > 0) handleGroupNodes(ids)
      } },
      { id: 'export-plantuml', category: 'Export', label: 'Export PlantUML', action: () => setShowExportModal(true) },
      { id: 'export-png', category: 'Export', label: 'Export PNG', action: () => setShowExportModal(true) },
      { id: 'export-svg', category: 'Export', label: 'Export SVG', action: () => setShowExportModal(true) },
      { id: 'import', category: 'Import', label: 'Import PlantUML', action: () => setShowImportModal(true) },
      { id: 'layout', category: 'View', label: 'Auto Layout', action: () => handleAutoLayout() },
      { id: 'zoom-in', category: 'View', label: 'Zoom In', action: () => fitView({ duration: 200, maxZoom: 2 }) },
      { id: 'zoom-fit', category: 'View', label: 'Zoom to Fit', action: () => fitView({ padding: 0.2, duration: 250 }) },
      { id: 'zoom-100', category: 'View', label: 'Reset to 100%', action: () => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 }) },
      { id: 'search', category: 'Nav', label: 'Search...', shortcut: '⌘F', action: () => setShowSearch(true) },
      { id: 'shortcuts', category: 'Help', label: 'Keyboard Shortcuts', shortcut: '⌘/', action: () => setShowShortcutsModal(true) },
      { id: 'home', category: 'Nav', label: 'Back to Home', action: () => navigate('/') },
    ]
  }, [selectedNodeId, selectedNodeIds, selectedEdgeIds, handleDeleteNode, handleDeleteEdge, handleGroupNodes, handleAutoLayout, undo, redo, fitView, setViewport, navigate])

  const plantUmlText = showExportModal ? exportToPlantUml(nodes, edges) : ''

  // 保存ステータス表示
  const saveColor = saveStatus === 'saved' ? 'text-soft-green' : saveStatus === 'offline' ? 'text-soft-red' : 'text-soft-muted'
  const saveTitle = saveStatus === 'saved' ? 'Saved' : saveStatus === 'offline' ? 'Offline' : 'Saving...'

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-soft-canvas">
      {/* コメントモード: キャンバスオーバーレイでクリック位置を取得 */}
      {commentMode && !pendingCommentPos && (
        <div
          className="absolute inset-0 z-[1050] cursor-crosshair"
          onClick={(e) => {
            const reactFlowEl = document.querySelector('.react-flow')
            if (!reactFlowEl) return
            const rect = reactFlowEl.getBoundingClientRect()
            // Use useReactFlow().screenToFlowPosition through a ref or do this inline
            // Simpler: use current viewport to compute
            const vp = getViewport()
            const flowX = (e.clientX - rect.left - vp.x) / vp.zoom
            const flowY = (e.clientY - rect.top - vp.y) / vp.zoom
            setPendingCommentPos({ x: flowX, y: flowY })
          }}
        />
      )}

      {/* 保留中コメント入力 */}
      {pendingCommentPos && (
        <div
          className="absolute z-[1200] bg-white rounded-xl shadow-lg border border-soft-border p-2 w-64"
          style={{
            left: pendingCommentPos.x * getViewport().zoom + getViewport().x,
            top: pendingCommentPos.y * getViewport().zoom + getViewport().y,
          }}
        >
          <textarea
            autoFocus
            value={pendingCommentText}
            onChange={(e) => setPendingCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setPendingCommentPos(null); setPendingCommentText('') }
              if (e.key === 'Enter' && e.metaKey) {
                if (pendingCommentText.trim()) {
                  const user = Array.from(remoteUsers.values())[0]
                  // Get own color from awareness (fallback)
                  const ownColor = provider?.awareness?.getLocalState()?.color ?? '#4a9ce8'
                  const ownId = provider?.awareness?.getLocalState()?.userId ?? 'me'
                  addComment(pendingCommentPos, pendingCommentText.trim(), {
                    id: ownId,
                    name: userName,
                    color: ownColor,
                  })
                  toast.success('Comment added')
                  setPendingCommentPos(null)
                  setPendingCommentText('')
                }
              }
            }}
            placeholder="Comment... (⌘+Enter to submit)"
            className="w-full h-16 px-2 py-1 text-xs bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary resize-none"
          />
          <div className="flex justify-end gap-1 mt-1">
            <button
              onClick={() => { setPendingCommentPos(null); setPendingCommentText('') }}
              className="text-[10px] text-soft-muted hover:text-soft-text px-2 py-0.5 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pendingCommentText.trim()) {
                  const ownColor = provider?.awareness?.getLocalState()?.color ?? '#4a9ce8'
                  const ownId = provider?.awareness?.getLocalState()?.userId ?? 'me'
                  addComment(pendingCommentPos, pendingCommentText.trim(), {
                    id: ownId,
                    name: userName,
                    color: ownColor,
                  })
                  toast.success('Comment added')
                  setPendingCommentPos(null)
                  setPendingCommentText('')
                }
              }}
              className="text-[10px] bg-soft-primary hover:bg-soft-primary-hover text-white px-2 py-0.5 rounded-full"
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* フルスクリーンキャンバス */}
      <EdgeActionsContext.Provider value={{
        onUpdateEdge: handleUpdateEdge,
        onDeleteEdge: handleDeleteEdgeAndClear,
        toolbarPosition: edgeToolbarPos,
        sourceNodeName: selectedEdge ? ((nodes.find((n) => n.id === selectedEdge.source)?.data as Record<string, unknown>)?.name as string ?? null) : null,
        targetNodeName: selectedEdge ? ((nodes.find((n) => n.id === selectedEdge.target)?.data as Record<string, unknown>)?.name as string ?? null) : null,
      }}>
      <Canvas
        nodes={searchMatchIds.length > 0 ? nodes.map((n) => searchMatchIds.includes(n.id) ? { ...n, className: 'search-hit' } : n) : nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        selectedPalette={selectedPalette}
        onCreateNode={handleCreateNodeAndClear}
        onNodeSelect={handleNodeSelect}
        onEdgeSelect={handleEdgeSelect}
        onSelectionChange={handleSelectionChange}
        onNodeContextMenu={(e, node) => setContextMenu({ x: e.clientX, y: e.clientY, items: buildNodeMenu(node.id) })}
        onEdgeContextMenu={(e, edge) => setContextMenu({ x: e.clientX, y: e.clientY, items: buildEdgeMenu(edge.id) })}
        onPaneContextMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, items: buildPaneMenu() })}
        remoteUsers={remoteUsers}
        onCursorMove={updateCursorPosition}
        onCursorLeave={clearCursorPosition}
      />
      </EdgeActionsContext.Provider>

      {/* コメントレイヤー */}
      <CommentLayer
        comments={comments}
        onAddReply={(id, text) => addReply(id, text, { id: provider?.awareness?.getLocalState()?.userId ?? 'me', name: userName })}
        onToggleResolved={toggleResolved}
        onDelete={deleteComment}
        showResolved={false}
      />

      {/* 左上: 透過ロゴ + タイトル */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
        <button
          className="opacity-40 hover:opacity-70 transition-opacity"
          onClick={() => navigate('/')}
          title="Back to Home"
        >
          <LogoIcon />
        </button>
        {isEditingTitle ? (
          <input
            autoFocus
            defaultValue={diagramName}
            placeholder="Untitled"
            onBlur={(e) => { updateDiagramName(e.target.value); setIsEditingTitle(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { updateDiagramName((e.target as HTMLInputElement).value); setIsEditingTitle(false) }
              if (e.key === 'Escape') setIsEditingTitle(false)
            }}
            className="text-sm font-semibold bg-soft-input border border-soft-border rounded-lg px-2 py-1 w-48 text-soft-text focus:outline-none focus:border-soft-primary"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-sm font-semibold text-soft-text hover:bg-soft-hover px-2 py-1 rounded-lg transition-colors max-w-[240px] truncate"
            title="Click to rename"
          >
            {diagramName || 'Untitled'}
          </button>
        )}
      </div>

      {/* 右上: フローティングアクションバー */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <RemoteCursors
          remoteUsers={remoteUsers}
          followingClientId={followingClientId}
          onFollow={setFollowingClientId}
        />
        <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-soft-border px-1 py-1">
          {/* 保存ステータス */}
          <span className={`w-9 h-10 flex flex-col items-center justify-center gap-0.5 ${saveColor}`} title={saveTitle}>
            {saveStatus === 'saved' ? <IconCheck /> : saveStatus === 'offline' ? '●' : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            <span className="text-[7px] leading-none">{saveStatus === 'saved' ? 'Saved' : saveStatus === 'offline' ? 'Offline' : '...'}</span>
          </span>

          <div className="w-px h-8 bg-soft-border" />

          {/* URL共有 */}
          <button
            onClick={handleCopyUrl}
            className={`w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${urlCopied ? 'text-soft-green' : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'}`}
            title={urlCopied ? '✓ Copied' : 'Share URL'}
          >
            {urlCopied ? <IconCheck /> : <IconLink />}
            <span className="text-[7px] leading-none">Share</span>
          </button>

          {/* インポート */}
          <button
            onClick={() => setShowImportModal(true)}
            className="w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
            title="PlantUML Import"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="text-[7px] leading-none">Import</span>
          </button>

          {/* エクスポート */}
          <button
            onClick={() => setShowExportModal(true)}
            className="w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
            title="PlantUML Export"
          >
            <IconExport />
            <span className="text-[7px] leading-none">Export</span>
          </button>

          {/* History */}
          <button
            onClick={() => setShowVersionPanel(true)}
            className="w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
            title="Version History"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[7px] leading-none">History</span>
          </button>

          {/* Comment Mode Toggle */}
          <button
            onClick={() => setCommentMode((v) => !v)}
            className={`w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
              commentMode ? 'bg-soft-primary-light text-soft-primary' : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
            }`}
            title="Toggle Comment Mode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[7px] leading-none">Comment</span>
          </button>

          {/* Auto Layout */}
          <button
            onClick={handleAutoLayout}
            className="w-9 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
            title="Auto Layout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="text-[7px] leading-none">Layout</span>
          </button>

          <div className="w-px h-8 bg-soft-border" />

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
              title={`${userName} — Click to rename`}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </div>

      {/* 複数選択時: 件数 + 一括削除 */}
      {selectedNodeIds.length + selectedEdgeIds.length > 1 && (
        <div className="absolute top-14 right-3 z-10">
          <div className="w-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-soft-border p-4 flex flex-col gap-3">
            <div className="text-[11px] font-bold text-soft-muted uppercase tracking-widest">
              {selectedNodeIds.length + selectedEdgeIds.length} items selected
            </div>
            <div className="text-xs text-soft-muted">
              {selectedNodeIds.length} node{selectedNodeIds.length !== 1 ? 's' : ''},{' '}
              {selectedEdgeIds.length} edge{selectedEdgeIds.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => {
                selectedNodeIds.forEach((id) => handleDeleteNode(id))
                selectedEdgeIds.forEach((id) => handleDeleteEdge(id))
                setSelectedNodeIds([])
                setSelectedEdgeIds([])
              }}
              className="text-[11px] text-soft-red hover:text-red-700 text-left"
            >
              Delete All Selected
            </button>
          </div>
        </div>
      )}

      {/* 右側: フローティングプロパティパネル */}
      {selectedNodeIds.length + selectedEdgeIds.length <= 1 && (selectedNode || selectedEdge) && (
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

      {/* 左下: ズームコントロール */}
      <div className="absolute bottom-4 left-4 z-10">
        <ZoomControls />
      </div>

      {/* エクスポートモーダル */}
      {showExportModal && (
        <ExportModal
          text={plantUmlText}
          nodes={nodes}
          onClose={() => setShowExportModal(false)}
          onToast={(msg, type) => type === 'error' ? toast.error(msg) : toast.success(msg)}
        />
      )}

      {/* インポートモーダル */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />
      )}

      {/* ショートカットモーダル */}
      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}

      {/* コマンドパレット */}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          commands={buildCommands()}
        />
      )}

      {/* 検索バー */}
      {showSearch && (
        <SearchBar
          nodes={nodes}
          onClose={() => { setShowSearch(false); setSearchMatchIds([]) }}
          onMatchChange={setSearchMatchIds}
        />
      )}

      {/* バージョン履歴パネル */}
      {showVersionPanel && (
        <VersionPanel
          diagramId={id}
          onClose={() => setShowVersionPanel(false)}
          onRestore={() => setShowVersionPanel(false)}
          onToast={(msg, type) => type === 'error' ? toast.error(msg) : toast.success(msg)}
        />
      )}

      {/* フォロー中バッジ */}
      {followingClientId != null && (() => {
        const u = remoteUsers.get(followingClientId)
        return u ? (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-soft-border px-3 py-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
            <span>Following <strong>{u.name}</strong></span>
            <button
              onClick={() => setFollowingClientId(null)}
              className="text-soft-muted hover:text-soft-text ml-2"
            >
              Stop
            </button>
          </div>
        ) : null
      })()}
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
        <p className="text-soft-muted text-lg">Loading...</p>
      </div>
    )
  }
  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-canvas gap-4">
        <p className="text-soft-text text-xl font-bold">Diagram not found</p>
        <p className="text-soft-muted text-sm">Please check the URL. It may have been deleted.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-soft-primary hover:bg-soft-primary-hover text-white px-6 py-2 rounded-full text-sm transition-colors">
          Back to Home
        </button>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-canvas gap-4">
        <p className="text-soft-red text-xl font-bold">An error occurred</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-soft-primary hover:bg-soft-primary-hover text-white px-6 py-2 rounded-full text-sm transition-colors">
          Back to Home
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
