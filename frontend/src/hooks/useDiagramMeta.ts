/**
 * useDiagramMeta — manages diagram-level metadata (title, etc.) via Yjs
 * Independent from yNodes/yEdges to avoid affecting existing sync.
 */
import { useEffect, useState, useCallback } from 'react'
import * as Y from 'yjs'

export function useDiagramMeta(ydoc: Y.Doc) {
  const yMeta = ydoc.getMap<string>('meta')
  const [name, setName] = useState<string>(() => yMeta.get('name') ?? '')

  useEffect(() => {
    const observer = () => setName(yMeta.get('name') ?? '')
    yMeta.observe(observer)
    observer()
    return () => yMeta.unobserve(observer)
  }, [yMeta])

  const updateName = useCallback((newName: string) => {
    yMeta.set('name', newName)
  }, [yMeta])

  return { name, updateName }
}
