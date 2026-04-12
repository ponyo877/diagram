/**
 * PlantUML Importer — PlantUMLテキストからノード・エッジデータを生成
 *
 * plantUmlExporter.ts と対になるモジュール。
 * 既存のコードに一切依存せず、純粋関数として実装。
 */
import { nanoid } from 'nanoid'
import type { Node, Edge } from '@xyflow/react'
import type {
  ClassNodeData,
  EnumNodeData,
  NoteNodeData,
  PackageNodeData,
  DiagramEdgeData,
  EdgeType,
  Multiplicity,
  Visibility,
  Attribute,
  Method,
} from '../types/diagram'

export interface ImportResult {
  nodes: Node[]
  edges: Edge[]
  warnings: string[]
}

// --- 定数 ---

const DEFAULT_COLORS: Record<string, string> = {
  class: '#e3ecf8',
  interface: '#e4e1f5',
  enum: '#daf0e2',
  note: '#fdf5dc',
  package: '#f0ebe3',
}

const ARROW_MAP: Record<string, { edgeType: EdgeType; reverse: boolean }> = {
  '--':   { edgeType: 'association', reverse: false },
  '-->':  { edgeType: 'dependency', reverse: false },
  '--|>': { edgeType: 'generalization', reverse: false },
  '..|>': { edgeType: 'realization', reverse: false },
  '..>':  { edgeType: 'dependency', reverse: false },
  '..':   { edgeType: 'association', reverse: false },
  '--o':  { edgeType: 'aggregation', reverse: false },
  '--*':  { edgeType: 'composition', reverse: false },
  '<|--': { edgeType: 'generalization', reverse: true },
  '<|..': { edgeType: 'realization', reverse: true },
  'o--':  { edgeType: 'aggregation', reverse: true },
  '*--':  { edgeType: 'composition', reverse: true },
}

const MULT_REVERSE: Record<string, Multiplicity> = {
  '0..*': '0..n',
  '1..*': '1..n',
  '*': '0..n',
  '1': '1',
  '0..1': '0..1',
  // 内部表現もそのまま受け付ける
  '0..n': '0..n',
  '1..n': '1..n',
}

const VISIBILITY_MAP: Record<string, Visibility> = {
  '+': '+',
  '-': '-',
  '#': '#',
  '~': '~',
}

// --- パーサー ---

type ParserState = 'IDLE' | 'IN_CLASS' | 'IN_ENUM'

export function importFromPlantUml(text: string): ImportResult {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const warnings: string[] = []

  // 名前→IDマップ（エッジ解決用）
  const nameToId = new Map<string, string>()
  // 名前→ノードタイプ（interface判定用）
  const nameToType = new Map<string, string>()

  // パッケージスタック
  let currentPackageId: string | null = null

  // ステートマシン
  let state: ParserState = 'IDLE'
  let currentNodeId = ''
  let currentAttributes: Attribute[] = []
  let currentMethods: Method[] = []
  let currentEnumValues: { id: string; name: string }[] = []
  let currentNodeName = ''
  let currentStereotype = ''
  let currentIsInterface = false
  let braceDepth = 0

  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    const lineNum = i + 1

    // 空行・コメント・マーカーをスキップ
    if (!line || line.startsWith("'") || line === '@startuml' || line === '@enduml') continue

    // --- IDLE 状態 ---
    if (state === 'IDLE') {
      // class / interface 宣言
      const classMatch = line.match(/^(?:abstract\s+)?(class|interface)\s+([\w\u3000-\u9FFF]+)(?:\s+<<([^>]+)>>)?\s*(\{)?\s*$/)
      if (classMatch) {
        const [, keyword, name, stereotype, brace] = classMatch
        currentNodeId = nanoid()
        currentNodeName = name
        currentStereotype = stereotype ?? ''
        currentIsInterface = keyword === 'interface'
        currentAttributes = []
        currentMethods = []
        nameToId.set(name, currentNodeId)
        nameToType.set(name, currentIsInterface ? 'interface' : 'class')

        if (brace) {
          state = 'IN_CLASS'
          braceDepth = 1
        } else {
          // ブロックなし: 空のクラスを即座に作成
          finishClassNode()
        }
        continue
      }

      // enum 宣言
      const enumMatch = line.match(/^enum\s+([\w\u3000-\u9FFF]+)\s*(\{)?\s*$/)
      if (enumMatch) {
        const [, name, brace] = enumMatch
        currentNodeId = nanoid()
        currentNodeName = name
        currentEnumValues = []
        nameToId.set(name, currentNodeId)
        nameToType.set(name, 'enum')

        if (brace) {
          state = 'IN_ENUM'
          braceDepth = 1
        } else {
          finishEnumNode()
        }
        continue
      }

      // note 宣言
      const noteMatch = line.match(/^note\s+"([^"]+)"\s+as\s+([\w\u3000-\u9FFF]+)\s*$/)
      if (noteMatch) {
        const [, content, alias] = noteMatch
        const id = nanoid()
        nameToId.set(alias, id)
        nameToType.set(alias, 'note')
        nodes.push({
          id,
          type: 'note',
          position: { x: 0, y: 0 },
          style: { width: 160, minHeight: 80 },
          data: {
            nodeType: 'note',
            content: content.replace(/\\n/g, '\n'),
            color: DEFAULT_COLORS.note,
          } satisfies NoteNodeData,
          ...(currentPackageId ? { parentId: currentPackageId } : {}),
        })
        continue
      }

      // package 開始
      const pkgMatch = line.match(/^package\s+([\w\u3000-\u9FFF]+)\s*\{\s*$/)
      if (pkgMatch) {
        const [, name] = pkgMatch
        const id = nanoid()
        nameToId.set(name, id)
        nameToType.set(name, 'package')
        currentPackageId = id
        nodes.push({
          id,
          type: 'package',
          position: { x: 0, y: 0 },
          style: { width: 300, height: 200 },
          zIndex: -1,
          data: {
            nodeType: 'package',
            name,
            color: DEFAULT_COLORS.package,
          } satisfies PackageNodeData,
        })
        continue
      }

      // package 終了（IDLE状態でのブレース）
      if (line === '}' && currentPackageId) {
        currentPackageId = null
        continue
      }

      // エッジ行の解析を試みる
      if (tryParseEdge(line, lineNum)) continue

      // パースできない行
      if (line !== '}') {
        warnings.push(`Line ${lineNum}: Cannot parse: "${line}"`)
      }
      continue
    }

    // --- IN_CLASS 状態 ---
    if (state === 'IN_CLASS') {
      if (line === '}') {
        braceDepth--
        if (braceDepth === 0) {
          finishClassNode()
          state = 'IDLE'
        }
        continue
      }

      // メソッド行: +name(params) : ReturnType
      const methodMatch = line.match(/^\s*([+\-#~])\s*([\w\u3000-\u9FFF]+)\s*\(([^)]*)\)\s*(?::\s*(.+?))?\s*$/)
      if (methodMatch) {
        const [, vis, name, paramsStr, returnType] = methodMatch
        const parameters = parseParameters(paramsStr)
        currentMethods.push({
          id: nanoid(),
          visibility: VISIBILITY_MAP[vis] ?? '+',
          name,
          parameters,
          returnType: returnType?.trim() ?? 'void',
        })
        continue
      }

      // 属性行: +name : Type
      const attrMatch = line.match(/^\s*([+\-#~])\s*([\w\u3000-\u9FFF]+)\s*:\s*(.+?)\s*$/)
      if (attrMatch) {
        const [, vis, name, type] = attrMatch
        currentAttributes.push({
          id: nanoid(),
          visibility: VISIBILITY_MAP[vis] ?? '+',
          name,
          type: type.trim(),
        })
        continue
      }

      // 属性行（可視性なし）: name : Type
      const attrNoVisMatch = line.match(/^\s*([\w\u3000-\u9FFF]+)\s*:\s*(.+?)\s*$/)
      if (attrNoVisMatch) {
        const [, name, type] = attrNoVisMatch
        currentAttributes.push({
          id: nanoid(),
          visibility: '+',
          name,
          type: type.trim(),
        })
        continue
      }

      warnings.push(`Line ${lineNum}: Cannot parse inside class: "${line}"`)
      continue
    }

    // --- IN_ENUM 状態 ---
    if (state === 'IN_ENUM') {
      if (line === '}') {
        braceDepth--
        if (braceDepth === 0) {
          finishEnumNode()
          state = 'IDLE'
        }
        continue
      }

      // 列挙値
      const val = line.replace(/,\s*$/, '').trim()
      if (val) {
        currentEnumValues.push({ id: nanoid(), name: val })
      }
      continue
    }
  }

  // パース途中で終わった場合の救済
  if (state === 'IN_CLASS') {
    finishClassNode()
    warnings.push('Unclosed class definition (missing })')
  }
  if (state === 'IN_ENUM') {
    finishEnumNode()
    warnings.push('Unclosed enum definition (missing })')
  }

  return { nodes, edges, warnings }

  // --- ヘルパー関数 ---

  function finishClassNode() {
    const nodeType = currentIsInterface ? 'interface' : 'class'
    nodes.push({
      id: currentNodeId,
      type: nodeType,
      position: { x: 0, y: 0 },
      data: {
        nodeType,
        name: currentNodeName,
        stereotype: currentStereotype,
        attributes: [...currentAttributes],
        methods: [...currentMethods],
        color: DEFAULT_COLORS[nodeType],
      } satisfies ClassNodeData,
      ...(currentPackageId ? { parentId: currentPackageId } : {}),
    })
  }

  function finishEnumNode() {
    nodes.push({
      id: currentNodeId,
      type: 'enum',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'enum',
        name: currentNodeName,
        values: [...currentEnumValues],
        color: DEFAULT_COLORS.enum,
      } satisfies EnumNodeData,
      ...(currentPackageId ? { parentId: currentPackageId } : {}),
    })
  }

  function parseParameters(paramsStr: string): { name: string; type: string }[] {
    if (!paramsStr.trim()) return []
    return paramsStr.split(',').map((p) => {
      const parts = p.trim().split(/\s*:\s*/)
      return { name: parts[0]?.trim() ?? 'param', type: parts[1]?.trim() ?? 'String' }
    })
  }

  function tryParseEdge(line: string, lineNum: number): boolean {
    // エッジパターン: SrcName ["mult"] arrow ["mult"] TgtName
    const edgeRegex = /^([\w\u3000-\u9FFF]+)\s*(?:"([^"]*)")?\s*(--|-->|--\|>|\.\.\|>|\.\.>|\.\.|--o|--\*|<\|--|<\|\.\.|o--|(\*--))\s*(?:"([^"]*)")?\s*([\w\u3000-\u9FFF]+)\s*$/
    const match = line.match(edgeRegex)
    if (!match) return false

    const [, leftName, leftMult, arrow, , rightMult, rightName] = match
    const arrowInfo = ARROW_MAP[arrow]
    if (!arrowInfo) {
      warnings.push(`Line ${lineNum}: Unsupported arrow: "${arrow}"`)
      return true
    }

    const srcName = arrowInfo.reverse ? rightName : leftName
    const tgtName = arrowInfo.reverse ? leftName : rightName
    const srcMult = arrowInfo.reverse ? rightMult : leftMult
    const tgtMult = arrowInfo.reverse ? leftMult : rightMult

    const sourceId = nameToId.get(srcName)
    const targetId = nameToId.get(tgtName)
    if (!sourceId || !targetId) {
      warnings.push(`Line ${lineNum}: Node "${!sourceId ? srcName : tgtName}" not found`)
      return true
    }

    edges.push({
      id: nanoid(),
      source: sourceId,
      target: targetId,
      type: 'diagram',
      data: {
        edgeType: arrowInfo.edgeType,
        sourceMultiplicity: srcMult ? MULT_REVERSE[srcMult] : undefined,
        targetMultiplicity: tgtMult ? MULT_REVERSE[tgtMult] : undefined,
      } satisfies DiagramEdgeData,
    } as Edge)

    return true
  }
}
