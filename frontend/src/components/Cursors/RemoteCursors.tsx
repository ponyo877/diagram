import type { AwarenessState } from '../../hooks/useCollaboration'

interface RemoteCursorsProps {
  remoteUsers: Map<number, AwarenessState>
}

export default function RemoteCursors({ remoteUsers }: RemoteCursorsProps) {
  if (remoteUsers.size === 0) return null

  return (
    <div className="flex items-center gap-1">
      {Array.from(remoteUsers.values()).map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
          <span className="max-w-[80px] truncate">{user.name}</span>
        </div>
      ))}
    </div>
  )
}
