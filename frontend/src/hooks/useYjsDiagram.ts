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
  }
}
