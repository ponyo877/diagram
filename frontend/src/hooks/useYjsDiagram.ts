import { useState, useEffect, useCallback } from 'react'
import type { MutableRefObject } from 'react'
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
import { PACKAGE_TAB_HEIGHT, getNodeAbsolutePos, collectWithDescendants } from '../utils/packageHelpers'
import type { NodeType, DiagramEdgeData } from '../types/diagram'

const LOCAL_ORIGIN = 'local'

export function useYjsDiagram(
  ydoc: Y.Doc,
  defaultEdgeDataRef?: MutableRefObject<DiagramEdgeData | null>,
) {
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
      // 直前に使われたエッジ種別（あれば）をデフォルトに使う。なければ association
      const defaultData: DiagramEdgeData =
        defaultEdgeDataRef?.current ?? { edgeType: 'association' }
      const newEdge: Edge = {
        ...connection,
        id: nanoid(),
        type: 'diagram',
        data: { ...defaultData },
      } as Edge
      setEdges((eds) => [...eds, newEdge])
      ydoc.transact(() => {
        yEdges.set(newEdge.id, newEdge as unknown as Record<string, unknown>)
      }, LOCAL_ORIGIN)
    },
    [ydoc, yEdges, defaultEdgeDataRef],
  )

  const handleCreateNode = useCallback(
    (
      type: NodeType | string,
      position: { x: number; y: number },
      id?: string,
      data?: Record<string, unknown>,
      parentId?: string,
    ) => {
      const baseNode = createNode(type, position, id, data)
      const node: Node = parentId
        ? ({ ...baseNode, parentId, extent: 'parent' as const } as Node)
        : baseNode
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

  // ノード削除: Package を削除する場合は子孫も連動削除する。
  // また、削除されるすべてのノード（自身 + 子孫）を端点とするエッジも削除する。
  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        // 子孫含めた削除対象 ID 集合
        const idSet = collectWithDescendants([id], nds)
        setEdges((eds) => {
          const toDeleteEdges = eds.filter((e) => idSet.has(e.source) || idSet.has(e.target))
          ydoc.transact(() => {
            for (const nodeId of idSet) yNodes.delete(nodeId)
            for (const e of toDeleteEdges) yEdges.delete(e.id)
          }, LOCAL_ORIGIN)
          return eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
        })
        return nds.filter((n) => !idSet.has(n.id))
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
  // Package は常に最背面（zIndex: -1）に固定する仕様のため、Package の Z-order 変更は無視する
  const handleChangeZOrder = useCallback(
    (id: string, action: 'forward' | 'backward' | 'front' | 'back') => {
      setNodes((nds) => {
        const current = nds.find((n) => n.id === id)
        if (!current) return nds
        if (current.type === 'package') return nds // Package は最背面固定
        const allZ = nds.filter((n) => n.type !== 'package').map((n) => n.zIndex ?? 0)
        let newZ = current.zIndex ?? 0
        if (action === 'forward') newZ = newZ + 1
        else if (action === 'backward') newZ = newZ - 1
        else if (action === 'front') newZ = Math.max(0, ...allZ) + 1
        else if (action === 'back') newZ = Math.max(0, Math.min(0, ...allZ) - 1)

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

  // Auto-reparent: ノード移動後の親 Package 自動同期。
  // - 移動したノードが非Package: 中心が入っている最内 Package を親に設定（既存挙動）
  // - 移動したノードが Package: 加えて、Package 内に存在するすべての他ノードを自動で親=この Package に
  //   する。Package を動かしたら中身も追従する Figma/draw.io 流の動きに合わせる。
  const handleAutoReparent = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId)
        if (!node) return nds

        const isDescendant = (candidateId: string, ancestorId: string): boolean => {
          const n = nds.find((x) => x.id === candidateId)
          if (!n?.parentId) return false
          if (n.parentId === ancestorId) return true
          return isDescendant(n.parentId, ancestorId)
        }

        // ─── ヘルパー: 与えられた node について、最内の親 Package と新 position を返す
        const computeParenting = (
          n: Node,
          allNodes: Node[],
        ): { newParentId: string | null; newPos: { x: number; y: number } } => {
          const absPos = getNodeAbsolutePos(n, allNodes)
          const nodeW = (n.style?.width as number) ?? 180
          const nodeH = (n.style?.height as number) ?? 120
          const nodeCenter = { x: absPos.x + nodeW / 2, y: absPos.y + nodeH / 2 }

          const candidates = allNodes.filter((p) => {
            if (p.type !== 'package') return false
            if (p.id === n.id) return false
            // n が Package の場合: n の子孫 Package を親にしない（循環防止）
            if (n.type === 'package' && isDescendant(p.id, n.id)) return false
            const pAbs = getNodeAbsolutePos(p, allNodes)
            const pW = (p.style?.width as number) ?? 300
            const pH = (p.style?.height as number) ?? 200
            return (
              nodeCenter.x >= pAbs.x &&
              nodeCenter.x <= pAbs.x + pW &&
              nodeCenter.y >= pAbs.y - PACKAGE_TAB_HEIGHT &&
              nodeCenter.y <= pAbs.y + pH
            )
          })

          const target = candidates.sort((a, b) => {
            const aArea = ((a.style?.width as number) ?? 300) * ((a.style?.height as number) ?? 200)
            const bArea = ((b.style?.width as number) ?? 300) * ((b.style?.height as number) ?? 200)
            return aArea - bArea
          })[0]

          if (!target) return { newParentId: null, newPos: absPos }
          const pAbs = getNodeAbsolutePos(target, allNodes)
          return {
            newParentId: target.id,
            newPos: { x: absPos.x - pAbs.x, y: absPos.y - pAbs.y },
          }
        }

        // どのノードを再評価するか：
        // - 単体ノード移動: そのノード自身
        // - Package 移動: そのノード + Package の枠内に「自分の子孫ではない」全ノード
        //   (中身の追従は React Flow の親子関係による相対座標で自動。
        //    ここでは「Package 移動でその範囲内に新たに入ったノード」を親化する)
        const targets = new Set<string>([nodeId])
        if (node.type === 'package') {
          for (const other of nds) {
            if (other.id === nodeId) continue
            // 既に node の子孫なら追従済み（再評価不要）
            if (isDescendant(other.id, nodeId)) continue
            // node 自身の祖先（つまり node を内包する祖父 Package など）は親化対象外
            if (other.type === 'package' && isDescendant(nodeId, other.id)) continue
            // other が この Package 内に入っているか判定
            const oAbs = getNodeAbsolutePos(other, nds)
            const oW = (other.style?.width as number) ?? 180
            const oH = (other.style?.height as number) ?? 120
            const oCenter = { x: oAbs.x + oW / 2, y: oAbs.y + oH / 2 }
            const pAbs = getNodeAbsolutePos(node, nds)
            const pW = (node.style?.width as number) ?? 300
            const pH = (node.style?.height as number) ?? 200
            const inside =
              oCenter.x >= pAbs.x &&
              oCenter.x <= pAbs.x + pW &&
              oCenter.y >= pAbs.y - PACKAGE_TAB_HEIGHT &&
              oCenter.y <= pAbs.y + pH
            if (inside) targets.add(other.id)
          }
        }

        // 各対象ノードを順次再計算して累積適用
        let updated = nds
        const changedIds: string[] = []
        for (const id of targets) {
          const n = updated.find((x) => x.id === id)
          if (!n) continue
          const { newParentId, newPos } = computeParenting(n, updated)
          const currentParentId = n.parentId ?? null
          if (newParentId === currentParentId) continue
          updated = updated.map((x) => {
            if (x.id !== id) return x
            const next: Node = { ...x, position: newPos }
            if (newParentId) {
              next.parentId = newParentId
              next.extent = 'parent' as const
            } else {
              const cleaned: Record<string, unknown> = { ...next }
              delete cleaned.parentId
              delete cleaned.extent
              return cleaned as Node
            }
            return next
          })
          changedIds.push(id)
        }

        if (changedIds.length === 0) return nds

        ydoc.transact(() => {
          for (const id of changedIds) {
            const u = updated.find((n) => n.id === id)
            if (u) yNodes.set(id, u as unknown as Record<string, unknown>)
          }
        }, LOCAL_ORIGIN)
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
