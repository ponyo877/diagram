import { useState, useEffect, useCallback } from 'react'
import * as Y from 'yjs'

/**
 * Yjs UndoManager wrapper.
 *
 * trackedOrigins には useYjsDiagram で transact に渡している LOCAL_ORIGIN ('local')
 * を含める。captureTimeout を 0 にし、各 transact を 1 ステップとして扱う
 * （連続したペースト → 1 回の Cmd+Z で完全に元に戻る）。
 */
export function useUndoManager(ydoc: Y.Doc | null) {
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null)

  useEffect(() => {
    if (!ydoc) return
    const yNodes = ydoc.getMap('nodes')
    const yEdges = ydoc.getMap('edges')
    const mgr = new Y.UndoManager([yNodes, yEdges], {
      trackedOrigins: new Set(['local']),
      captureTimeout: 0,
    })
    setUndoManager(mgr)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __undoManager?: Y.UndoManager }).__undoManager = mgr
    }
    return () => mgr.destroy()
  }, [ydoc])

  const undo = useCallback(() => undoManager?.undo(), [undoManager])
  const redo = useCallback(() => undoManager?.redo(), [undoManager])

  return { undo, redo }
}
