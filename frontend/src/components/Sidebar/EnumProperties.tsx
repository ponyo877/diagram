import { nanoid } from 'nanoid'
import type { Node } from '@xyflow/react'
import type { EnumNodeData, EnumValue } from '../../types/diagram'

interface EnumPropertiesProps {
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
    <div className="flex flex-col">
      <PropSection title="General">
        <div className="mb-2">
          <label className="block text-[10px] text-soft-muted mb-1">Enum Name</label>
          <input
            className="w-full h-7 px-2 text-[12px] bg-soft-input border border-soft-border rounded focus:outline-none focus:border-soft-primary focus:bg-white transition-colors"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
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

      <PropSection title="Values">
        {data.values.map((val) => (
          <div key={val.id} className="grid grid-cols-[1fr_16px] gap-1 items-center mb-1.5">
            <input
              className="h-6 px-1.5 text-[11px] font-mono bg-soft-input border border-soft-border rounded focus:outline-none focus:border-soft-primary min-w-0"
              value={val.name}
              onChange={(e) => updateValue(val.id, { name: e.target.value })}
            />
            <button
              onClick={() => deleteValue(val.id)}
              className="flex items-center justify-center text-soft-light hover:text-soft-red transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addValue}
          className="text-[11px] text-soft-primary hover:text-soft-primary-hover transition-colors mt-1"
        >
          + Add Value
        </button>
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
