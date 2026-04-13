import type { Node } from '@xyflow/react'

/**
 * Package のタブ領域の高さ（-TAB_HEIGHT から 0 の領域にタブが描画される）
 * PackageNode.tsx の top: -24 と一致させる
 */
export const PACKAGE_TAB_HEIGHT = 24

/**
 * 親チェーンを辿って絶対座標を計算する
 */
export function getNodeAbsolutePos(
  node: Node,
  allNodes: Node[],
  visited: Set<string> = new Set(),
): { x: number; y: number } {
  if (!node.parentId || visited.has(node.id)) return node.position
  visited.add(node.id)
  const parent = allNodes.find((p) => p.id === node.parentId)
  if (!parent) return node.position
  const pAbs = getNodeAbsolutePos(parent, allNodes, visited)
  return { x: pAbs.x + node.position.x, y: pAbs.y + node.position.y }
}

/**
 * Package のサイズ（デフォルト含む）を返す
 */
export function getPackageSize(pkg: Node): { width: number; height: number } {
  return {
    width: (pkg.style?.width as number) ?? 300,
    height: (pkg.style?.height as number) ?? 200,
  }
}

/**
 * 絶対座標 point が package 矩形内（タブ領域含む）に含まれるか判定する
 */
export function isPointInPackageBounds(
  point: { x: number; y: number },
  pkg: Node,
  allNodes: Node[],
): boolean {
  if (pkg.type !== 'package') return false
  const pAbs = getNodeAbsolutePos(pkg, allNodes)
  const { width, height } = getPackageSize(pkg)
  return (
    point.x >= pAbs.x &&
    point.x <= pAbs.x + width &&
    point.y >= pAbs.y - PACKAGE_TAB_HEIGHT && // タブ領域も判定に含める
    point.y <= pAbs.y + height
  )
}

/**
 * 指定した絶対座標 point が含まれる最内の Package を返す
 * 存在しない場合は null
 *
 * excludeId を指定すると、その ID（および子孫）の Package は除外される
 */
export function findContainingPackageAt(
  point: { x: number; y: number },
  allNodes: Node[],
  excludeId?: string,
): Node | null {
  const candidates = allNodes.filter((n) => {
    if (n.type !== 'package') return false
    if (excludeId && n.id === excludeId) return false
    // excludeId の子孫 package も除外
    if (excludeId && isDescendantOf(n.id, excludeId, allNodes)) return false
    return isPointInPackageBounds(point, n, allNodes)
  })

  if (candidates.length === 0) return null

  // 最小面積（最内）を選ぶ
  return candidates.sort((a, b) => {
    const aSize = getPackageSize(a)
    const bSize = getPackageSize(b)
    return aSize.width * aSize.height - bSize.width * bSize.height
  })[0]
}

/**
 * nodeId が ancestorId の子孫（再帰的に）かどうかを判定する
 */
export function isDescendantOf(nodeId: string, ancestorId: string, allNodes: Node[]): boolean {
  const node = allNodes.find((n) => n.id === nodeId)
  if (!node?.parentId) return false
  if (node.parentId === ancestorId) return true
  return isDescendantOf(node.parentId, ancestorId, allNodes)
}
