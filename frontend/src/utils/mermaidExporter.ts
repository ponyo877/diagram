import type { Node, Edge } from '@xyflow/react'
import type {
  ClassNodeData,
  EnumNodeData,
  NoteNodeData,
  PackageNodeData,
  DiagramEdgeData,
  EdgeMarker,
  LineStyle,
  Multiplicity,
  Visibility,
} from '../types/diagram'

/**
 * Mermaid class diagram exporter.
 *
 * 既存の PlantUML Exporter と同一構造のダイアグラムから、Mermaid `classDiagram` テキストを生成する。
 * Mermaid 9+ は namespace(package)、10+ でさらに機能追加だが、基本構文は Mermaid 8〜10 で動作する範囲に留める。
 */

const VIS_MAP: Record<Visibility, string> = {
  '+': '+',
  '-': '-',
  '#': '#',
  '~': '~',
}

const MULT_MAP: Record<Multiplicity, string> = {
  '1': '1',
  '0..n': '0..*',
  '1..n': '1..*',
  '0..1': '0..1',
}

/** Mermaid の class 名として安全な形式に変換（空白/記号を下線に） */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_') || 'Unnamed'
}

/** Mermaid のラベル内で使えない文字を除去/エスケープ */
function escapeMermaidLabel(s: string): string {
  return s.replace(/["`]/g, '')
}

/** edgeType → Mermaid 矢印マッピング（既存データ用の推論） */
function edgeArrowFromType(edgeType: string): string {
  switch (edgeType) {
    case 'generalization': return '<|--'
    case 'realization':    return '<|..'
    case 'dependency':     return '<..'
    case 'aggregation':    return 'o--'
    case 'composition':    return '*--'
    default:               return '--'
  }
}

/**
 * Mermaid の矢印を、明示指定された source/target マーカーと線スタイルから生成する。
 *
 * Mermaid class diagram の矢印は A [srcM] [line] [tgtM] B の形。
 * マーカー候補: <|, |>, <, >, *, o
 * 線: -- (solid), .. (dashed)
 */
function edgeArrowFromMarkers(
  sourceMarker: EdgeMarker | undefined,
  targetMarker: EdgeMarker | undefined,
  lineStyle: LineStyle | undefined,
): string {
  const line = lineStyle === 'dashed' ? '..' : '--'
  const markerToMermaid = (m: EdgeMarker | undefined, pos: 'src' | 'tgt'): string => {
    switch (m) {
      case 'arrow':
        return pos === 'src' ? '<' : '>'
      case 'triangle-open':
      case 'triangle-filled':
        return pos === 'src' ? '<|' : '|>'
      case 'diamond-open':
        return 'o'
      case 'diamond-filled':
        return '*'
      default:
        return ''
    }
  }
  const srcM = markerToMermaid(sourceMarker, 'src')
  const tgtM = markerToMermaid(targetMarker, 'tgt')
  return `${srcM}${line}${tgtM}`
}

/** 単一ノード → Mermaid 行に変換 */
function renderNode(node: Node, indent: string = ''): string[] {
  const data = node.data
  const result: string[] = []

  if ((data as ClassNodeData).nodeType === 'class' || (data as ClassNodeData).nodeType === 'interface') {
    const d = data as ClassNodeData
    const name = sanitizeName(d.name)
    result.push(`${indent}class ${name} {`)
    if (d.nodeType === 'interface') {
      result.push(`${indent}  <<interface>>`)
    } else if (d.stereotype) {
      const st = d.stereotype.replace(/<<|>>/g, '').trim()
      if (st) result.push(`${indent}  <<${st}>>`)
    }
    for (const attr of d.attributes) {
      // +name : type
      const type = attr.type ? ` : ${attr.type}` : ''
      result.push(`${indent}  ${VIS_MAP[attr.visibility]}${attr.name}${type}`)
    }
    for (const method of d.methods) {
      const params = method.parameters.map((p) => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ')
      const ret = method.returnType ? ` ${method.returnType}` : ''
      result.push(`${indent}  ${VIS_MAP[method.visibility]}${method.name}(${params})${ret}`)
    }
    result.push(`${indent}}`)
  } else if ((data as EnumNodeData).nodeType === 'enum') {
    const d = data as EnumNodeData
    const name = sanitizeName(d.name)
    result.push(`${indent}class ${name} {`)
    result.push(`${indent}  <<enumeration>>`)
    for (const v of d.values) {
      result.push(`${indent}  ${v.name}`)
    }
    result.push(`${indent}}`)
  } else if ((data as NoteNodeData).nodeType === 'note') {
    const d = data as NoteNodeData
    // Mermaid では note は standalone か note for <class>。standalone にする。
    result.push(`${indent}note "${escapeMermaidLabel(d.content)}"`)
  }

  return result
}

function formatMult(m?: Multiplicity): string {
  if (!m) return ''
  return `"${MULT_MAP[m]}"`
}

export function exportToMermaid(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['classDiagram']

  // Package nodes first (as namespaces), then children inside
  const packageNodes = nodes.filter((n) => (n.data as PackageNodeData).nodeType === 'package')
  const packageIds = new Set(packageNodes.map((n) => n.id))
  const childNodeIds = new Set(nodes.filter((n) => n.parentId).map((n) => n.id))

  // Namespaces (Mermaid 9+)
  for (const pkg of packageNodes) {
    const d = pkg.data as PackageNodeData
    const name = sanitizeName(d.name)
    lines.push(`namespace ${name} {`)
    const children = nodes.filter((n) => n.parentId === pkg.id)
    for (const child of children) {
      for (const l of renderNode(child, '  ')) {
        lines.push(l)
      }
    }
    lines.push('}')
  }

  // Top-level non-package nodes
  for (const node of nodes) {
    if (packageIds.has(node.id)) continue
    if (childNodeIds.has(node.id)) continue
    for (const l of renderNode(node, '')) {
      lines.push(l)
    }
  }

  // Edges
  for (const edge of edges) {
    const d = edge.data as DiagramEdgeData | undefined
    const src = nodes.find((n) => n.id === edge.source)
    const tgt = nodes.find((n) => n.id === edge.target)
    if (!src || !tgt) continue

    const srcName = sanitizeName((src.data as ClassNodeData).name ?? `N${edge.source}`)
    const tgtName = sanitizeName((tgt.data as ClassNodeData).name ?? `N${edge.target}`)

    const hasCustomMarkers =
      d?.sourceMarker !== undefined || d?.targetMarker !== undefined || d?.lineStyle !== undefined
    const arrow = hasCustomMarkers
      ? edgeArrowFromMarkers(d?.sourceMarker, d?.targetMarker, d?.lineStyle)
      : edgeArrowFromType(d?.edgeType ?? 'association')

    const srcMult = formatMult(d?.sourceMultiplicity)
    const tgtMult = formatMult(d?.targetMultiplicity)
    const labelSuffix = d?.label ? ` : ${escapeMermaidLabel(d.label)}` : ''

    // Mermaid syntax: ClassA "1" -- "0..*" ClassB : label
    const parts = [srcName]
    if (srcMult) parts.push(srcMult)
    parts.push(arrow)
    if (tgtMult) parts.push(tgtMult)
    parts.push(tgtName)
    lines.push(parts.join(' ') + labelSuffix)
  }

  return lines.join('\n')
}
