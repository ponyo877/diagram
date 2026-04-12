/**
 * Diagram Auto-Layout
 *
 * Hierarchy-aware grid layout with no external dependencies.
 * - Hierarchy edges (generalization/realization) place children below parents
 * - Remaining nodes fill a grid (max ~4 columns)
 * - Packages are placed separately with children inside
 */
import type { Node, Edge } from '@xyflow/react'

const H_GAP = 280
const V_GAP = 220
const MAX_COLS = 4
const PKG_PADDING = 40
const PKG_TAB_HEIGHT = 30

export function applyAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const packageNodes = nodes.filter((n) => n.type === 'package')
  const packageIds = new Set(packageNodes.map((n) => n.id))
  const topLevelNodes = nodes.filter((n) => !packageIds.has(n.id) && !n.parentId)
  const childNodesByPkg = new Map<string, Node[]>()

  for (const node of nodes) {
    if (node.parentId && packageIds.has(node.parentId)) {
      const children = childNodesByPkg.get(node.parentId) ?? []
      children.push(node)
      childNodesByPkg.set(node.parentId, children)
    }
  }

  // Build hierarchy from generalization/realization edges
  const hierarchyEdgeTypes = new Set(['generalization', 'realization'])
  const parentOf = new Map<string, string>()
  const childrenOf = new Map<string, string[]>()

  for (const edge of edges) {
    const edgeType = (edge.data as { edgeType?: string })?.edgeType
    if (edgeType && hierarchyEdgeTypes.has(edgeType)) {
      parentOf.set(edge.source, edge.target)
      const children = childrenOf.get(edge.target) ?? []
      children.push(edge.source)
      childrenOf.set(edge.target, children)
    }
  }

  // Identify root nodes (no hierarchy parent) and hierarchy children
  const hierarchyChildren = new Set(parentOf.keys())
  const rootNodes = topLevelNodes.filter((n) => !hierarchyChildren.has(n.id))

  // Position nodes using grid layout for roots, then place children below parents
  const positioned = new Map<string, { x: number; y: number }>()

  // Grid layout for root nodes
  const cols = Math.min(MAX_COLS, rootNodes.length)
  for (let i = 0; i < rootNodes.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    positioned.set(rootNodes[i].id, {
      x: col * H_GAP,
      y: row * V_GAP,
    })
  }

  // Place hierarchy children below their parents (recursive)
  function placeChildren(parentId: string, depth: number) {
    const children = childrenOf.get(parentId)
    if (!children) return
    const parentPos = positioned.get(parentId)
    if (!parentPos) return

    for (let i = 0; i < children.length; i++) {
      positioned.set(children[i], {
        x: parentPos.x + i * H_GAP,
        y: parentPos.y + depth * V_GAP,
      })
      placeChildren(children[i], 1)
    }
  }

  for (const root of rootNodes) {
    placeChildren(root.id, 1)
  }

  // Place any unpositioned hierarchy children (orphans)
  for (const node of topLevelNodes) {
    if (!positioned.has(node.id)) {
      const col = positioned.size % cols
      const row = Math.floor(positioned.size / cols)
      positioned.set(node.id, { x: col * H_GAP, y: row * V_GAP })
    }
  }

  // Package layout (placed below the main grid)
  const allYs = Array.from(positioned.values()).map((p) => p.y)
  let pkgStartY = (allYs.length > 0 ? Math.max(...allYs) : 0) + V_GAP * 1.5
  let pkgX = 0

  for (const pkg of packageNodes) {
    const children = childNodesByPkg.get(pkg.id) ?? []
    const pkgCols = Math.max(1, Math.ceil(Math.sqrt(children.length)))

    for (let i = 0; i < children.length; i++) {
      const col = i % pkgCols
      const row = Math.floor(i / pkgCols)
      positioned.set(children[i].id, {
        x: PKG_PADDING + col * (H_GAP * 0.8),
        y: PKG_TAB_HEIGHT + PKG_PADDING + row * (V_GAP * 0.8),
      })
    }

    const rows = Math.ceil(children.length / pkgCols) || 1
    const pkgWidth = Math.max(300, pkgCols * (H_GAP * 0.8) + PKG_PADDING * 2)
    const pkgHeight = Math.max(200, rows * (V_GAP * 0.8) + PKG_TAB_HEIGHT + PKG_PADDING * 2)

    positioned.set(pkg.id, { x: pkgX, y: pkgStartY })
    ;(pkg as Record<string, unknown>).__layoutSize = { width: pkgWidth, height: pkgHeight }
    pkgX += pkgWidth + H_GAP * 0.5
  }

  return nodes.map((node) => {
    const pos = positioned.get(node.id)
    if (!pos) return node

    const layoutSize = (node as Record<string, unknown>).__layoutSize as { width: number; height: number } | undefined
    const result = { ...node, position: pos }
    if (layoutSize) {
      result.style = { ...result.style, width: layoutSize.width, height: layoutSize.height }
      delete (result as Record<string, unknown>).__layoutSize
    }
    return result
  })
}
