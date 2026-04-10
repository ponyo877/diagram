import type { Edge } from '@xyflow/react'
import type { DiagramEdgeData, EdgeType, Multiplicity } from '../../types/diagram'

interface EdgePropertiesProps {
  edge: Edge
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string }[] = [
  { value: 'association', label: '関連 (Association)' },
  { value: 'generalization', label: '汎化 (Generalization)' },
  { value: 'realization', label: '実現 (Realization)' },
  { value: 'dependency', label: '依存 (Dependency)' },
  { value: 'aggregation', label: '集約 (Aggregation)' },
  { value: 'composition', label: '合成 (Composition)' },
]

const MULTIPLICITY_OPTIONS: { value: Multiplicity | ''; label: string }[] = [
  { value: '', label: '未設定' },
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '0..n', label: '0..n' },
  { value: '1..n', label: '1..n' },
]

export default function EdgeProperties({ edge, onUpdate, onDelete }: EdgePropertiesProps) {
  const data = edge.data as unknown as DiagramEdgeData
  const update = (patch: Partial<DiagramEdgeData>) =>
    onUpdate(edge.id, patch as Record<string, unknown>)

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      <div>
        <label className="text-xs text-gray-500 font-medium">関係の種別</label>
        <select
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          value={data.edgeType}
          onChange={(e) => update({ edgeType: e.target.value as EdgeType })}
        >
          {EDGE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-medium">多重度（始点側）</label>
        <select
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          value={data.sourceMultiplicity ?? ''}
          onChange={(e) => {
            const val = e.target.value
            update({ sourceMultiplicity: val ? (val as Multiplicity) : undefined })
          }}
        >
          {MULTIPLICITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 font-medium">多重度（終点側）</label>
        <select
          className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          value={data.targetMultiplicity ?? ''}
          onChange={(e) => {
            const val = e.target.value
            update({ targetMultiplicity: val ? (val as Multiplicity) : undefined })
          }}
        >
          {MULTIPLICITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-gray-200" />

      <button
        onClick={() => onDelete(edge.id)}
        className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded py-1.5 transition-colors"
      >
        エッジを削除
      </button>
    </div>
  )
}
