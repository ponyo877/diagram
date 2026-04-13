import { useEffect, useState } from 'react'

interface VersionInfo {
  id: string
  created_at: string
  author_name: string | null
  label: string | null
  is_auto: number
}

interface VersionPanelProps {
  diagramId: string
  onClose: () => void
  onRestore: () => void
  onToast?: (msg: string, type?: 'success' | 'error') => void
}

const API_BASE = (import.meta.env.VITE_API_URL ?? '') as string

export default function VersionPanel({ diagramId, onClose, onRestore, onToast }: VersionPanelProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [labelInput, setLabelInput] = useState('')

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/diagrams/${diagramId}/versions`)
      const data = await res.json() as { versions: VersionInfo[] }
      setVersions(data.versions ?? [])
    } catch (e) {
      onToast?.('Failed to load versions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVersions() }, [diagramId]) // eslint-disable-line

  const handleSnapshot = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/diagrams/${diagramId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelInput || undefined }),
      })
      if (!res.ok) throw new Error('Failed')
      setLabelInput('')
      onToast?.('Snapshot saved')
      await fetchVersions()
    } catch (e) {
      onToast?.('Failed to save snapshot', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!confirm('Restore this version? Current state will be replaced.')) return
    try {
      const res = await fetch(`${API_BASE}/api/diagrams/${diagramId}/restore/${versionId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      onToast?.('Version restored')
      onRestore()
    } catch (e) {
      onToast?.('Failed to restore version', 'error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        style={{ boxShadow: '0 12px 40px rgba(139,120,100,0.15)' }}>
        <div className="flex items-center justify-between px-4 h-12 border-b border-soft-border shrink-0">
          <span className="text-sm font-bold text-soft-text">Version History</span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-soft-hover text-soft-muted hover:text-soft-text text-base leading-none">×</button>
        </div>

        {/* Save snapshot form */}
        <div className="p-3 border-b border-soft-border flex gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Version label (optional)"
            className="flex-1 h-8 px-2 text-xs bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary"
          />
          <button
            onClick={handleSnapshot}
            disabled={saving}
            className="h-8 px-4 text-xs bg-soft-primary hover:bg-soft-primary-hover disabled:opacity-50 text-white rounded-full"
          >
            {saving ? 'Saving...' : 'Save Version'}
          </button>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto panel-scroll">
          {loading && <div className="p-6 text-center text-xs text-soft-muted">Loading...</div>}
          {!loading && versions.length === 0 && (
            <div className="p-6 text-center text-xs text-soft-muted">No versions yet. Save a snapshot to start.</div>
          )}
          {versions.map((v) => (
            <div key={v.id} className="p-3 border-b border-soft-border last:border-b-0 flex items-center justify-between hover:bg-soft-hover">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-soft-text font-bold truncate">
                  {v.label || (v.is_auto ? 'Auto snapshot' : 'Manual snapshot')}
                </div>
                <div className="text-[10px] text-soft-light">
                  {new Date(v.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                  {v.author_name && <span> · {v.author_name}</span>}
                </div>
              </div>
              <button
                onClick={() => handleRestore(v.id)}
                className="text-[11px] text-soft-primary hover:text-soft-primary-hover px-3 py-1 rounded-full hover:bg-soft-primary-light"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
