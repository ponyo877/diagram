/**
 * CanvasCursors — キャンバス上にリモートユーザーのカーソル矢印＋ユーザー名ラベルを描画
 *
 * Flow座標で保存されたカーソル位置を、現在のビューポート変換で画面座標に変換して表示する。
 * パン/ズームに追従し、スムーズにアニメーションする。
 */
import { useViewport } from '@xyflow/react'
import type { AwarenessState } from '../../hooks/useCollaboration'

interface CanvasCursorsProps {
  remoteUsers: Map<number, AwarenessState>
}

export default function CanvasCursors({ remoteUsers }: CanvasCursorsProps) {
  const { x: vx, y: vy, zoom } = useViewport()

  const cursors = Array.from(remoteUsers.entries()).filter(
    ([, user]) => user.cursor != null,
  )

  if (cursors.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1000 }}>
      {cursors.map(([clientId, user]) => {
        const screenX = user.cursor!.x * zoom + vx
        const screenY = user.cursor!.y * zoom + vy

        return (
          <div
            key={clientId}
            className="absolute"
            style={{
              left: screenX,
              top: screenY,
              transition: 'left 80ms linear, top 80ms linear',
            }}
          >
            {/* カーソル矢印 SVG */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M1 1L1 15L5 11L9 19L11 18L7 10L13 10L1 1Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* ユーザー名ラベル */}
            <div
              className="absolute left-4 top-4 text-[10px] text-white font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
