/**
 * useComments — canvas-anchored comments stored in Yjs.
 * Uses a separate Y.Map (`comments`) so it doesn't affect existing nodes/edges sync.
 */
import { useEffect, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { nanoid } from 'nanoid'

export interface Reply {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: number
}

export interface Comment {
  id: string
  authorId: string
  authorName: string
  authorColor: string
  position: { x: number; y: number }
  text: string
  createdAt: number
  resolved: boolean
  replies: Reply[]
}

export function useComments(ydoc: Y.Doc) {
  const yComments = ydoc.getMap<Comment>('comments')
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    const update = () => {
      setComments(Array.from(yComments.values()).sort((a, b) => a.createdAt - b.createdAt))
    }
    yComments.observe(update)
    update()
    return () => yComments.unobserve(update)
  }, [yComments])

  const addComment = useCallback(
    (position: { x: number; y: number }, text: string, author: { id: string; name: string; color: string }) => {
      const id = nanoid()
      const comment: Comment = {
        id,
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        position,
        text,
        createdAt: Date.now(),
        resolved: false,
        replies: [],
      }
      yComments.set(id, comment)
      return id
    },
    [yComments],
  )

  const addReply = useCallback(
    (commentId: string, text: string, author: { id: string; name: string }) => {
      const comment = yComments.get(commentId)
      if (!comment) return
      const reply: Reply = {
        id: nanoid(),
        authorId: author.id,
        authorName: author.name,
        text,
        createdAt: Date.now(),
      }
      yComments.set(commentId, { ...comment, replies: [...comment.replies, reply] })
    },
    [yComments],
  )

  const toggleResolved = useCallback(
    (commentId: string) => {
      const comment = yComments.get(commentId)
      if (!comment) return
      yComments.set(commentId, { ...comment, resolved: !comment.resolved })
    },
    [yComments],
  )

  const deleteComment = useCallback(
    (commentId: string) => {
      yComments.delete(commentId)
    },
    [yComments],
  )

  return { comments, addComment, addReply, toggleResolved, deleteComment }
}
