import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { ClassNodeData, EnumNodeData, NoteNodeData, PackageNodeData, NodeType } from '../types/diagram'

export function createNodeData(type: NodeType | string): Record<string, unknown> {
  switch (type) {
    case 'class':
      return { nodeType: 'class', name: 'ClassName', stereotype: '', attributes: [], methods: [], color: '#dbeafe' }
    case 'interface':
      return { nodeType: 'interface', name: 'InterfaceName', stereotype: '<<interface>>', attributes: [], methods: [], color: '#e0e7ff' }
    case 'enum':
      return { nodeType: 'enum', name: 'EnumName', values: [], color: '#dcfce7' }
    case 'note':
      return { nodeType: 'note', content: 'ノート', color: '#fef9c3' }
    case 'package':
      return { nodeType: 'package', name: 'PackageName', color: '#f1f5f9' }
    default:
      return {}
  }
}

export function createNode(type: string, position: { x: number; y: number }, customId?: string, customData?: Record<string, unknown>): Node {
  const id = customId ?? nanoid()

  switch (type) {
    case 'class':
      return {
        id,
        type: 'class',
        position,
        data: customData ?? ({
          nodeType: 'class',
          name: 'ClassName',
          stereotype: '',
          attributes: [],
          methods: [],
          color: '#dbeafe',
        } satisfies ClassNodeData),
      }

    case 'interface':
      return {
        id,
        type: 'interface',
        position,
        data: customData ?? ({
          nodeType: 'interface',
          name: 'InterfaceName',
          stereotype: '<<interface>>',
          attributes: [],
          methods: [],
          color: '#e0e7ff',
        } satisfies ClassNodeData),
      }

    case 'enum':
      return {
        id,
        type: 'enum',
        position,
        data: customData ?? ({
          nodeType: 'enum',
          name: 'EnumName',
          values: [],
          color: '#dcfce7',
        } satisfies EnumNodeData),
      }

    case 'note':
      return {
        id,
        type: 'note',
        position,
        style: { width: 160, minHeight: 80 },
        data: customData ?? ({
          nodeType: 'note',
          content: 'ノート',
          color: '#fef9c3',
        } satisfies NoteNodeData),
      }

    case 'package':
      return {
        id,
        type: 'package',
        position,
        style: { width: 300, height: 200 },
        data: customData ?? ({
          nodeType: 'package',
          name: 'PackageName',
          color: '#f1f5f9',
        } satisfies PackageNodeData),
        zIndex: -1,
      }

    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}
