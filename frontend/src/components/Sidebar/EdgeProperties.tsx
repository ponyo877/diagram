import type { Edge } from '@xyflow/react'
import type { DiagramEdgeData, EdgeType, Multiplicity } from '../../types/diagram'

interface EdgePropertiesProps {
  edge: Edge
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string }[] = [
  { value: 'association', label: 'Association' },
  { value: 'generalization', label: 'Generalization' },
  { value: 'realization', label: 'Realization' },
  { value: 'dependency', label: 'Dependency' },
  { value: 'aggregation', label: 'Aggregation' },
  { value: 'composition', label: 'Composition' },
]

const MULTIPLICITY_OPTIONS: { value: Multiplicity | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '0..n', label: '0..n' },
  { value: '1..n', label: '1..n' },
]

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

function PropSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] text-soft-muted mb-1">{label}</label>
      <select
        className="w-full h-7 px-2 text-[12px] bg-soft-input border border-soft-border rounded focus:outline-none focus:border-soft-primary transition-colors appearance-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function EdgeProperties({ edge, onUpdate, onDelete }: EdgePropertiesProps) {
  const data = edge.data as unknown as DiagramEdgeData
  const update = (patch: Partial<DiagramEdgeData>) =>
    onUpdate(edge.id, patch as Record<string, unknown>)

  return (
    <div className="flex flex-col">
      <PropSection title="Relation">
        <PropSelect
          label="Type"
          value={data.edgeType}
          onChange={(val) => update({ edgeType: val as EdgeType })}
          options={EDGE_TYPE_OPTIONS}
        />
      </PropSection>

      <PropSection title="Multiplicity">
        <PropSelect
          label="Source"
          value={data.sourceMultiplicity ?? ''}
          onChange={(val) => update({ sourceMultiplicity: val ? (val as Multiplicity) : undefined })}
          options={MULTIPLICITY_OPTIONS}
        />
        <PropSelect
          label="Target"
          value={data.targetMultiplicity ?? ''}
          onChange={(val) => update({ targetMultiplicity: val ? (val as Multiplicity) : undefined })}
          options={MULTIPLICITY_OPTIONS}
        />
      </PropSection>

      <button
        onClick={() => onDelete(edge.id)}
        className="flex items-center justify-center gap-1.5 text-[11px] text-soft-red hover:text-red-700 px-3 py-3 transition-colors"
      >
        Delete Edge
      </button>
    </div>
  )
}
