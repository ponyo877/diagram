import type { Node } from '@xyflow/react'
import type { NoteNodeData } from '../../types/diagram'

interface NotePropertiesProps {
  node: Node
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-soft-border">
      <div className="px-3 py-2 text-[10px] font-semibold text-soft-light uppercase tracking-widest">
        {title}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  )
}

export default function NoteProperties({ node, onUpdate, onDelete }: NotePropertiesProps) {
  const data = node.data as unknown as NoteNodeData
  const update = (patch: Partial<NoteNodeData>) =>
    onUpdate(node.id, patch as Record<string, unknown>)

  return (
    <div className="flex flex-col">
      <PropSection title="Content">
        <label className="block text-[10px] text-soft-muted mb-1">Text</label>
        <textarea
          className="w-full px-2 py-1.5 text-[12px] bg-soft-input border border-soft-border rounded focus:outline-none focus:border-soft-primary focus:bg-white transition-colors resize-none leading-relaxed"
          rows={6}
          value={data.content}
          onChange={(e) => update({ content: e.target.value })}
        />
      </PropSection>

      <PropSection title="Style">
        <div className="mb-2">
          <label className="block text-[10px] text-soft-muted mb-1">Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={data.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-7 h-7 border border-soft-border rounded cursor-pointer shrink-0 p-0.5 bg-soft-input"
            />
            <input
              className="flex-1 h-7 px-2 text-[12px] font-mono bg-soft-input border border-soft-border rounded focus:outline-none focus:border-soft-primary transition-colors"
              value={data.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          </div>
        </div>
      </PropSection>

      <button
        onClick={() => onDelete(node.id)}
        className="flex items-center justify-center gap-1.5 text-[11px] text-soft-red hover:text-red-700 px-3 py-3 transition-colors"
      >
        Delete Node
      </button>
    </div>
  )
}
