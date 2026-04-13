import { useState, useEffect, useCallback } from 'react'
import * as Y from 'yjs'
import {
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
import { nanoid } from 'nanoid'
import { createNode } from '../utils/nodeFactory'
import type { NodeType } from '../types/diagram'

const LOCAL_ORIGIN = 'local'

export function useYjsDiagram(ydoc: Y.Doc) {
  const yNodes = ydoc.getMap<Record<string, unknown>>('nodes')
  const yEdges = ydoc.getMap<Record<string, unknown>>('edges')

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Yjs → React (remote updates only)
  useEffect(() => {
    const nodeObserver = (_: Y.YMapEvent<Record<string, unknown>>, tx: Y.Transaction) => {
      if (tx.origin === LOCAL_ORIGIN) return
      setNodes(Array.from(yNodes.values()) as Node[])
    }
    const edgeObserver = (_: Y.YMapEvent<Record<string, unknown>>, tx: Y.Transaction) => {
      if (tx.origin === LOCAL_ORIGIN) return
      setEdges(Array.from(yEdges.values()) as Edge[])
    }
    yNodes.observe(nodeObserver)
    yEdges.observe(edgeObserver)
    return () => {
      yNodes.unobserve(nodeObserver)
      yEdges.unobserve(edgeObserver)
    }
  }, [ydoc, yNodes, yEdges])

  // React Flow → Yjs (local changes)
  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds)
        ydoc.transact(() => {
          changes.forEach((change) => {
            if (change.type === 'remove') {
              yNodes.delete(change.id)
            } else {
              const node = updated.find((n) => n.id === change.id)
              if (node) yNodes.set(node.id, node as unknown as Record<string, unknown>)
            }
          })
        }, LOCAL_ORIGIN)
        return updated
      })
    },
    [ydoc, yNodes],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds)
        ydoc.transact(() => {
          changes.forEach((change) => {
            if (change.type === 'remove') {
              yEdges.delete(change.id)
            } else {
              const edge = updated.find((e) => e.id === change.id)
              if (edge) yEdges.set(edge.id, edge as unknown as Record<string, unknown>)
            }
          })
        }, LOCAL_ORIGIN)
        return updated
      })
    },
    [ydoc, yEdges],
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: nanoid(),
        type: 'diagram',
        data: { edgeType: 'association' },
      } as Edge
      setEdges((eds) => [...eds, newEdge])
      ydoc.transact(() => {
        yEdges.set(newEdge.id, newEdge as unknown as Record<string, unknown>)
      }, LOCAL_ORIGIN)
    },
    [ydoc, yEdges],
  )

  const handleCreateNode = useCallback(
    (type: NodeType | string, position: { x: number; y: number }, id?: string, data?: Record<string, unknown>) => {
      const node = createNode(type, position, id, data)
      setNodes((nds) => [...nds, node])
      ydoc.transact(() => {
        yNodes.set(node.id, node as unknown as Record<string, unknown>)
      }, LOCAL_ORIGIN)
    },
    [ydoc, yNodes],
  )

  const handleUpdateNode = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) => {
        const updated = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
        const node = updated.find((n) => n.id === id)
        if (node) {
          ydoc.transact(() => {
            yNodes.set(id, node as unknown as Record<string, unknown>)
          }, LOCAL_ORIGIN)
        }
        return updated
      })
    },
    [ydoc, yNodes],
  )

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => {
        const toDelete = eds.filter((e) => e.source === id || e.target === id)
        ydoc.transact(() => {
          yNodes.delete(id)
          toDelete.forEach((e) => yEdges.delete(e.id))
        }, LOCAL_ORIGIN)
        return eds.filter((e) => e.source !== id && e.target !== id)
      })
    },
    [ydoc, yNodes, yEdges],
  )

  const handleUpdateEdge = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setEdges((eds) => {
        const updated = eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } } : e))
        const edge = updated.find((e) => e.id === id)
        if (edge) {
          ydoc.transact(() => {
            yEdges.set(id, edge as unknown as Record<string, unknown>)
          }, LOCAL_ORIGIN)
        }
        return updated
      })
    },
    [ydoc, yEdges],
  )

  const handleDeleteEdge = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== id))
      ydoc.transact(() => {
        yEdges.delete(id)
      }, LOCAL_ORIGIN)
    },
    [ydoc, yEdges],
  )

  // バッチインポート（単一トランザクションで一括追加 → Ctrl+Z で一括アンドゥ可能）
  const handleImportDiagram = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      setNodes((nds) => [...nds, ...newNodes])
      setEdges((eds) => [...eds, ...newEdges])
      ydoc.transact(() => {
        for (const node of newNodes) {
          yNodes.set(node.id, node as unknown as Record<string, unknown>)
        }
        for (const edge of newEdges) {
          yEdges.set(edge.id, edge as unknown as Record<string, unknown>)
        }
      }, LOCAL_ORIGIN)
    },
    [ydoc, yNodes, yEdges],
  )

  // Z-order: bring forward / backward / to front / to back
  const handleChangeZOrder = useCallback(
    (id: string, action: 'forward' | 'backward' | 'front' | 'back') => {
      setNodes((nds) => {
        const current = nds.find((n) => n.id === id)
        if (!current) return nds
        const allZ = nds.map((n) => n.zIndex ?? 0)
        let newZ = current.zIndex ?? 0
        if (action === 'forward') newZ = newZ + 1
        else if (action === 'backward') newZ = newZ - 1
        else if (action === 'front') newZ = Math.max(...allZ) + 1
        else if (action === 'back') newZ = Math.min(...allZ) - 1

        const updated = nds.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n))
        const node = updated.find((n) => n.id === id)
        if (node) {
          ydoc.transact(() => {
            yNodes.set(id, node as unknown as Record<string, unknown>)
          }, LOCAL_ORIGIN)
        }
        return updated
      })
    },
    [ydoc, yNodes],
  )

  // Auto-reparent: after a node drag, check if it's inside a package
  // If yes, set parentId; if it was inside one and now outside, remove parentId.
  // Coordinates are converted accordingly so visual position stays the same.
  const handleAutoReparent = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId)
        if (!node || node.type === 'package') return nds

        // Compute absolute position (accounting for existing parent chain)
        const getAbsPos = (n: Node, visited = new Set<string>()): { x: number; y: number } => {
          if (!n.parentId || visited.has(n.id)) return n.position
          visited.add(n.id)
          const parent = nds.find((p) => p.id === n.parentId)
          if (!parent) return n.position
          const pAbs = getAbsPos(parent, visited)
          return { x: pAbs.x + n.position.x, y: pAbs.y + n.position.y }
        }

        const absPos = getAbsPos(node)
        const nodeW = (node.style?.width as number) ?? 180
        const nodeH = (node.style?.height as number) ?? 120
        const nodeCenter = { x: absPos.x + nodeW / 2, y: absPos.y + nodeH / 2 }

        // Find all packages whose bounds contain this node's center
        const containingPackages = nds.filter((p) => {
          if (p.type !== 'package') return false
          if (p.id === nodeId) return false
          const pAbs = getAbsPos(p)
          const pW = (p.style?.width as number) ?? 300
          const pH = (p.style?.height as number) ?? 200
          return (
            nodeCenter.x >= pAbs.x &&
            nodeCenter.x <= pAbs.x + pW &&
            nodeCenter.y >= pAbs.y &&
            nodeCenter.y <= pAbs.y + pH
          )
        })

        // Pick innermost (smallest area) package
        const targetPackage = containingPackages.sort((a, b) => {
          const aArea = ((a.style?.width as number) ?? 300) * ((a.style?.height as number) ?? 200)
          const bArea = ((b.style?.width as number) ?? 300) * ((b.style?.height as number) ?? 200)
          return aArea - bArea
        })[0]

        const currentParentId = node.parentId ?? null
        const newParentId = targetPackage?.id ?? null
        if (newParentId === currentParentId) return nds

        // Compute new position for the node relative to its new parent (or absolute if unparented)
        let newPos = absPos
        if (targetPackage) {
          const pAbs = getAbsPos(targetPackage)
          newPos = { x: absPos.x - pAbs.x, y: absPos.y - pAbs.y }
        }

        const updated = nds.map((n) => {
          if (n.id !== nodeId) return n
          const next: Node = {
            ...n,
            position: newPos,
          }
          if (newParentId) {
            next.parentId = newParentId
          } else {
            // Remove parentId when leaving all packages
            const cleaned: Record<string, unknown> = { ...next }
            delete cleaned.parentId
            delete cleaned.extent
            return cleaned as Node
          }
          return next
        })

        const updatedNode = updated.find((n) => n.id === nodeId)
        if (updatedNode) {
          ydoc.transact(() => {
            yNodes.set(nodeId, updatedNode as unknown as Record<string, unknown>)
          }, LOCAL_ORIGIN)
        }
        return updated
      })
    },
    [ydoc, yNodes],
  )

  // Group: wrap selected nodes inside a new Package
  const handleGroupNodes = useCallback(
    (ids: string[]) => {
      if (ids.length < 1) return
      setNodes((nds) => {
        const targets = nds.filter((n) => ids.includes(n.id) && !n.parentId)
        if (targets.length === 0) return nds

        // Compute bounding box
        const positions = targets.map((n) => ({
          x: n.position.x,
          y: n.position.y,
          w: (n.style?.width as number) ?? 180,
          h: (n.style?.height as number) ?? 120,
        }))
        const minX = Math.min(...positions.map((p) => p.x))
        const minY = Math.min(...positions.map((p) => p.y))
        const maxX = Math.max(...positions.map((p) => p.x + p.w))
        const maxY = Math.max(...positions.map((p) => p.y + p.h))
        const padding = 40
        const tabHeight = 30

        const groupId = nanoid()
        const groupNode = {
          id: groupId,
          type: 'package',
          position: { x: minX - padding, y: minY - padding - tabHeight },
          style: {
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2 + tabHeight,
          },
          zIndex: -1,
          data: {
            nodeType: 'package',
            name: 'Group',
            color: '#f0ebe3',
          },
        } as Node

        // Update children: assign parentId and convert to relative positions
        const updatedChildren = targets.map((n) => ({
          ...n,
          parentId: groupId,
          position: {
            x: n.position.x - (minX - padding),
            y: n.position.y - (minY - padding - tabHeight),
          },
          extent: 'parent' as const,
        }))

        const updatedIds = new Set(targets.map((n) => n.id))
        const result = [...nds.filter((n) => !updatedIds.has(n.id)), groupNode, ...updatedChildren]

        ydoc.transact(() => {
          yNodes.set(groupNode.id, groupNode as unknown as Record<string, unknown>)
          for (const c of updatedChildren) {
            yNodes.set(c.id, c as unknown as Record<string, unknown>)
          }
        }, LOCAL_ORIGIN)

        return result
      })
    },
    [ydoc, yNodes],
  )

  // Ungroup: remove package parent, move children back to top-level
  const handleUngroupNodes = useCallback(
    (packageId: string) => {
      setNodes((nds) => {
        const pkg = nds.find((n) => n.id === packageId)
        if (!pkg || pkg.type !== 'package') return nds
        const children = nds.filter((n) => n.parentId === packageId)

        const updatedChildren = children.map((c) => ({
          ...c,
          parentId: undefined,
          extent: undefined,
          position: {
            x: c.position.x + pkg.position.x,
            y: c.position.y + pkg.position.y,
          },
        }))

        const toRemove = new Set([packageId, ...children.map((c) => c.id)])
        const result = [...nds.filter((n) => !toRemove.has(n.id)), ...updatedChildren]

        ydoc.transact(() => {
          yNodes.delete(packageId)
          for (const c of updatedChildren) {
            yNodes.set(c.id, c as unknown as Record<string, unknown>)
          }
        }, LOCAL_ORIGIN)

        return result
      })
    },
    [ydoc, yNodes],
  )

  // Relayout: update all node positions in a single transaction
  const handleRelayout = useCallback(
    (layoutedNodes: Node[]) => {
      setNodes(layoutedNodes)
      ydoc.transact(() => {
        for (const node of layoutedNodes) {
          yNodes.set(node.id, node as unknown as Record<string, unknown>)
        }
      }, LOCAL_ORIGIN)
    },
    [ydoc, yNodes],
  )

  return {
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
    handleImportDiagram,
    handleRelayout,
    handleChangeZOrder,
    handleGroupNodes,
    handleUngroupNodes,
    handleAutoReparent,
  }
}
