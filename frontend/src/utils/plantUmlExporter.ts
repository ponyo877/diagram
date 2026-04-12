import type { Node, Edge } from '@xyflow/react'
import type {
  ClassNodeData,
  EnumNodeData,
  NoteNodeData,
  PackageNodeData,
  DiagramEdgeData,
  Visibility,
  Multiplicity,
} from '../types/diagram'

const VISIBILITY_MAP: Record<Visibility, string> = {
  '+': '+',
  '-': '-',
  '#': '#',
  '~': '~',
}

const MULTIPLICITY_MAP: Record<Multiplicity, string> = {
  '1': '1',
  '0..n': '0..*',
  '1..n': '1..*',
  '0..1': '0..1',
}

function edgeArrow(edgeType: string): string {
  switch (edgeType) {
    case 'generalization': return '--|>'
    case 'realization':    return '..|>'
    case 'dependency':     return '-->'
    case 'aggregation':    return '--o'
    case 'composition':    return '--*'
    default:               return '--'
  }
}

function formatMult(m?: Multiplicity): string {
  if (!m) return ''
  return `"${MULTIPLICITY_MAP[m]}" `
}

export function exportToPlantUml(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['@startuml', '']

  // Separate package nodes and their children
  const packageNodes = nodes.filter((n) => (n.data as PackageNodeData).nodeType === 'package')
  const packageIds = new Set(packageNodes.map((n) => n.id))
  const childNodeIds = new Set(nodes.filter((n) => n.parentId).map((n) => n.id))

  // Helper: render a single non-package node
  function renderNode(node: Node): string[] {
    const data = node.data
    const result: string[] = []

    if ((data as ClassNodeData).nodeType === 'class' || (data as ClassNodeData).nodeType === 'interface') {
      const d = data as ClassNodeData
      const keyword = d.nodeType === 'interface' ? 'interface' : 'class'
      const stereotype = d.stereotype ? ` <<${d.stereotype}>>` : ''
      result.push(`${keyword} ${d.name}${stereotype} {`)
      for (const attr of d.attributes) {
        result.push(`  ${VISIBILITY_MAP[attr.visibility]}${attr.name} : ${attr.type}`)
      }
      for (const method of d.methods) {
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')
        result.push(`  ${VISIBILITY_MAP[method.visibility]}${method.name}(${params}) : ${method.returnType}`)
      }
      result.push('}')
    } else if ((data as EnumNodeData).nodeType === 'enum') {
      const d = data as EnumNodeData
      result.push(`enum ${d.name} {`)
      for (const v of d.values) {
        result.push(`  ${v.name}`)
      }
      result.push('}')
    } else if ((data as NoteNodeData).nodeType === 'note') {
      const d = data as NoteNodeData
      result.push(`note "${d.content}" as Note_${node.id.replace(/-/g, '_')}`)
    }

    return result
  }

  // Output package nodes with their children
  for (const pkg of packageNodes) {
    const d = pkg.data as PackageNodeData
    lines.push(`package ${d.name} {`)
    const children = nodes.filter((n) => n.parentId === pkg.id)
    for (const child of children) {
      for (const l of renderNode(child)) {
        lines.push('  ' + l)
      }
    }
    lines.push('}')
    lines.push('')
  }

  // Output top-level non-package nodes
  for (const node of nodes) {
    if (packageIds.has(node.id)) continue
    if (childNodeIds.has(node.id)) continue
    const rendered = renderNode(node)
    if (rendered.length > 0) {
      lines.push(...rendered)
      lines.push('')
    }
  }

  // Output edges
  for (const edge of edges) {
    const d = edge.data as DiagramEdgeData
    const src = nodes.find((n) => n.id === edge.source)
    const tgt = nodes.find((n) => n.id === edge.target)
    if (!src || !tgt) continue

    const srcName = (src.data as ClassNodeData).name ?? `Node_${edge.source}`
    const tgtName = (tgt.data as ClassNodeData).name ?? `Node_${edge.target}`
    const arrow = edgeArrow(d?.edgeType ?? 'association')
    const srcMult = formatMult(d?.sourceMultiplicity)
    const tgtMult = formatMult(d?.targetMultiplicity)
    lines.push(`${srcName} ${srcMult}${arrow} ${tgtMult}${tgtName}`)
  }

  lines.push('')
  lines.push('@enduml')

  return lines.join('\n')
}
