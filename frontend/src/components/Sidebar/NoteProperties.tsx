import type { Node } from '@xyflow/react'
import type { NoteNodeData } from '../../types/diagram'

interface NotePropertiesProps {
  node: Node
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export default function NoteProperties({ node, onUpdate, onDelete }: NotePropertiesProps) {
  const data = node.data as unknown as NoteNodeData
  const update = (patch: Partial<NoteNodeData>) =>
    onUpdate(node.id, patch as Record<string, unknown>)

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      <div>
        <label className="text-xs text-gray-500 font-medium">テキスト</label>
        <textarea
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 resize-none"
          rows={6}
          value={data.content}
          onChange={(e) => update({ content: e.target.value })}
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
