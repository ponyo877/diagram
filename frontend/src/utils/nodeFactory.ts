import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { ClassNodeData, EnumNodeData, NoteNodeData, PackageNodeData } from '../types/diagram'

export function createNode(type: string, position: { x: number; y: number }): Node {
  const id = nanoid()

  switch (type) {
    case 'class':
      return {
        id,
        type: 'class',
        position,
        data: {
          nodeType: 'class',
          name: 'ClassName',
          stereotype: '',
          attributes: [],
          methods: [],
          color: '#dbeafe',
        } satisfies ClassNodeData,
      }

    case 'interface':
      return {
        id,
        type: 'interface',
        position,
        data: {
          nodeType: 'interface',
          name: 'InterfaceName',
          stereotype: '<<interface>>',
          attributes: [],
          methods: [],
          color: '#e0e7ff',
        } satisfies ClassNodeData,
      }

    case 'enum':
      return {
        id,
        type: 'enum',
        position,
        data: {
          nodeType: 'enum',
          name: 'EnumName',
          values: [],
          color: '#dcfce7',
        } satisfies EnumNodeData,
      }

    case 'note':
      return {
        id,
        type: 'note',
        position,
        style: { width: 160, minHeight: 80 },
        data: {
          nodeType: 'note',
          content: 'ノート',
          color: '#fef9c3',
        } satisfies NoteNodeData,
      }

    case 'package':
      return {
        id,
        type: 'package',
        position,
        style: { width: 300, height: 200 },
        data: {
          nodeType: 'package',
          name: 'PackageName',
          color: '#f1f5f9',
        } satisfies PackageNodeData,
        zIndex: -1,
      }

    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}
