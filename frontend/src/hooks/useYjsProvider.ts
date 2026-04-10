import { useState, useEffect } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export type SyncStatus = 'connecting' | 'connected' | 'disconnected'

export function useYjsProvider(diagramId: string) {
  const [ydoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting')

  useEffect(() => {
    if (!diagramId) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    // VITE_WS_URL is set in dev (direct to backend); fallback for production (same origin via /yjs)
    const wsUrl = import.meta.env.VITE_WS_URL ?? `${wsProtocol}://${window.location.host}/yjs`

    const p = new WebsocketProvider(wsUrl, diagramId, ydoc)

    p.on('status', ({ status }: { status: string }) => {
      setSyncStatus(status as SyncStatus)
    })

    setProvider(p)

    return () => {
      p.destroy()
    }
  }, [diagramId, ydoc])

  return { ydoc, provider, syncStatus }
}
