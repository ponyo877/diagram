import { useState } from 'react'
import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { DiagramEdgeData, EdgeType, Multiplicity, EdgeMarker, LineStyle } from '../../../types/diagram'
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

const MARKER_OPTIONS: { value: EdgeMarker; label: string }[] = [
  { value: 'none', label: '— None' },
  { value: 'arrow', label: '→ Arrow' },
  { value: 'triangle-open', label: '▷ Triangle (open)' },
  { value: 'triangle-filled', label: '▶ Triangle (filled)' },
  { value: 'diamond-open', label: '◇ Diamond (open)' },
  { value: 'diamond-filled', label: '◆ Diamond (filled)' },
]

const LINE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
]

/** edgeType から source 側マーカーを推論（既存挙動の互換性維持） */
function inferSourceMarker(edgeType: EdgeType): EdgeMarker {
  if (edgeType === 'aggregation') return 'diamond-open'
  if (edgeType === 'composition') return 'diamond-filled'
  return 'none'
}

/** edgeType から target 側マーカーを推論（既存挙動の互換性維持） */
function inferTargetMarker(edgeType: EdgeType): EdgeMarker {
  if (edgeType === 'generalization' || edgeType === 'realization') return 'triangle-open'
  if (edgeType === 'dependency') return 'arrow'
  return 'none'
}

/** EdgeMarker に対応した SVG 定義を描画 */
function renderMarkerDef(markerId: string, marker: EdgeMarker, position: 'start' | 'end', stroke: string): React.ReactNode {
  const orient = position === 'start' ? 'auto-start-reverse' : 'auto'
  // 右向きの形状で定義し、markerStart のときは orient=auto-start-reverse で反転させる
  switch (marker) {
    case 'triangle-open':
      return (
        <marker
          key={markerId}
          id={markerId}
          markerWidth="14"
          markerHeight="12"
          refX={position === 'start' ? 0 : 12}
          refY="6"
          orient={orient}
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0,0 12,6 0,12" fill="white" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </marker>
      )
    case 'triangle-filled':
      return (
        <marker
          key={markerId}
          id={markerId}
          markerWidth="14"
          markerHeight="12"
          refX={position === 'start' ? 0 : 12}
          refY="6"
          orient={orient}
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0,0 12,6 0,12" fill={stroke} />
        </marker>
      )
    case 'arrow':
      return (
        <marker
          key={markerId}
          id={markerId}
          markerWidth="12"
          markerHeight="12"
          refX={position === 'start' ? 0 : 10}
          refY="6"
          orient={orient}
          markerUnits="userSpaceOnUse"
        >
          <polyline points="0,1 10,6 0,11" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      )
    case 'diamond-open':
      return (
        <marker
          key={markerId}
          id={markerId}
          markerWidth="20"
          markerHeight="12"
          refX={position === 'start' ? 0 : 18}
          refY="6"
          orient={orient}
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0,6 9,0 18,6 9,12" fill="white" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </marker>
      )
    case 'diamond-filled':
      return (
        <marker
          key={markerId}
          id={markerId}
          markerWidth="20"
          markerHeight="12"
          refX={position === 'start' ? 0 : 18}
          refY="6"
          orient={orient}
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0,6 9,0 18,6 9,12" fill={stroke} />
        </marker>
      )
    default:
      return null
  }
}

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
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Display multiplicity in standard UML notation
  const displayMult = (m: string) => m === '0..n' ? '0..*' : m === '1..n' ? '1..*' : m

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  })

  // 線スタイル: 明示的な lineStyle が優先、未指定なら edgeType から推論
  const isDashed = edgeData?.lineStyle
    ? edgeData.lineStyle === 'dashed'
    : (edgeType === 'realization' || edgeType === 'dependency')

  const stroke = selected ? '#4a9ce8' : '#9e9589'
  const safeId = id.replace(/[^a-zA-Z0-9]/g, '_')

  // マーカー: 明示的な sourceMarker/targetMarker が優先、未指定なら edgeType から推論
  const sourceMarker: EdgeMarker = edgeData?.sourceMarker ?? inferSourceMarker(edgeType)
  const targetMarker: EdgeMarker = edgeData?.targetMarker ?? inferTargetMarker(edgeType)

  const srcMarkerId = `ms-${safeId}`
  const tgtMarkerId = `mt-${safeId}`
  const markerStartUrl = sourceMarker !== 'none' ? `url(#${srcMarkerId})` : undefined
  const markerEndUrl = targetMarker !== 'none' ? `url(#${tgtMarkerId})` : undefined

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

  // edgeType プリセット選択時: カスタムマーカー/線スタイルをリセット → プリセット定義で描画
  const selectEdgeType = (v: EdgeType) => {
    update({
      edgeType: v,
      sourceMarker: undefined,
      targetMarker: undefined,
      lineStyle: undefined,
    })
  }

  return (
    <>
      <defs>
        {sourceMarker !== 'none' && renderMarkerDef(srcMarkerId, sourceMarker, 'start', stroke)}
        {targetMarker !== 'none' && renderMarkerDef(tgtMarkerId, targetMarker, 'end', stroke)}
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
                  onClick={() => selectEdgeType(t.value)}
                  className={`w-7 h-6 flex items-center justify-center rounded-lg transition-colors ${
                    edgeType === t.value && !edgeData?.sourceMarker && !edgeData?.targetMarker && !edgeData?.lineStyle
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
              {/* Advanced 開閉ボタン */}
              <button
                title="Advanced (Source/Target marker, line style)"
                onClick={() => setShowAdvanced((v) => !v)}
                className={`ml-1 h-6 px-2 text-[10px] rounded-lg border transition-colors ${
                  showAdvanced
                    ? 'border-soft-primary text-soft-primary bg-soft-primary-light'
                    : 'border-soft-border text-soft-muted hover:text-soft-text hover:bg-soft-hover'
                }`}
              >
                {showAdvanced ? '⚙ ▾' : '⚙'}
              </button>
            </div>

            {/* 第3段: Advanced（始点/終点マーカー・線スタイル独立指定） */}
            {showAdvanced && (
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-soft-border px-2 py-1 mt-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] text-soft-light">src</span>
                <select
                  value={edgeData?.sourceMarker ?? ''}
                  onChange={(e) => update({ sourceMarker: e.target.value ? (e.target.value as EdgeMarker) : undefined })}
                  className="h-6 text-[10px] bg-transparent border border-soft-border rounded-lg px-1 focus:outline-none focus:border-soft-primary cursor-pointer"
                  title="Source marker (overrides edge type preset)"
                >
                  <option value="">auto ({inferSourceMarker(edgeType)})</option>
                  {MARKER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-[9px] text-soft-light">line</span>
                <select
                  value={edgeData?.lineStyle ?? ''}
                  onChange={(e) => update({ lineStyle: e.target.value ? (e.target.value as LineStyle) : undefined })}
                  className="h-6 text-[10px] bg-transparent border border-soft-border rounded-lg px-1 focus:outline-none focus:border-soft-primary cursor-pointer"
                  title="Line style (overrides edge type preset)"
                >
                  <option value="">auto ({isDashed ? 'dashed' : 'solid'})</option>
                  {LINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-[9px] text-soft-light">tgt</span>
                <select
                  value={edgeData?.targetMarker ?? ''}
                  onChange={(e) => update({ targetMarker: e.target.value ? (e.target.value as EdgeMarker) : undefined })}
                  className="h-6 text-[10px] bg-transparent border border-soft-border rounded-lg px-1 focus:outline-none focus:border-soft-primary cursor-pointer"
                  title="Target marker (overrides edge type preset)"
                >
                  <option value="">auto ({inferTargetMarker(edgeType)})</option>
                  {MARKER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  title="Reset to preset (use edge type)"
                  onClick={() => update({ sourceMarker: undefined, targetMarker: undefined, lineStyle: undefined })}
                  className="ml-1 h-6 px-2 text-[9px] border border-soft-border rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
