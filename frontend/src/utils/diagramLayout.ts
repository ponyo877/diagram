/**
 * Diagram Auto-Layout using Dagre (Sugiyama algorithm)
 *
 * Minimizes edge crossings by computing hierarchical layers.
 * Works with all UML relationship types.
 */
import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 180
const NODE_HEIGHT = 120
const PKG_PADDING = 40
const PKG_TAB_HEIGHT = 30

/**
 * Apply dagre auto-layout to nodes and edges.
 * Returns a new array with updated positions (does not mutate input).
 */
export function applyAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // Separate packages and their children
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

  // Build dagre graph for top-level nodes
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 80,
    edgesep: 30,
    marginx: 20,
    marginy: 20,
  })

  // Add nodes to dagre
  for (const node of topLevelNodes) {
    const w = node.type === 'note' ? 160 : NODE_WIDTH
    const h = node.type === 'note' ? 80 : NODE_HEIGHT
    g.setNode(node.id, { width: w, height: h })
  }

  // Add edges to dagre (only edges between top-level nodes)
  const topLevelIds = new Set(topLevelNodes.map((n) => n.id))
  for (const edge of edges) {
    if (topLevelIds.has(edge.source) && topLevelIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  // Run dagre layout
  dagre.layout(g)

  // Collect positions
  const positioned = new Map<string, { x: number; y: number }>()
  for (const node of topLevelNodes) {
    const pos = g.node(node.id)
    if (pos) {
      // dagre returns center coordinates; convert to top-left for React Flow
      positioned.set(node.id, {
        x: pos.x - (pos.width ?? NODE_WIDTH) / 2,
        y: pos.y - (pos.height ?? NODE_HEIGHT) / 2,
      })
    }
  }

  // Layout package children with a separate dagre graph per package
  const allTopY = Array.from(positioned.values()).map((p) => p.y)
  let pkgStartY = (allTopY.length > 0 ? Math.max(...allTopY) : 0) + NODE_HEIGHT + 100
  let pkgX = 0

  for (const pkg of packageNodes) {
    const children = childNodesByPkg.get(pkg.id) ?? []

    if (children.length > 0) {
      // Mini dagre graph for package children
      const pg = new dagre.graphlib.Graph()
      pg.setDefaultEdgeLabel(() => ({}))
      pg.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 })

      const childIds = new Set(children.map((c) => c.id))
      for (const child of children) {
        pg.setNode(child.id, { width: NODE_WIDTH * 0.8, height: NODE_HEIGHT * 0.8 })
      }
      for (const edge of edges) {
        if (childIds.has(edge.source) && childIds.has(edge.target)) {
          pg.setEdge(edge.source, edge.target)
        }
      }

      dagre.layout(pg)

      let maxCX = 0, maxCY = 0
      for (const child of children) {
        const cp = pg.node(child.id)
        if (cp) {
          const cx = PKG_PADDING + cp.x
          const cy = PKG_TAB_HEIGHT + PKG_PADDING + cp.y
          positioned.set(child.id, { x: cx, y: cy })
          maxCX = Math.max(maxCX, cx + (cp.width ?? 0))
          maxCY = Math.max(maxCY, cy + (cp.height ?? 0))
        }
      }

      const pkgWidth = Math.max(300, maxCX + PKG_PADDING)
      const pkgHeight = Math.max(200, maxCY + PKG_PADDING)
      positioned.set(pkg.id, { x: pkgX, y: pkgStartY })
      ;(pkg as Record<string, unknown>).__layoutSize = { width: pkgWidth, height: pkgHeight }
      pkgX += pkgWidth + 60
    } else {
      positioned.set(pkg.id, { x: pkgX, y: pkgStartY })
      pkgX += 360
    }
  }

  // Build result
  return nodes.map((node) => {
    const pos = positioned.get(node.id)
    if (!pos) return node

    const layoutSize = (node as Record<string, unknown>).__layoutSize as
      | { width: number; height: number }
      | undefined
    const result = { ...node, position: pos }
    if (layoutSize) {
      result.style = { ...result.style, width: layoutSize.width, height: layoutSize.height }
      delete (result as Record<string, unknown>).__layoutSize
    }
    return result
  })
}
