import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { EnumNodeData, EnumValue } from '../../types/diagram'

interface EnumPropertiesProps {
  node: Node
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export default function EnumProperties({ node, onUpdate, onDelete }: EnumPropertiesProps) {
  const data = node.data as unknown as EnumNodeData
  const update = (patch: Partial<EnumNodeData>) =>
    onUpdate(node.id, patch as Record<string, unknown>)

  const addValue = () => {
    update({ values: [...data.values, { id: nanoid(), name: 'VALUE' }] })
  }

  const updateValue = (id: string, patch: Partial<EnumValue>) => {
    update({ values: data.values.map((v) => (v.id === id ? { ...v, ...patch } : v)) })
  }

  const deleteValue = (id: string) => {
    update({ values: data.values.filter((v) => v.id !== id) })
  }

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      <div>
        <label className="text-xs text-gray-500 font-medium">列挙型名</label>
        <input
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-medium">背景色</label>
        <div className="flex gap-2 mt-1 items-center">
          <input
            type="color"
            value={data.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer shrink-0"
          />
          <input
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-blue-500"
            value={data.color}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 font-medium mb-1">列挙値</div>
        {data.values.map((val) => (
          <div key={val.id} className="flex gap-1 mb-1 items-center">
            <input
              className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-blue-500"
              value={val.name}
              onChange={(e) => updateValue(val.id, { name: e.target.value })}
            />
            <button
              onClick={() => deleteValue(val.id)}
              className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addValue}
          className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
        >
          + 値を追加
        </button>
      </div>

      <hr className="border-gray-200" />

      <button
        onClick={() => onDelete(node.id)}
        className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded py-1.5 transition-colors"
      >
        ノードを削除
      </button>
    </div>
  )
}
