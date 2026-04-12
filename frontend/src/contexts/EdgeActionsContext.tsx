import { createContext, useContext } from 'react'

interface EdgeActions {
  onUpdateEdge: (id: string, data: Record<string, unknown>) => void
  onDeleteEdge: (id: string) => void
}

export const EdgeActionsContext = createContext<EdgeActions>({
  onUpdateEdge: () => {},
  onDeleteEdge: () => {},
})

export const useEdgeActions = () => useContext(EdgeActionsContext)
