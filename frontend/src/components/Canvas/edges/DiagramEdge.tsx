import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { DiagramEdgeData } from '../../../types/diagram'

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

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const isDashed = edgeType === 'realization' || edgeType === 'dependency'
  const stroke = selected ? '#3B82F6' : '#374151'
  // marker ID に使える安全な文字列に変換
  const safeId = id.replace(/[^a-zA-Z0-9]/g, '_')

  const showTriangle = edgeType === 'generalization' || edgeType === 'realization'
  const showArrow = edgeType === 'dependency'
  const showDiamondOpen = edgeType === 'aggregation'
  const showDiamondFilled = edgeType === 'composition'

  const markerEndUrl = showTriangle
    ? `url(#tri-${safeId})`
    : showArrow
      ? `url(#arr-${safeId})`
      : undefined

  const markerStartUrl = showDiamondOpen
    ? `url(#dmo-${safeId})`
    : showDiamondFilled
      ? `url(#dmf-${safeId})`
      : undefined

  // 多重度ラベルの位置（エンドポイントから少し内側）
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

  return (
    <>
      <defs>
        {/* 白抜き三角形（汎化・実現） */}
        {showTriangle && (
          <marker
            id={`tri-${safeId}`}
            markerWidth="14"
            markerHeight="12"
            refX="12"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points="0,0 12,6 0,12"
              fill="white"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </marker>
        )}

        {/* 開き矢印（依存） */}
        {showArrow && (
          <marker
            id={`arr-${safeId}`}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polyline
              points="0,1 10,6 0,11"
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        )}

        {/* 白抜きひし形（集約） */}
        {showDiamondOpen && (
          <marker
            id={`dmo-${safeId}`}
            markerWidth="20"
            markerHeight="12"
            refX="0"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points="0,6 9,0 18,6 9,12"
              fill="white"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </marker>
        )}

        {/* 塗りつぶしひし形（合成） */}
        {showDiamondFilled && (
          <marker
            id={`dmf-${safeId}`}
            markerWidth="20"
            markerHeight="12"
            refX="0"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0,6 9,0 18,6 9,12" fill={stroke} />
          </marker>
        )}
      </defs>

      {/* クリック領域を広げる透明パス */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      {/* 可視エッジ */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray={isDashed ? '8 4' : undefined}
        markerEnd={markerEndUrl}
        markerStart={markerStartUrl}
      />

      {/* 多重度ラベル（始点側） */}
      {edgeData?.sourceMultiplicity && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan text-gray-600 bg-white px-0.5 font-mono"
            style={{
              position: 'absolute',
              fontSize: 11,
              pointerEvents: 'none',
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
            className="nodrag nopan text-gray-600 bg-white px-0.5 font-mono"
            style={{
              position: 'absolute',
              fontSize: 11,
              pointerEvents: 'none',
              transform: `translate(-50%, -50%) translate(${tgtLX}px, ${tgtLY}px)`,
            }}
          >
            {edgeData.targetMultiplicity}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
