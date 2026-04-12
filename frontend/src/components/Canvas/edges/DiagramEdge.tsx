import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { DiagramEdgeData, EdgeType, Multiplicity } from '../../../types/diagram'
import { useEdgeActions } from '../../../contexts/EdgeActionsContext'

const EDGE_TYPES: { value: EdgeType; title: string; icon: React.ReactNode }[] = [
  {
    value: 'association',
    title: '関連',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12"><line x1="0" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" /></svg>
    ),
  },
  {
    value: 'generalization',
    title: '汎化',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="13,2 20,6 13,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'realization',
    title: '実現',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="13,2 20,6 13,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'dependency',
    title: '依存',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <polyline points="13,2 20,6 13,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'aggregation',
    title: '集約',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <polygon points="0,6 5,2 10,6 5,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: 'composition',
    title: '合成',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <polygon points="0,6 5,2 10,6 5,10" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

const MULT_OPTIONS: { value: Multiplicity | ''; label: string }[] = [
  { value: '', label: '—' },
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '0..n', label: '0..n' },
  { value: '1..n', label: '1..n' },
]

export default function DiagramEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as DiagramEdgeData
  const edgeType = edgeData?.edgeType ?? 'association'
  const { onUpdateEdge, onDeleteEdge, toolbarPosition } = useEdgeActions()

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  })

  const isDashed = edgeType === 'realization' || edgeType === 'dependency'
  const stroke = selected ? '#4a9ce8' : '#9e9589'
  const safeId = id.replace(/[^a-zA-Z0-9]/g, '_')

  const showTriangle = edgeType === 'generalization' || edgeType === 'realization'
  const showArrow = edgeType === 'dependency'
  const showDiamondOpen = edgeType === 'aggregation'
  const showDiamondFilled = edgeType === 'composition'

  const markerEndUrl = showTriangle ? `url(#tri-${safeId})` : showArrow ? `url(#arr-${safeId})` : undefined
  const markerStartUrl = showDiamondOpen ? `url(#dmo-${safeId})` : showDiamondFilled ? `url(#dmf-${safeId})` : undefined

  // 多重度ラベル位置
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / dist
  const ny = dy / dist
  const OFF = 30
  const srcLX = sourceX + nx * OFF
  const srcLY = sourceY + ny * OFF
  const tgtLX = targetX - nx * OFF
  const tgtLY = targetY - ny * OFF

  // フローティングツールバー位置（クリック位置の上部）
  const tbX = toolbarPosition?.x ?? (sourceX + targetX) / 2
  const tbY = toolbarPosition?.y ?? (sourceY + targetY) / 2

  const update = (patch: Partial<DiagramEdgeData>) => {
    onUpdateEdge(id, patch as Record<string, unknown>)
  }

  return (
    <>
      <defs>
        {showTriangle && (
          <marker id={`tri-${safeId}`} markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0,0 12,6 0,12" fill="white" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          </marker>
        )}
        {showArrow && (
          <marker id={`arr-${safeId}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <polyline points="0,1 10,6 0,11" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        )}
        {showDiamondOpen && (
          <marker id={`dmo-${safeId}`} markerWidth="20" markerHeight="12" refX="0" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0,6 9,0 18,6 9,12" fill="white" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          </marker>
        )}
        {showDiamondFilled && (
          <marker id={`dmf-${safeId}`} markerWidth="20" markerHeight="12" refX="0" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0,6 9,0 18,6 9,12" fill={stroke} />
          </marker>
        )}
      </defs>

      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} />

      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={isDashed ? '6 3' : undefined}
        markerEnd={markerEndUrl}
        markerStart={markerStartUrl}
      />

      {/* 多重度ラベル（始点側） */}
      {edgeData?.sourceMultiplicity && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 font-mono"
            style={{
              position: 'absolute', fontSize: 10, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', monospace", pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${srcLX}px, ${srcLY}px)`,
            }}
          >
            {edgeData.sourceMultiplicity}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* 多重度ラベル（終点側） */}
      {edgeData?.targetMultiplicity && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 font-mono"
            style={{
              position: 'absolute', fontSize: 10, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', monospace", pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${tgtLX}px, ${tgtLY}px)`,
            }}
          >
            {edgeData.targetMultiplicity}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* 選択時フローティングツールバー */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${tbX}px, ${tbY - 16}px)`,
              pointerEvents: 'all',
            }}
          >
            <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-soft-border px-1.5 py-1" onClick={(e) => e.stopPropagation()}>
              {/* エッジ種別アイコン */}
              {EDGE_TYPES.map((t) => (
                <button
                  key={t.value}
                  title={t.title}
                  onClick={() => update({ edgeType: t.value })}
                  className={`w-7 h-6 flex items-center justify-center rounded-lg transition-colors ${
                    edgeType === t.value
                      ? 'bg-soft-primary-light text-soft-primary'
                      : 'text-soft-muted hover:text-soft-text hover:bg-soft-hover'
                  }`}
                >
                  {t.icon}
                </button>
              ))}

              <div className="w-px h-4 bg-soft-border mx-0.5" />

              {/* 始点多重度 */}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-soft-light">S</span>
                <select
                  value={edgeData?.sourceMultiplicity ?? ''}
                  onChange={(e) => update({ sourceMultiplicity: e.target.value ? (e.target.value as Multiplicity) : undefined })}
                  className="h-6 text-[10px] bg-transparent border border-soft-border rounded-lg px-1 focus:outline-none focus:border-soft-primary appearance-none cursor-pointer"
                >
                  {MULT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* 終点多重度 */}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-soft-light">T</span>
                <select
                  value={edgeData?.targetMultiplicity ?? ''}
                  onChange={(e) => update({ targetMultiplicity: e.target.value ? (e.target.value as Multiplicity) : undefined })}
                  className="h-6 text-[10px] bg-transparent border border-soft-border rounded-lg px-1 focus:outline-none focus:border-soft-primary appearance-none cursor-pointer"
                >
                  {MULT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="w-px h-4 bg-soft-border mx-0.5" />

              {/* 削除 */}
              <button
                title="エッジを削除"
                onClick={() => onDeleteEdge(id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-soft-light hover:text-soft-red hover:bg-red-50 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
