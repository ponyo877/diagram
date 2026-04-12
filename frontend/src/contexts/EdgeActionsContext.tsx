import { createContext, useContext } from 'react'

interface EdgeActions {
  onUpdateEdge: (id: string, data: Record<string, unknown>) => void
  onDeleteEdge: (id: string) => void
  /** エッジがクリックされたフロー座標（ツールバー配置用） */
  toolbarPosition: { x: number; y: number } | null
  /** 選択中エッジの始点・終点ノード名 */
  sourceNodeName: string | null
  targetNodeName: string | null
}

export const EdgeActionsContext = createContext<EdgeActions>({
  onUpdateEdge: () => {},
  onDeleteEdge: () => {},
  toolbarPosition: null,
  sourceNodeName: null,
  targetNodeName: null,
})

export const useEdgeActions = () => useContext(EdgeActionsContext)
