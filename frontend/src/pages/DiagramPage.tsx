import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

type DiagramStatus = 'loading' | 'found' | 'not_found' | 'error'

export default function DiagramPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<DiagramStatus>('loading')

  useEffect(() => {
    if (!id) {
      navigate('/')
      return
    }

    const checkDiagram = async () => {
      try {
        const res = await fetch(`/api/diagrams/${id}`)
        if (res.status === 404) {
          setStatus('not_found')
        } else if (res.ok) {
          setStatus('found')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    checkDiagram()
  }, [id, navigate])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-700 text-xl font-semibold">ダイアグラムが見つかりません</p>
        <p className="text-gray-500 text-sm">URLが正しいか確認してください。削除済みの場合もあります。</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors"
        >
          トップに戻る
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-500 text-xl font-semibold">エラーが発生しました</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors"
        >
          トップに戻る
        </button>
      </div>
    )
  }

  // Phase 1: プレースホルダー（Phase 2 でキャンバスに置き換え）
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* ツールバー */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shadow-sm">
        <span className="font-bold text-blue-600 text-lg">Diagramer</span>
        <span className="text-xs text-gray-400 font-mono">{id}</span>
      </div>

      {/* キャンバスエリア（プレースホルダー） */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="mx-auto mb-4 opacity-30" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="4" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
            <rect x="16" y="16" width="32" height="10" rx="2" fill="#CBD5E1" />
            <rect x="16" y="30" width="32" height="6" rx="2" fill="#E2E8F0" />
            <rect x="16" y="40" width="32" height="6" rx="2" fill="#E2E8F0" />
          </svg>
          <p className="text-lg">キャンバス準備中</p>
          <p className="text-sm mt-1">Phase 2 で実装予定</p>
        </div>
      </div>

      {/* パレット（プレースホルダー） */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-center gap-3 px-4 shadow-sm">
        {['クラス', 'インターフェース', '列挙型', 'ノート', 'パッケージ'].map((label) => (
          <button
            key={label}
            disabled
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
