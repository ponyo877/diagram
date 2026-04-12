import { useState, useEffect, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import type { WebsocketProvider } from 'y-websocket'
import { COLOR_PALETTE } from '../utils/colorPalette'

export interface AwarenessState {
  userId: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
}

export function useCollaboration(provider: WebsocketProvider | null) {
  const [userName, setUserName] = useState(
    () => localStorage.getItem('diagramer-username') ?? `User${Math.floor(Math.random() * 1000)}`,
  )
  const [remoteUsers, setRemoteUsers] = useState<Map<number, AwarenessState>>(new Map())
  const lastCursorUpdate = useRef(0)

  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness
    const userId = nanoid()
    const colorIndex = awareness.getStates().size % COLOR_PALETTE.length

    awareness.setLocalState({
      userId,
      name: userName,
      color: COLOR_PALETTE[colorIndex],
      cursor: null,
    } satisfies AwarenessState)

    const onChange = () => {
      const states = new Map<number, AwarenessState>()
      awareness.getStates().forEach((state, clientId) => {
        if (clientId !== awareness.clientID && state) {
          states.set(clientId, state as AwarenessState)
        }
      })
      setRemoteUsers(states)
    }

    awareness.on('change', onChange)
    onChange()

    return () => {
      awareness.off('change', onChange)
      awareness.setLocalState(null)
    }
  }, [provider]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateUserName = useCallback(
    (name: string) => {
      setUserName(name)
      localStorage.setItem('diagramer-username', name)
      if (provider) {
        provider.awareness.setLocalStateField('name', name)
      }
    },
    [provider],
  )

  // カーソル位置を awareness に送信（50ms スロットル）
  const updateCursorPosition = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!provider) return
      const now = Date.now()
      if (now - lastCursorUpdate.current < 50) return
      lastCursorUpdate.current = now
      provider.awareness.setLocalStateField('cursor', cursor)
    },
    [provider],
  )

  // キャンバス離脱時にカーソルを消す
  const clearCursorPosition = useCallback(() => {
    if (!provider) return
    provider.awareness.setLocalStateField('cursor', null)
  }, [provider])

  return { userName, updateUserName, remoteUsers, updateCursorPosition, clearCursorPosition }
}
