import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DiagramerLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="56" height="56" rx="8" fill="#2563EB" />
      {/* ヘッダー区画 */}
      <rect x="4" y="4" width="56" height="20" rx="8" fill="#1D4ED8" />
      <rect x="4" y="16" width="56" height="8" fill="#1D4ED8" />
      {/* 区切り線 */}
      <line x1="4" y1="30" x2="60" y2="30" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="4" y1="44" x2="60" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      {/* クラス名 */}
      <rect x="18" y="11" width="28" height="4" rx="2" fill="white" fillOpacity="0.95" />
      {/* 属性 */}
      <rect x="10" y="34" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="39" width="26" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
      {/* メソッド */}
      <rect x="10" y="48" width="32" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="53" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
    </svg>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/diagrams', { method: 'POST' })
      if (!res.ok) throw new Error('ダイアグラムの作成に失敗しました')
      const { id } = await res.json()
      navigate(`/diagram/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center px-8">
        {/* ロゴ */}
        <div className="flex justify-center mb-6">
          <DiagramerLogo />
        </div>

        {/* タイトル */}
        <h1 className="text-5xl font-bold text-gray-900 mb-3">
          Diagramer
        </h1>

        {/* サブタイトル */}
        <p className="text-xl text-gray-600 mb-10">
          UMLクラス図をリアルタイムで共同編集
        </p>

        {/* エラー表示 */}
        {error && (
          <p className="text-red-500 mb-4 text-sm">{error}</p>
        )}

        {/* CTAボタン */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
            text-white font-semibold
            px-8 py-4 rounded-xl
            text-lg
            transition-colors duration-200
            shadow-lg hover:shadow-xl
            disabled:cursor-not-allowed
          "
        >
          {loading ? '作成中...' : 'クラス図を作成'}
        </button>

        {/* 説明 */}
        <p className="mt-8 text-sm text-gray-500">
          ログイン不要。URLを共有するだけで複数人で編集できます。
        </p>
        <p className="mt-1 text-xs text-gray-400">
          ※ 最終アクセスから90日間アクセスがない場合、データは自動削除されます。
        </p>
      </div>
    </div>
  )
}
