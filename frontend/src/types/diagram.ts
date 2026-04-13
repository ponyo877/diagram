export type NodeType = 'class' | 'interface' | 'enum' | 'note' | 'package'

export type EdgeType =
  | 'association'
  | 'generalization'
  | 'realization'
  | 'dependency'
  | 'aggregation'
  | 'composition'

export type Multiplicity = '1' | '0..n' | '1..n' | '0..1'

export type Visibility = '+' | '-' | '#' | '~'

export interface Attribute {
  id: string
  visibility: Visibility
  name: string
  type: string
}

export interface Parameter {
  name: string
  type: string
}

export interface Method {
  id: string
  visibility: Visibility
  name: string
  parameters: Parameter[]
  returnType: string
}

export interface EnumValue {
  id: string
  name: string
}

export interface ClassNodeData extends Record<string, unknown> {
  nodeType: 'class' | 'interface'
  name: string
  stereotype: string
  attributes: Attribute[]
  methods: Method[]
  color: string
}

export interface EnumNodeData extends Record<string, unknown> {
  nodeType: 'enum'
  name: string
  values: EnumValue[]
  color: string
}

export interface NoteNodeData extends Record<string, unknown> {
  nodeType: 'note'
  content: string
  color: string
}

export interface PackageNodeData extends Record<string, unknown> {
  nodeType: 'package'
  name: string
  color: string
}

export type DiagramNodeData =
  | ClassNodeData
  | EnumNodeData
  | NoteNodeData
  | PackageNodeData

// 個別マーカー種類（始点/終点それぞれで独立指定可能）
export type EdgeMarker =
  | 'none'
  | 'arrow'              // → (依存矢印)
  | 'triangle-open'      // ▷ (汎化/実現)
  | 'triangle-filled'    // ▶
  | 'diamond-open'       // ◇ (集約)
  | 'diamond-filled'     // ◆ (コンポジション)

export type LineStyle = 'solid' | 'dashed'

export interface DiagramEdgeData extends Record<string, unknown> {
  edgeType: EdgeType
  sourceMultiplicity?: Multiplicity
  targetMultiplicity?: Multiplicity
  // UML-compliant optional labels
  label?: string        // relationship name (center of edge)
  sourceRole?: string   // role name near source
  targetRole?: string   // role name near target
  // 独立マーカー/線スタイル（全て optional、未指定なら edgeType から推論 = 旧挙動）
  sourceMarker?: EdgeMarker
  targetMarker?: EdgeMarker
  lineStyle?: LineStyle
}
