import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DiagramerLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#4a9ce8" />
      <rect x="4" y="4" width="56" height="20" rx="12" fill="#3d8ad6" />
      <rect x="4" y="16" width="56" height="8" fill="#3d8ad6" />
      <line x1="4" y1="30" x2="60" y2="30" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="4" y1="44" x2="60" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      <rect x="18" y="11" width="28" height="4" rx="2" fill="white" fillOpacity="0.95" />
      <rect x="10" y="34" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="10" y="39" width="26" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
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
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/diagrams`, { method: 'POST' })
      if (!res.ok) throw new Error('ダイアグラムの作成に失敗しました')
      const { id } = await res.json()
      navigate(`/diagram/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-soft-bg flex flex-col">
      {/* ナビゲーションバー */}
      <nav className="h-12 bg-soft-bg border-b border-soft-border flex items-center px-6">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="56" height="56" rx="12" fill="#4a9ce8" />
            <rect x="4" y="4" width="56" height="20" rx="12" fill="#3d8ad6" />
            <rect x="4" y="16" width="56" height="8" fill="#3d8ad6" />
            <line x1="4" y1="30" x2="60" y2="30" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
            <line x1="4" y1="44" x2="60" y2="44" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
            <rect x="18" y="11" width="28" height="4" rx="2" fill="white" fillOpacity="0.95" />
          </svg>
          <span className="text-soft-text font-bold text-sm">Diagramer</span>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-16">
        <div className="mb-8">
          <DiagramerLogo />
        </div>

        <h1 className="text-4xl font-bold text-soft-text mb-3 tracking-tight text-center leading-tight">
          UMLクラス図を<br />
          <span className="text-soft-primary">リアルタイムで共同編集</span>
        </h1>
        <p className="text-soft-muted text-base mb-10 text-center max-w-sm leading-relaxed">
          ログイン不要でURLを共有するだけで<br />チームで同時に作図できます
        </p>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="h-11 px-8 bg-soft-primary hover:bg-soft-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full transition-colors duration-150"
        >
          {loading ? '作成中...' : '新規作成'}
        </button>

        <p className="mt-6 text-[11px] text-soft-light text-center leading-relaxed">
          作成から90日間アクセスがないデータは自動削除されます
        </p>
      </main>
    </div>
  )
}
