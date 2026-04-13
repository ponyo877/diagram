import { useReactFlow, useViewport } from '@xyflow/react'

export default function ZoomControls() {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow()
  const { zoom } = useViewport()
  const pct = Math.round(zoom * 100)

  return (
    <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-soft-border px-1 py-1">
      <button
        onClick={() => zoomOut({ duration: 150 })}
        title="Zoom Out"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <button
        onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}
        title="Reset to 100%"
        className="min-w-[44px] h-8 flex items-center justify-center rounded-lg text-[11px] font-mono text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors px-1"
      >
        {pct}%
      </button>

      <button
        onClick={() => zoomIn({ duration: 150 })}
        title="Zoom In"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div className="w-px h-5 bg-soft-border mx-0.5" />

      <button
        onClick={() => fitView({ padding: 0.2, duration: 250 })}
        title="Zoom to Fit"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-soft-muted hover:text-soft-text hover:bg-soft-hover transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9V5a2 2 0 0 1 2-2h4" />
          <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
          <path d="M3 15v4a2 2 0 0 0 2 2h4" />
          <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
        </svg>
      </button>
    </div>
  )
}
