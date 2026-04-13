import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { DiagramEdgeData, EdgeType, Multiplicity } from '../../../types/diagram'
import { useEdgeActions } from '../../../contexts/EdgeActionsContext'

const EDGE_TYPES: { value: EdgeType; title: string; icon: React.ReactNode }[] = [
  {
    value: 'association',
    title: 'Assoc',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12"><line x1="0" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" /></svg>
    ),
  },
  {
    value: 'generalization',
    title: 'Inherit',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="13,2 20,6 13,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'realization',
    title: 'Realize',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="13,2 20,6 13,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'dependency',
    title: 'Depend',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <line x1="0" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <polyline points="13,2 20,6 13,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    value: 'aggregation',
    title: 'Aggreg',
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12">
        <polygon points="0,6 5,2 10,6 5,10" fill="white" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: 'composition',
    title: 'Compos',
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
  const { onUpdateEdge, onDeleteEdge, toolbarPosition, sourceNodeName, targetNodeName } = useEdgeActions()

  // Display multiplicity in standard UML notation
  const displayMult = (m: string) => m === '0..n' ? '0..*' : m === '1..n' ? '1..*' : m

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

      {/* 多重度ラベル（Source側） */}
      {edgeData?.sourceMultiplicity && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 font-mono"
            style={{
              position: 'absolute', fontSize: 10, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', monospace", pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${srcLX}px, ${srcLY}px)`,
              zIndex: 1000,
            }}
          >
            {displayMult(edgeData.sourceMultiplicity)}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* 多重度ラベル（Target側） */}
      {edgeData?.targetMultiplicity && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 font-mono"
            style={{
              position: 'absolute', fontSize: 10, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', monospace", pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${tgtLX}px, ${tgtLY}px)`,
              zIndex: 1000,
            }}
          >
            {displayMult(edgeData.targetMultiplicity)}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* エッジラベル（中央） */}
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-1 rounded"
            style={{
              position: 'absolute', fontSize: 10, color: '#3d3836',
              fontFamily: "'M PLUS Rounded 1c', sans-serif", pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
              zIndex: 1000,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* ロール名（source側） */}
      {edgeData?.sourceRole && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 italic"
            style={{
              position: 'absolute', fontSize: 9, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', sans-serif", pointerEvents: 'none',
              transform: `translate(-50%, 50%) translate(${srcLX}px, ${srcLY + 10}px)`,
              zIndex: 1000,
            }}
          >
            {edgeData.sourceRole}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* ロール名（target側） */}
      {edgeData?.targetRole && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-white px-0.5 italic"
            style={{
              position: 'absolute', fontSize: 9, color: '#7a7168',
              fontFamily: "'M PLUS Rounded 1c', sans-serif", pointerEvents: 'none',
              transform: `translate(-50%, 50%) translate(${tgtLX}px, ${tgtLY + 10}px)`,
              zIndex: 1000,
            }}
          >
            {edgeData.targetRole}
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
              zIndex: 1000,
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

              {/* Source多重度（sourceノード名を表示） */}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-soft-muted max-w-[40px] truncate" title={sourceNodeName ?? 'Source'}>
                  {sourceNodeName ? sourceNodeName.slice(0, 4) : '始'}
                </span>
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

              {/* Target多重度（targetノード名を表示） */}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-soft-muted max-w-[40px] truncate" title={targetNodeName ?? 'Target'}>
                  {targetNodeName ? targetNodeName.slice(0, 4) : '終'}
                </span>
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
                title="Delete Edge"
                onClick={() => onDeleteEdge(id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-soft-light hover:text-soft-red hover:bg-red-50 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 第2段: ラベル・ロール入力 */}
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-soft-border px-2 py-1 mt-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={edgeData?.label ?? ''}
                placeholder="label"
                onChange={(e) => update({ label: e.target.value || undefined })}
                className="h-6 w-20 px-1.5 text-[10px] bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary"
              />
              <span className="text-[9px] text-soft-light">src</span>
              <input
                type="text"
                value={edgeData?.sourceRole ?? ''}
                placeholder="role"
                onChange={(e) => update({ sourceRole: e.target.value || undefined })}
                className="h-6 w-14 px-1.5 text-[10px] bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary"
              />
              <span className="text-[9px] text-soft-light">tgt</span>
              <input
                type="text"
                value={edgeData?.targetRole ?? ''}
                placeholder="role"
                onChange={(e) => update({ targetRole: e.target.value || undefined })}
                className="h-6 w-14 px-1.5 text-[10px] bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary"
              />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
