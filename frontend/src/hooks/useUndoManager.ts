import { useState, useEffect, useCallback } from 'react'
import * as Y from 'yjs'

export function useUndoManager(ydoc: Y.Doc | null) {
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null)

  useEffect(() => {
    if (!ydoc) return
    const yNodes = ydoc.getMap('nodes')
    const yEdges = ydoc.getMap('edges')
    const mgr = new Y.UndoManager([yNodes, yEdges], {
      trackedOrigins: new Set(['local']),
    })
    setUndoManager(mgr)
    return () => mgr.destroy()
  }, [ydoc])

  const undo = useCallback(() => undoManager?.undo(), [undoManager])
  const redo = useCallback(() => undoManager?.redo(), [undoManager])

  return { undo, redo }
}
