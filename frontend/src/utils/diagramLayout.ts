/**
 * Diagram Auto-Layout — インポート時のノード自動配置
 *
 * 外部ライブラリに依存しない軽量実装。
 * 汎化/実現エッジを基に階層を構築し、グリッド配置する。
 */
import type { Node, Edge } from '@xyflow/react'

const H_GAP = 280
const V_GAP = 220
const PKG_PADDING = 40
const PKG_TAB_HEIGHT = 30

/**
 * ノードに自動レイアウトを適用して位置を設定する（元の配列を変更せず新しい配列を返す）
 */
export function applyAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // パッケージノードとそれ以外を分離
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

  // 階層を構築（汎化/実現エッジに基づく）
  const hierarchyEdgeTypes = new Set(['generalization', 'realization'])
  const parentOf = new Map<string, string>() // childId → parentId (in hierarchy)

  for (const edge of edges) {
    const edgeType = (edge.data as { edgeType?: string })?.edgeType
    if (edgeType && hierarchyEdgeTypes.has(edgeType)) {
      // generalization: source extends target → target is parent
      parentOf.set(edge.source, edge.target)
    }
  }

  // 階層レベルを割り当て
  const levels = new Map<string, number>()

  function getLevel(nodeId: string): number {
    if (levels.has(nodeId)) return levels.get(nodeId)!
    const parent = parentOf.get(nodeId)
    const level = parent ? getLevel(parent) + 1 : 0
    levels.set(nodeId, level)
    return level
  }

  for (const node of topLevelNodes) {
    getLevel(node.id)
  }

  // レベル別にグループ化
  const byLevel = new Map<number, Node[]>()
  for (const node of topLevelNodes) {
    const level = levels.get(node.id) ?? 0
    const group = byLevel.get(level) ?? []
    group.push(node)
    byLevel.set(level, group)
  }

  // 位置を計算
  const positioned = new Map<string, { x: number; y: number }>()
  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b)

  for (const level of sortedLevels) {
    const group = byLevel.get(level)!
    const totalWidth = (group.length - 1) * H_GAP
    const startX = -totalWidth / 2

    for (let i = 0; i < group.length; i++) {
      positioned.set(group[i].id, {
        x: startX + i * H_GAP,
        y: level * V_GAP,
      })
    }
  }

  // パッケージの配置（右側にオフセット）
  const maxX = Math.max(0, ...Array.from(positioned.values()).map((p) => p.x)) + H_GAP
  let pkgOffsetY = 0

  for (const pkg of packageNodes) {
    const children = childNodesByPkg.get(pkg.id) ?? []
    const cols = Math.max(1, Math.ceil(Math.sqrt(children.length)))

    // 子ノードの配置（パッケージ内相対座標）
    for (let i = 0; i < children.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      positioned.set(children[i].id, {
        x: PKG_PADDING + col * (H_GAP * 0.8),
        y: PKG_TAB_HEIGHT + PKG_PADDING + row * (V_GAP * 0.8),
      })
    }

    // パッケージサイズの計算
    const rows = Math.ceil(children.length / cols) || 1
    const pkgWidth = Math.max(300, cols * (H_GAP * 0.8) + PKG_PADDING * 2)
    const pkgHeight = Math.max(200, rows * (V_GAP * 0.8) + PKG_TAB_HEIGHT + PKG_PADDING * 2)

    positioned.set(pkg.id, { x: maxX + H_GAP, y: pkgOffsetY })
    // パッケージのstyleを更新するためにサイズも記録
    ;(pkg as Record<string, unknown>).__layoutSize = { width: pkgWidth, height: pkgHeight }
    pkgOffsetY += pkgHeight + V_GAP * 0.5
  }

  // 結果を構築
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
