import { useState, useEffect } from 'react'
import * as Y from 'yjs'
import type { SyncStatus } from './useYjsProvider'

export type SaveStatus = 'saved' | 'saving' | 'offline'

export function useAutoSave(ydoc: Y.Doc | null, syncStatus: SyncStatus): SaveStatus {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  useEffect(() => {
    if (syncStatus === 'disconnected') {
      setSaveStatus('offline')
    } else if (syncStatus === 'connected') {
      setSaveStatus((s) => (s === 'offline' ? 'saved' : s))
    }
  }, [syncStatus])

  useEffect(() => {
    if (!ydoc) return
    let timer: ReturnType<typeof setTimeout>

    const handler = (_update: Uint8Array, origin: unknown) => {
      if (origin !== 'local') return
      setSaveStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(() => {
        setSaveStatus('saved')
      }, 1500)
    }

    ydoc.on('update', handler)
    return () => {
      ydoc.off('update', handler)
      clearTimeout(timer)
    }
  }, [ydoc])

  return saveStatus
}
