import type { AwarenessState } from '../../hooks/useCollaboration'

interface RemoteCursorsProps {
  remoteUsers: Map<number, AwarenessState>
  followingClientId?: number | null
  onFollow?: (clientId: number | null) => void
}

export default function RemoteCursors({ remoteUsers, followingClientId, onFollow }: RemoteCursorsProps) {
  if (remoteUsers.size === 0) return null

  return (
    <div className="flex items-center gap-1">
      {Array.from(remoteUsers.entries()).map(([clientId, user]) => {
        const isFollowing = followingClientId === clientId
        return (
          <button
            key={user.userId}
            onClick={() => onFollow?.(isFollowing ? null : clientId)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium transition-opacity ${onFollow ? 'hover:opacity-80 cursor-pointer' : ''} ${isFollowing ? 'ring-2 ring-offset-1 ring-soft-primary' : ''}`}
            style={{ backgroundColor: user.color }}
            title={onFollow ? (isFollowing ? `Stop following ${user.name}` : `Follow ${user.name}`) : user.name}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
            <span className="max-w-[80px] truncate">{user.name}</span>
          </button>
        )
      })}
    </div>
  )
}
