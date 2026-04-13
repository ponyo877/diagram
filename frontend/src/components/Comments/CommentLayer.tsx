/**
 * CommentLayer — renders comment pins on top of the canvas, plus the active popover.
 * Positions in flow coordinates, transformed via current viewport.
 */
import { useState } from 'react'
import { useViewport } from '@xyflow/react'
import type { Comment } from '../../hooks/useComments'

interface CommentLayerProps {
  comments: Comment[]
  onAddReply: (commentId: string, text: string) => void
  onToggleResolved: (commentId: string) => void
  onDelete: (commentId: string) => void
  showResolved: boolean
}

export default function CommentLayer({ comments, onAddReply, onToggleResolved, onDelete, showResolved }: CommentLayerProps) {
  const { x: vx, y: vy, zoom } = useViewport()
  const [openId, setOpenId] = useState<string | null>(null)

  const visible = showResolved ? comments : comments.filter((c) => !c.resolved)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1100 }}>
      {visible.map((c) => {
        const screenX = c.position.x * zoom + vx
        const screenY = c.position.y * zoom + vy
        const isOpen = openId === c.id
        return (
          <div key={c.id} className="absolute" style={{ left: screenX, top: screenY }}>
            <button
              onClick={() => setOpenId(isOpen ? null : c.id)}
              className={`pointer-events-auto w-6 h-6 -translate-x-3 -translate-y-3 rounded-full shadow-md border-2 border-white text-[10px] font-bold text-white hover:scale-110 transition-transform ${c.resolved ? 'opacity-50' : ''}`}
              style={{ backgroundColor: c.authorColor }}
              title={c.authorName}
            >
              {c.replies.length + 1}
            </button>
            {isOpen && (
              <CommentPopover
                comment={c}
                onAddReply={(text) => onAddReply(c.id, text)}
                onToggleResolved={() => onToggleResolved(c.id)}
                onDelete={() => { onDelete(c.id); setOpenId(null) }}
                onClose={() => setOpenId(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CommentPopover({
  comment,
  onAddReply,
  onToggleResolved,
  onDelete,
  onClose,
}: {
  comment: Comment
  onAddReply: (text: string) => void
  onToggleResolved: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [reply, setReply] = useState('')
  const submitReply = () => {
    if (reply.trim()) {
      onAddReply(reply.trim())
      setReply('')
    }
  }
  return (
    <div
      className="pointer-events-auto absolute left-6 top-0 w-64 bg-white rounded-xl shadow-lg border border-soft-border"
      style={{ zIndex: 1200 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 h-8 border-b border-soft-border">
        <span className="text-[10px] font-bold text-soft-muted uppercase tracking-widest">
          {comment.resolved ? 'Resolved' : 'Comments'}
        </span>
        <button onClick={onClose} className="text-soft-muted hover:text-soft-text text-sm leading-none">×</button>
      </div>

      <div className="max-h-60 overflow-y-auto panel-scroll">
        <CommentItem text={comment.text} author={comment.authorName} color={comment.authorColor} createdAt={comment.createdAt} />
        {comment.replies.map((r) => (
          <CommentItem key={r.id} text={r.text} author={r.authorName} color="#7a7168" createdAt={r.createdAt} />
        ))}
      </div>

      <div className="border-t border-soft-border p-2 flex flex-col gap-1.5">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) submitReply() }}
          placeholder="Reply... (⌘+Enter)"
          className="w-full h-12 px-2 py-1 text-xs bg-soft-input border border-soft-border rounded-lg focus:outline-none focus:border-soft-primary resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={onToggleResolved}
              className="text-[10px] text-soft-muted hover:text-soft-text px-2 py-0.5 hover:bg-soft-hover rounded"
            >
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              onClick={onDelete}
              className="text-[10px] text-soft-red hover:text-red-700 px-2 py-0.5 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
          <button
            onClick={submitReply}
            disabled={!reply.trim()}
            className="text-[10px] bg-soft-primary hover:bg-soft-primary-hover disabled:opacity-40 text-white px-3 py-1 rounded-full"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentItem({ text, author, color, createdAt }: { text: string; author: string; color: string; createdAt: number }) {
  return (
    <div className="p-3 border-b border-soft-border last:border-b-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: color }}>
          {author.charAt(0).toUpperCase()}
        </span>
        <span className="text-[10px] text-soft-text font-bold">{author}</span>
        <span className="text-[9px] text-soft-light">{formatTime(createdAt)}</span>
      </div>
      <div className="text-xs text-soft-text whitespace-pre-wrap">{text}</div>
    </div>
  )
}

function formatTime(ts: number) {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}
